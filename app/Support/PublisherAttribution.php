<?php

namespace App\Support;

use App\Models\Clicks;
use App\Models\Creative;
use App\Models\PublisherCampaigns;
use Illuminate\Validation\ValidationException;

class PublisherAttribution
{
    public static function assertActive(PublisherCampaigns $assignment, bool $checkBudget = true): void
    {
        $assignment->loadMissing(['publisher.user', 'campaign.advertiser.user', 'offer', 'network']);
        $publisher = $assignment->publisher;
        $campaign = $assignment->campaign;
        $advertiser = $campaign?->advertiser;
        $offer = $assignment->offer;

        abort_unless($assignment->status === 'A' && $publisher && $advertiser && $offer
            && $assignment->terminated_at === null
            && $assignment->network?->status === 'A'
            && $publisher->user?->status === 'A' && $publisher->user?->closed_at === null
            && $advertiser->user?->status === 'A' && $advertiser->user?->closed_at === null
            && $publisher->user?->hasVerifiedEmail() && $advertiser->user?->hasVerifiedEmail()
            && $advertiser->status === 'A'
            && (int) $publisher->network_id === (int) $assignment->network_id
            && (int) $advertiser->network_id === (int) $assignment->network_id
            && (int) $campaign->network_id === (int) $assignment->network_id
            && (int) $offer->network_id === (int) $assignment->network_id
            && (int) $offer->campaign_id === (int) $campaign->id,
            403, 'Inactive or inconsistent publisher attribution.');
        ConversionEligibility::assertAssignment($assignment, null, $checkBudget);
    }

    public static function assertClick(Clicks $click, bool $checkBudget = true): PublisherCampaigns
    {
        $assignment = $click->publisherCampaign;
        abort_unless($assignment, 422, 'A publisher-scoped click is required.');
        self::assertActive($assignment, $checkBudget);
        foreach (['publisher_id', 'campaign_id', 'offer_id', 'network_id'] as $field) {
            if ((int) $click->$field !== (int) $assignment->$field) {
                throw ValidationException::withMessages(['click_id' => 'Click attribution does not match the publisher assignment.']);
            }
        }
        if ($click->creative_id) {
            self::assertCreative($click->creative, $assignment);
        }

        return $assignment;
    }

    public static function assertCreative(?Creative $creative, PublisherCampaigns $assignment): void
    {
        if (! $creative || $creative->status !== 'A'
            || (int) $creative->offer_id !== (int) $assignment->offer_id
            || (int) $creative->campaign_id !== (int) $assignment->campaign_id) {
            throw ValidationException::withMessages(['tracking_code' => 'Creative does not match the publisher assignment.']);
        }
    }
}
