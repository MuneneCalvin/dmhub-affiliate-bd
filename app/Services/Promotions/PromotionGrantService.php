<?php

namespace App\Services\Promotions;

use App\Models\Clicks;
use App\Models\CustomerPromotion;
use App\Models\PromotionGrant;
use App\Models\StoreConnection;
use App\Support\ConversionEligibility;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PromotionGrantService
{
    public function issue(StoreConnection $store, string $referral, string $session): PromotionGrant
    {
        abort_unless($store->status === 'connected', 409, 'Store is not connected.');
        $click = Clicks::where('referral_id', $referral)->where('network_id', $store->network_id)
            ->whereHas('campaign', fn ($q) => $q->where('advertiser_id', $store->advertiser_id))->firstOrFail();
        // Commission funding is checked when accruing commission, not when granting a customer benefit.
        ConversionEligibility::assertClick($click, CarbonImmutable::now(), true, false);

        return DB::transaction(function () use ($store, $click, $session) {
            $promotion = CustomerPromotion::where('offer_id', $click->offer_id)->lockForUpdate()->firstOrFail();
            $sessionHash = hash('sha256', $session);
            $existing = PromotionGrant::where('store_connection_id', $store->id)->where('click_id', $click->id)
                ->where('session_hash', $sessionHash)->first();
            if ($existing) {
                abort_if($existing->expires_at->isPast() || $existing->redeemed_at, 422, 'Offer has expired or was redeemed.');

                return $existing;
            }
            abort_unless($promotion->status === 'active' && $promotion->stores()->whereKey($store->id)->exists(), 422, 'No active promotion for this store.');
            $version = $promotion->versions()->where('version', $promotion->published_version)->firstOrFail();
            $c = $version->configuration;
            PromotionConfiguration::assertSupported($c, $store);
            abort_if(CarbonImmutable::parse($c['starts_at'])->isFuture() || (! empty($c['ends_at']) && CarbonImmutable::parse($c['ends_at'])->isPast()), 422, 'Promotion is outside its active dates.');
            $expires = CarbonImmutable::now()->addHours((int) $c['validity_hours'])
                ->min(ConversionEligibility::expiresAt($click, true))->min($click->campaign->end_date);
            if (! empty($c['ends_at'])) {
                $expires = $expires->min(CarbonImmutable::parse($c['ends_at']));
            }
            if ($click->offer->expires_at) {
                $expires = $expires->min($click->offer->expires_at);
            }

            return PromotionGrant::create([
                'id' => (string) Str::uuid(), 'store_connection_id' => $store->id,
                'promotion_version_id' => $version->id, 'click_id' => $click->id,
                'session_hash' => $sessionHash, 'code' => 'DMH-'.strtoupper(Str::random(24)), 'expires_at' => $expires,
            ]);
        });
    }

    public function payload(PromotionGrant $grant): array
    {
        return ['id' => $grant->id, 'referral_id' => $grant->click->referral_id,
            'clicked_at' => $grant->click->clicked_at->toISOString(), 'code' => $grant->code,
            'expires_at' => $grant->expires_at->toISOString(), 'version' => $grant->version->version,
            'configuration' => $grant->version->configuration];
    }
}
