<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\Network;
use App\Models\Offer;
use App\Models\User;

function advertiserWithCampaign(): array
{
    $network = Network::forceCreate([
        'network_name' => 'Test Network', 'owner_email' => 'owner@test.example', 'default_currency' => 'EUR',
        'pay_day_of_week' => 3, 'status' => 'A',
    ]);
    $user = User::factory()->create(['is_advertiser' => true]);
    $advertiser = Advertiser::create([
        'user_id' => $user->id, 'network_id' => $network->id, 'business_name' => 'Adv BV',
        'website_name' => 'https://adv.test', 'industry' => 'retail', 'currency' => 'EUR', 'status' => 'A', 'is_verified' => true,
    ]);
    $campaign = Campaign::create([
        'network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => 'Campaign',
        'start_date' => now(), 'end_date' => now()->addMonth(), 'currency' => 'EUR', 'campaign_status' => 'A',
    ]);

    return [$user, $campaign];
}

it('creates an offer when optional numeric fields are left blank', function () {
    [$user, $campaign] = advertiserWithCampaign();
    $cpl = CommissionType::forceCreate(['name' => 'CPL', 'nice_name' => 'Cost Per Lead']);

    $this->actingAs($user)
        ->post("/advertiser/offers/{$campaign->id}/create", [
            'name' => 'Minimal offer',
            'commission_type_1' => $cpl->id,
            'commission_value_1' => 5,
        ])
        ->assertRedirect(route('advertiser.campaign.show', [$campaign->id]))
        ->assertSessionHas('success');

    $offer = Offer::where('name', 'Minimal offer')->first();
    expect($offer)->not->toBeNull();
    expect((float) $offer->minimum_payout)->toBe(0.0);
});

it('updates an offer without a minimum payout', function () {
    [$user, $campaign] = advertiserWithCampaign();
    $offer = Offer::create(['campaign_id' => $campaign->id, 'network_id' => $campaign->network_id, 'name' => 'Old']);

    $this->actingAs($user)
        ->post("/advertiser/offers/{$offer->id}/update", ['name' => 'Renamed'])
        ->assertSessionHas('success');

    expect($offer->fresh()->name)->toBe('Renamed');
});

it('rejects non-numeric offer amounts', function () {
    [$user, $campaign] = advertiserWithCampaign();

    $this->actingAs($user)
        ->postJson("/advertiser/offers/{$campaign->id}/create", ['name' => 'Bad', 'minimum_payout' => 'abc'])
        ->assertStatus(422);
});

it('redirects the old per-role registration URLs to the registration page', function () {
    $this->get('/register/publisher')->assertRedirect('/register');
    $this->get('/register/advertiser')->assertRedirect('/register');
});
