<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Offer;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Support\ConversionMoney;
use App\Support\TrackingUrl;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PartnerEnrollmentService
{
    public function contract(Campaign $campaign, Offer $offer): array
    {
        $terms = $campaign->terms;

        return [
            'campaign_terms' => $terms,
            'offer_id' => $offer->id,
            'offer_terms' => $offer->terms,
            'currency' => $campaign->currency,
            'commissions' => $offer->commissions()->with('commissionType')->orderBy('id')->get()
                ->map(fn ($rule) => ['type' => $rule->commissionType?->name, 'value' => (string) $rule->commission_value])->all(),
        ];
    }

    public function version(array $contract): string
    {
        return hash('sha256', json_encode($contract, JSON_THROW_ON_ERROR));
    }

    private function eligible(Campaign $campaign, Publisher $publisher, Offer $offer): void
    {
        if ($publisher->network_id !== $campaign->network_id || $offer->campaign_id !== $campaign->id
            || $offer->network_id !== $campaign->network_id || $publisher->user?->status !== 'A'
            || ! $publisher->user?->hasVerifiedEmail() || $publisher->user?->closed_at !== null
            || ! $campaign->advertiser?->user?->hasVerifiedEmail() || $campaign->advertiser?->user?->closed_at !== null
            || $publisher->network?->status !== 'A' || $campaign->advertiser?->status !== 'A'
            || $campaign->advertiser?->user?->status !== 'A'
            || $campaign->advertiser?->network_id !== $campaign->network_id
            || $campaign->campaign_status !== 'A' || $campaign->end_date->isPast()
            || $offer->offer_status !== 'A' || $offer->expires_at?->isPast()) {
            throw ValidationException::withMessages(['offer_id' => 'This campaign or offer is no longer available to this publisher.']);
        }
    }

    public function apply(Publisher $publisher, int $campaignId, array $input): PublisherCampaigns
    {
        return DB::transaction(function () use ($publisher, $campaignId, $input) {
            $campaign = Campaign::where('network_id', $publisher->network_id ?? 0)->lockForUpdate()->findOrFail($campaignId);
            $publisher = Publisher::lockForUpdate()->findOrFail($publisher->id);
            $offer = Offer::where('campaign_id', $campaign->id)->lockForUpdate()->findOrFail($input['offer_id']);
            $this->eligible($campaign, $publisher, $offer);
            $contract = $this->contract($campaign, $offer);
            if (! hash_equals($this->version($contract), $input['terms_version'])) {
                throw ValidationException::withMessages(['terms_accepted' => 'The terms changed. Reload this page and accept the current terms.']);
            }
            $application = PublisherCampaigns::where('publisher_id', $publisher->id)
                ->where('campaign_id', $campaign->id)->where('network_id', $campaign->network_id)->lockForUpdate()->first();
            // Pending applications may refresh consent, but cannot change an approved assignment.
            if ($application && ! in_array($application->status, ['R', 'P'], true)) {
                throw ValidationException::withMessages(['offer_id' => 'You already have an enrollment in this campaign.']);
            }
            $application ??= new PublisherCampaigns(['publisher_id' => $publisher->id, 'campaign_id' => $campaign->id, 'network_id' => $campaign->network_id]);
            if ($application->exists && ! DB::table('partner_enrollment_events')->where('publisher_campaign_id', $application->id)->exists()) {
                $this->record($application, $publisher->user_id, 'legacy_state');
            }
            $action = $application->exists ? 'reapplied' : 'applied';
            $application->fill([
                'status' => 'P', 'offer_id' => null, 'requested_offer_id' => $offer->id,
                'applied_notes' => $input['applied_notes'], 'applied_at' => now(),
                'approved_by' => null, 'approved_at' => null, 'rejection_reason' => null,
                'commission_type' => null, 'commission_value' => null, 'tracking_link' => null,
                'terms_version' => $this->version($contract), 'terms_snapshot' => $contract, 'terms_accepted_at' => now(),
            ])->save();
            $this->record($application, $publisher->user_id, $action);

            return $application;
        }, 3);
    }

    public function review(PublisherCampaigns $application, User $actor, ?int $offerId, ?string $reason = null): PublisherCampaigns
    {
        return DB::transaction(function () use ($application, $actor, $offerId, $reason) {
            // One campaign lock serializes approvals and capacity checks for every publisher.
            $campaign = Campaign::lockForUpdate()->findOrFail($application->campaign_id);
            $application = PublisherCampaigns::lockForUpdate()->findOrFail($application->id);
            if ($application->status !== 'P') {
                throw ValidationException::withMessages(['offer_id' => 'Only pending applications can be reviewed.']);
            }
            if ($offerId === null) {
                $application->update(['status' => 'R', 'rejection_reason' => $reason]);
                $this->record($application, $actor->id, 'rejected');

                return $application;
            }
            $publisher = Publisher::lockForUpdate()->findOrFail($application->publisher_id);
            $offer = Offer::where('campaign_id', $campaign->id)->lockForUpdate()->findOrFail($offerId);
            $contract = $this->approvalContract($campaign, $application, $publisher, $offer);
            $rules = $contract['commissions'];
            $application->update([
                'status' => 'A', 'offer_id' => $offer->id,
                'commission_type' => $rules[0]['type'], 'commission_value' => $rules[0]['value'],
                'approved_by' => $actor->id, 'approved_at' => now(),
                'tracking_link' => TrackingUrl::to('/t/'.Str::uuid()),
            ]);
            $this->record($application, $actor->id, 'approved');

            return $application;
        }, 3);
    }

    /** The same checks power the review drawer and the locked approval transaction. */
    public function approvalContract(Campaign $campaign, PublisherCampaigns $application, Publisher $publisher, Offer $offer): array
    {
        $this->eligible($campaign, $publisher, $offer);
        $contract = $this->contract($campaign, $offer);
        if ($application->requested_offer_id !== $offer->id || ! $application->terms_accepted_at
            || $application->terms_version !== $this->version($contract)) {
            throw ValidationException::withMessages(['offer_id' => 'The publisher must accept the current terms and commission for this offer before approval.']);
        }
        if ($campaign->max_publishers > 0 && PublisherCampaigns::where('campaign_id', $campaign->id)->whereIn('status', ['A', 'I'])->count() >= $campaign->max_publishers) {
            throw ValidationException::withMessages(['offer_id' => 'This campaign has no publisher slots available.']);
        }
        $rules = $contract['commissions'];
        if (count($rules) !== 1 || ! in_array($rules[0]['type'], ['CPL', 'CPA', 'CPS', 'RevShare', 'Flat'], true)) {
            throw ValidationException::withMessages(['offer_id' => 'Enrollment requires exactly one supported commission rule.']);
        }
        $rate = ConversionMoney::cents($rules[0]['value']);
        if ($rate <= 0 || (in_array($rules[0]['type'], ['CPS', 'RevShare'], true) && $rate > 10000)) {
            throw ValidationException::withMessages(['offer_id' => 'Commission must be positive and percentages cannot exceed 100%.']);
        }

        return $contract;
    }

    private function record(PublisherCampaigns $application, int $actorId, string $action): void
    {
        DB::table('partner_enrollment_events')->insert([
            'publisher_campaign_id' => $application->id, 'actor_id' => $actorId, 'action' => $action,
            'details' => json_encode($application->only(['status', 'requested_offer_id', 'offer_id', 'applied_notes', 'rejection_reason', 'terms_version', 'terms_snapshot', 'terms_accepted_at', 'commission_type', 'commission_value']), JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }
}
