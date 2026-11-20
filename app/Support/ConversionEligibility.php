<?php

namespace App\Support;

use App\Models\Clicks;
use App\Models\Network;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Services\Finance\LedgerService;
use Carbon\CarbonInterface;

class ConversionEligibility
{
    public static function assertAssignment(PublisherCampaigns $assignment, ?CarbonInterface $at = null, bool $checkBudget = true): void
    {
        $campaign = $assignment->campaign;
        $offer = $assignment->offer;
        $at ??= now();
        abort_unless($campaign && $offer && $campaign->campaign_status === 'A' && $offer->offer_status === 'A', 403, 'Campaign or offer is inactive.');
        if ($campaign->start_date->gt($at) || $campaign->end_date->lt($at)
            || ($offer->expires_at && $offer->expires_at->lt($at))) {
            self::reject('Campaign or offer is outside its active dates.');
        }
        if ($checkBudget) {
            self::assertBudget($assignment, 0);
        }
    }

    public static function assertBudget(PublisherCampaigns $assignment, int $commissionCents): void
    {
        $campaign = $assignment->campaign;
        // Read decimal sums as strings; budget checks never use binary floats.
        $ledger = app(LedgerService::class);
        $ledger->currency($campaign->currency);
        $requiresPrepayment = Network::findOrFail($assignment->network_id)->requires_prepaid_funding;
        $available = min(ConversionMoney::signedCents($campaign->advertiser->available_budget),
            $ledger->balance($assignment->network_id, $campaign->currency, 'advertiser', $campaign->advertiser_id));
        $total = ConversionMoney::cents($campaign->total_budget);
        $spent = ConversionMoney::cents($campaign->spent_amount);
        $daily = ConversionMoney::cents($campaign->daily_budget);
        $dailySpent = ConversionMoney::cents(PublisherEarning::whereHas('publisherCampaign', fn ($q) => $q->where('campaign_id', $campaign->id))
            ->where('created_at', '>=', now()->utc()->startOfDay())->sum('amount'));
        $creditLimit = $campaign->advertiser->credit_limit ?? '0.00';
        if (! $requiresPrepayment
            && ($available + ConversionMoney::cents($creditLimit) <= 0
                || $commissionCents > $available + ConversionMoney::cents($creditLimit))) {
            self::reject('Advertiser credit limit reached.');
        }
        if (($requiresPrepayment && ($available <= 0 || $commissionCents > $available))
            || ($total > 0 && ($spent >= $total || $spent + $commissionCents > $total))
            || ($daily > 0 && ($dailySpent >= $daily || $dailySpent + $commissionCents > $daily))) {
            self::reject('Advertiser, campaign or daily budget exhausted.');
        }
    }

    public static function assertClick(Clicks $click, CarbonInterface $occurredAt, bool $capture = false, bool $checkBudget = true): void
    {
        $assignment = PublisherAttribution::assertClick($click, $checkBudget);
        self::assertAssignment($assignment, $occurredAt, $checkBudget);
        $expiry = self::expiresAt($click, $capture);
        if ($click->clicked_at->gt($occurredAt) || $occurredAt->gt(now()) || $expiry->lt($occurredAt) || $expiry->lt(now())) {
            self::reject('Referral has expired or event time is outside the attribution window.');
        }
        self::assertTraffic($assignment, $click->traffic_source, $click->device_type, $click->country_iso);
    }

    public static function expiresAt(Clicks $click, bool $capture = false): CarbonInterface
    {
        $conversion = $click->conversion_expires_at ?? $click->clicked_at->addHours($click->offer->conversion_window_hours ?? 720);
        if (! $capture) {
            return $conversion;
        }
        $referral = $click->referral_expires_at ?? $click->clicked_at->addHours($click->offer->click_cookie_lifetime_hours ?? 168);

        return $referral->lt($conversion) ? $referral : $conversion;
    }

    public static function assertTraffic(PublisherCampaigns $assignment, ?string $source, ?string $device, ?string $country): void
    {
        $offer = $assignment->offer;
        $campaign = $assignment->campaign;
        $allowed = $offer->allowed_traffic_sources['sources'] ?? $offer->allowed_traffic_sources;
        $prohibited = $offer->prohibited_traffic_sources['sources'] ?? $offer->prohibited_traffic_sources;
        $devices = $campaign->device_targeting['devices'] ?? $campaign->device_targeting;
        $countries = $campaign->geo_targeting['countries'] ?? $campaign->geo_targeting;
        if (($allowed && ! in_array($source, $allowed, true))
            || ($source && in_array($source, $prohibited ?? [], true))
            || ($devices && ! in_array($device, $devices, true))
            || ($countries && ! in_array($country, $countries, true))) {
            self::reject('Traffic does not meet the offer or campaign restrictions.');
        }
    }

    private static function reject(string $message): never
    {
        abort(422, $message);
    }
}
