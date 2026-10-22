<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\CommissionType;
use App\Models\Network;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;

function trackedClick(float $cpl = 5.0): Clicks
{
    $network = Network::forceCreate([
        'network_name' => 'Commission Network', 'owner_email' => 'owner@commission.example', 'default_currency' => 'EUR',
        'pay_day_of_week' => 3, 'status' => 'A',
    ]);
    $advUser = User::factory()->create(['is_advertiser' => true]);
    $advertiser = Advertiser::create([
        'user_id' => $advUser->id, 'network_id' => $network->id, 'business_name' => 'Adv BV',
        'website_name' => 'https://adv.test', 'industry' => 'retail', 'currency' => 'EUR', 'status' => 'A', 'is_verified' => true,
    ]);
    $campaign = Campaign::create([
        'network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => 'Campaign',
        'start_date' => now(), 'end_date' => now()->addMonth(), 'currency' => 'EUR', 'campaign_status' => 'A',
    ]);
    $offer = Offer::create(['campaign_id' => $campaign->id, 'network_id' => $network->id, 'name' => 'Offer']);
    $cplType = CommissionType::forceCreate(['name' => 'CPL', 'nice_name' => 'Cost Per Lead']);
    OfferCommission::create(['offer_id' => $offer->id, 'commission_type_id' => $cplType->id, 'commission_value' => $cpl]);

    $pubUser = User::factory()->create(['is_publisher' => true]);
    $publisher = Publisher::create(['user_id' => $pubUser->id, 'network_id' => $network->id, 'website_url' => 'https://pub.test']);
    $publisherCampaign = PublisherCampaigns::create([
        'publisher_id' => $publisher->id, 'campaign_id' => $campaign->id, 'offer_id' => $offer->id,
        'network_id' => $network->id, 'status' => 'A',
    ]);

    return Clicks::create([
        'publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $campaign->id,
        'offer_id' => $offer->id, 'publisher_campaign_id' => $publisherCampaign->id, 'clicked_at' => now(),
    ]);
}

it('pays the publisher when a tracked click submits the capture form', function () {
    $click = trackedClick(5.0);

    $this->post('/lead/submit', ['click_id' => $click->id, 'first_name' => 'Ada', 'email' => 'ada@example.test'])->assertOk();

    $earning = PublisherEarning::where('publisher_id', $click->publisher_id)->first();
    expect($earning)->not->toBeNull();
    expect((float) $earning->amount)->toBe(5.0);
    expect($earning->commission_type)->toBe('CPL');
    expect($earning->lead_id)->not->toBeNull();
});

it('does not pay twice when the capture form is submitted again for the same click', function () {
    $click = trackedClick();
    $payload = ['click_id' => $click->id, 'first_name' => 'Ada', 'email' => 'ada@example.test'];

    $this->post('/lead/submit', $payload)->assertOk();
    $this->post('/lead/submit', $payload)->assertOk();

    expect(PublisherEarning::where('publisher_id', $click->publisher_id)->count())->toBe(1);
});

it('pays the publisher when an advertiser postback creates a lead', function () {
    config(['services.postback.secret' => 'topsecret']);
    $click = trackedClick(7.5);

    $this->postJson('/api/postback/lead', ['click_id' => $click->id, 'email' => 'bob@example.test'], ['X-Postback-Secret' => 'topsecret'])
        ->assertOk()
        ->assertJsonPath('success', true);

    $earning = PublisherEarning::where('publisher_id', $click->publisher_id)->first();
    expect($earning)->not->toBeNull();
    expect((float) $earning->amount)->toBe(7.5);
});

it('does not pay twice when a postback is repeated', function () {
    config(['services.postback.secret' => 'topsecret']);
    $click = trackedClick();

    foreach ([1, 2] as $_) {
        $this->postJson('/api/postback/lead', ['click_id' => $click->id], ['X-Postback-Secret' => 'topsecret'])->assertOk();
    }

    expect(PublisherEarning::where('publisher_id', $click->publisher_id)->count())->toBe(1);
});
