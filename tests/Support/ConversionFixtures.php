<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\Network;
use App\Models\Offer;
use App\Models\PostbackCredential;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Services\Finance\FundingService;
use Illuminate\Support\Str;

function conversionFixture(string $type = 'CPL', string $rate = '10.00'): array
{
    $network = Network::forceCreate(['network_name' => fake()->company(), 'owner_email' => fake()->safeEmail(), 'status' => 'A', 'default_currency' => 'USD', 'pay_day_of_week' => 3, 'requires_prepaid_funding' => true, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $advertiser = Advertiser::create(['user_id' => User::factory()->create(['is_advertiser' => true])->id,
        'network_id' => $network->id, 'business_name' => 'Merchant', 'website_name' => 'https://merchant.example',
        'industry' => 'retail', 'status' => 'A', 'available_budget' => 0, 'currency' => 'USD']);
    app(FundingService::class)->deposit($advertiser, '1000.00', 'USD', (string) Str::uuid(), 'Test bank receipt', $advertiser->user_id);
    $advertiser->refresh();
    $campaign = Campaign::create(['network_id' => $network->id, 'advertiser_id' => $advertiser->id,
        'name' => fake()->uuid(), 'start_date' => now()->subDay(), 'end_date' => now()->addMonth(),
        'campaign_status' => 'A', 'currency' => 'USD', 'total_budget' => 1000]);
    $offer = Offer::create(['campaign_id' => $campaign->id, 'network_id' => $network->id,
        'name' => 'Offer', 'offer_status' => 'A', 'preview_url' => 'https://merchant.example/',
        'conversion_window_hours' => 72, 'click_cookie_lifetime_hours' => 24]);
    $publisher = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true])->id,
        'network_id' => $network->id, 'website_url' => 'https://publisher.example']);
    $assignment = PublisherCampaigns::create(['publisher_id' => $publisher->id, 'network_id' => $network->id,
        'campaign_id' => $campaign->id, 'offer_id' => $offer->id, 'status' => 'A',
        'commission_type' => $type, 'commission_value' => $rate, 'tracking_link' => url('/t/'.Str::random(20))]);
    $token = Str::random(64);
    $credential = PostbackCredential::create(['advertiser_id' => $advertiser->id, 'name' => 'test',
        'token_hash' => hash('sha256', $token), 'expires_at' => now()->addMonth()]);

    return compact('network', 'advertiser', 'campaign', 'offer', 'publisher', 'assignment', 'token', 'credential');
}

function conversionClick(array $fixture): Clicks
{
    return Clicks::create(['publisher_id' => $fixture['publisher']->id, 'network_id' => $fixture['network']->id,
        'campaign_id' => $fixture['campaign']->id, 'offer_id' => $fixture['offer']->id,
        'publisher_campaign_id' => $fixture['assignment']->id, 'clicked_at' => now(),
        'device_type' => 'desktop', 'country_iso' => 'USA']);
}

function conversionPayload(Clicks $click, array $overrides = []): array
{
    return array_merge(['event_type' => 'submission', 'external_id' => 'submission:merchant-1',
        'referral_id' => $click->referral_id, 'occurred_at' => now()->toISOString(),
        'amount' => '0.00', 'currency' => 'USD', 'successful' => true,
        'spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false]], $overrides);
}
