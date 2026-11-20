<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Support\ConversionEligibility;
use Carbon\CarbonImmutable;

class ReferralController extends Controller
{
    public function show(string $referral)
    {
        $click = Clicks::where('referral_id', $referral)->firstOrFail();
        ConversionEligibility::assertClick($click, CarbonImmutable::now(), true);

        return response()->json([
            'referral_id' => $click->referral_id, 'click_id' => $click->id,
            'campaign_id' => $click->campaign_id, 'offer_id' => $click->offer_id,
            'clicked_at' => $click->clicked_at->toISOString(),
            'expires_at' => ConversionEligibility::expiresAt($click, true)->toISOString(),
        ])->header('Cache-Control', 'no-store');
    }
}
