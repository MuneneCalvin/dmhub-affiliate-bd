<?php

namespace App\Services;

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\Creative;
use App\Models\PostbackCredential;
use App\Models\PublisherCampaigns;
use App\Services\Finance\LedgerService;
use App\Services\Fraud\FraudAssessmentService;
use App\Support\ConversionEligibility;
use App\Support\ConversionMoney;
use App\Support\PublisherAttribution;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConversionEventService
{
    public function __construct(private CommissionService $commissions) {}

    public function resolveClick(array $data, ?int $advertiserId = null): Clicks
    {
        $query = Clicks::query();
        if ($advertiserId !== null) {
            $query->whereHas('campaign', fn ($q) => $q->where('advertiser_id', $advertiserId));
        }
        if (! empty($data['referral_id'])) {
            $click = $query->where('referral_id', $data['referral_id'])->firstOrFail();
            if (! empty($data['click_id']) && (string) $click->id !== (string) $data['click_id']) {
                $this->invalid('click_id', 'Click contradicts referral identity.');
            }
        } else {
            if (empty($data['click_id'])) {
                $this->invalid('click_id', 'A persisted referral_id or click_id is required.');
            }
            $click = $query->findOrFail($data['click_id']);
        }
        $assignment = $click->publisherCampaign;
        abort_unless($assignment, 422, 'Publisher-scoped attribution is required.');
        foreach (['script_token' => 'script_token', 'publisher_campaign_id' => 'id'] as $key => $field) {
            if (! empty($data[$key]) && (string) $data[$key] !== (string) $assignment->$field) {
                $this->invalid($key, 'Identifier contradicts referral attribution.');
            }
        }
        if (isset($data['offer_id']) && (int) $data['offer_id'] !== (int) $click->offer_id) {
            $this->invalid('offer_id', 'Offer contradicts referral attribution.');
        }
        if (! empty($data['tracking_code'])) {
            $creative = Creative::where('tracking_code', $data['tracking_code'])->firstOrFail();
            PublisherAttribution::assertCreative($creative, $assignment);
            if ($click->creative_id && (int) $click->creative_id !== $creative->id) {
                $this->invalid('tracking_code', 'Creative contradicts referral attribution.');
            }
        }

        return $click;
    }

    /** Serialize every transport on the same advertiser, then campaign, then assignment. */
    private function lockContext(Clicks $click): PublisherCampaigns
    {
        app(LedgerService::class)->lock($click->network_id);
        $advertiser = Advertiser::whereKey($click->campaign->advertiser_id)->lockForUpdate()->firstOrFail();
        $campaign = Campaign::whereKey($click->campaign_id)->lockForUpdate()->firstOrFail();
        abort_unless((int) $campaign->advertiser_id === $advertiser->id, 409, 'Campaign ownership changed; retry with current attribution.');
        $assignment = PublisherCampaigns::whereKey($click->publisher_campaign_id)->lockForUpdate()->firstOrFail();
        $campaign->setRelation('advertiser', $advertiser);
        $assignment->setRelation('campaign', $campaign);
        $click->setRelation('publisherCampaign', $assignment);

        return $assignment;
    }

    /** Confirm immutable merchant events; retries return the original result. */
    public function confirm(array $data, Request $request): array
    {
        $advertiserId = (int) $request->attributes->get('postback_advertiser_id');
        $credentialId = (int) $request->attributes->get('postback_credential_id');
        abort_unless($advertiserId && $credentialId, 401);
        SubmissionSpamCheck::validate($data);
        $click = $this->resolveClick($data, $advertiserId);
        $occurredAt = CarbonImmutable::parse($data['occurred_at'])->utc();
        $amount = ConversionMoney::decimal(ConversionMoney::cents($data['amount']));
        if ($data['event_type'] === 'purchase' && ConversionMoney::cents($amount) <= 0) {
            $this->invalid('amount', 'A confirmed purchase requires a positive monetary basis.');
        }
        $currency = $data['currency'];
        $canonical = [
            'click_id' => $click->id, 'event_type' => $data['event_type'], 'external_id' => $data['external_id'],
            'occurred_at' => $occurredAt->format('Y-m-d\TH:i:s.u\Z'), 'amount' => $amount, 'currency' => $currency,
        ];
        if ($data['event_type'] === 'submission') {
            $canonical['spam_checks'] = [
                'honeypot_filled' => (bool) $data['spam_checks']['honeypot_filled'],
                'form_duration_ms' => (int) $data['spam_checks']['form_duration_ms'],
                'is_spam' => (bool) $data['spam_checks']['is_spam'],
            ];
        }
        $hash = hash('sha256', json_encode($canonical, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($data, $request, $click, $occurredAt, $amount, $currency, $hash, $advertiserId, $credentialId, $canonical) {
            $assignment = $this->lockContext($click);
            // Recheck authentication after waiting for the advertiser lock.
            $credential = PostbackCredential::whereKey($credentialId)->where('advertiser_id', $advertiserId)
                ->whereNull('revoked_at')->where('expires_at', '>', now())->first();
            abort_unless($credential, 401);
            $advertiser = $assignment->campaign->advertiser;
            abort_unless($advertiser->status === 'A' && $advertiser->user?->status === 'A'
                && $advertiser->user?->closed_at === null && $advertiser->user?->hasVerifiedEmail()
                && $advertiser->network?->status === 'A', 403);
            $existing = ConversionEvent::where('advertiser_id', $advertiserId)->where('external_id', $data['external_id'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->payload_hash, $hash), 409, 'Event identity was already used with different data.');

                return ['event' => $existing, 'duplicate' => true];
            }
            ConversionEligibility::assertClick($click, $occurredAt);
            if ($currency !== $assignment->campaign->currency || $currency !== $advertiser->currency) {
                $this->invalid('currency', 'Event, campaign and advertiser currencies must agree.');
            }
            $snapshot = $click->commission_snapshot;
            abort_unless($snapshot && $snapshot['currency'] === $currency && $snapshot['network_id'] === $click->network_id
                && $advertiser->network_id === $click->network_id, 422, 'Referral has no valid financial contract; create a new referral.');
            $quote = $this->commissions->quote($assignment, $data['event_type'], $amount, $snapshot);
            ConversionEligibility::assertBudget($assignment, ConversionMoney::cents($quote['amount']));
            $event = ConversionEvent::create([
                'advertiser_id' => $advertiserId, 'credential_id' => $credentialId,
                'click_id' => $click->id, 'event_type' => $data['event_type'],
                'external_id' => $data['external_id'], 'payload_hash' => $hash, 'occurred_at' => $occurredAt,
                'amount' => $amount, 'currency' => $currency,
                'fraud_signals' => ['source' => 'authenticated_merchant', 'spam_checks' => $canonical['spam_checks'] ?? null],
                'attribution' => [
                    'policy' => 'last_eligible_referral_v1', 'reason' => 'merchant_confirmed_referral',
                    'referral_id' => $click->referral_id, 'publisher_id' => $click->publisher_id,
                    'publisher_campaign_id' => $assignment->id, 'campaign_id' => $click->campaign_id,
                    'offer_id' => $click->offer_id, 'network_id' => $click->network_id,
                    'clicked_at' => $click->clicked_at->toISOString(),
                    'conversion_expires_at' => ConversionEligibility::expiresAt($click)->toISOString(),
                    'sub_id' => $click->sub_id, 'traffic_source' => $click->traffic_source,
                    'commission_snapshot' => $snapshot,
                    'commission_type' => $quote['type'], 'commission_rate' => $quote['rate'],
                    'commission_amount' => $quote['amount'],
                ],
            ]);
            $conversion = Conversion::create([
                'conversion_event_id' => $event->id, 'click_id' => $click->id, 'publisher_id' => $click->publisher_id,
                'network_id' => $click->network_id, 'campaign_id' => $click->campaign_id, 'offer_id' => $click->offer_id,
                'publisher_campaign_id' => $assignment->id, 'conversion_type' => $event->event_type,
                'order_code' => substr($event->external_id, 0, 50), 'transaction_code' => 'event:'.$event->id,
                'sale_amount' => $amount, 'currency' => $currency, 'commission_type' => $quote['type'],
                'commission_rate' => $quote['rate'], 'commission_amount' => $quote['amount'],
                'status' => 'P', 'reviewed_by' => 'merchant:'.$advertiserId, 'reviewed_at' => now(),
                'review_notes' => 'Merchant confirmed; financial review pending.',
                'ip_address' => $request->ip(), 'user_agent' => substr($request->userAgent() ?? '', 0, 100),
                'metadata' => $event->attribution, 'conversion_date' => $occurredAt->toDateString(),
                // Financial approval is separate from merchant confirmation.
                'approved_at' => null, 'rejected_at' => null,
            ]);
            $earning = $this->commissions->accrue($event, $conversion, $assignment);
            $click->update(['is_converted' => true, 'converted_at' => $click->converted_at ?? now()]);
            $assignment->increment('total_conversions');
            $assignment->increment('total_revenue', $amount);
            $assignment->offer->increment('total_conversions');
            app(FraudAssessmentService::class)->request($earning);

            return ['event' => $event, 'duplicate' => false];
        }, 3);
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
