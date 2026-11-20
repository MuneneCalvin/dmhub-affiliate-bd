<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\Network;
use App\Models\Offer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function advertiserWithCampaign(): array
{
    $network = Network::forceCreate([
        'network_name' => 'Test Network', 'owner_email' => 'owner@test.example', 'default_currency' => 'EUR',
        'pay_day_of_week' => 3, 'status' => 'A',
    ]);
    $user = User::factory()->create(['is_advertiser' => true]);
    $role = Role::create(['name' => 'offer_manager', 'guard_name' => 'web']);
    foreach (['create_offers', 'manage_offers', 'view_offers'] as $permission) {
        $role->givePermissionTo(Permission::findOrCreate($permission, 'web'));
    }
    $user->assignRoleById($role->id);
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
    $cpl = CommissionType::forceCreate(['name' => 'CPL', 'nice_name' => 'Cost Per Submission']);

    $this->actingAs($user)
        ->post("/advertiser/offers/{$campaign->id}/create", [
            'name' => 'Minimal offer',
            'commission_type_1' => $cpl->id,
            'commission_value_1' => 5,
        ])
        ->assertRedirect(route('advertiser.offers.show', Offer::where('name', 'Minimal offer')->firstOrFail()->id))
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

it('generates the tracking template from the destination and regenerates it on edit', function () {
    [$user, $campaign] = advertiserWithCampaign();
    $this->actingAs($user)->post("/advertiser/offers/{$campaign->id}/create", [
        'name' => 'Generated template',
        'preview_url' => 'https://shop.example/sale?utm_source=dm&click_id=old#checkout',
        'tracking_url_template' => 'https://ignored.example',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    $offer = Offer::where('name', 'Generated template')->firstOrFail();
    expect($offer->tracking_url_template)->toBe('https://shop.example/sale?utm_source=dm&click_id={click_id}&referral_id={referral_id}#checkout');
    $this->post("/advertiser/offers/{$offer->id}/update", [
        'name' => $offer->name, 'preview_url' => 'https://shop.example/new',
    ])->assertSessionHas('success');
    expect($offer->fresh()->tracking_url_template)->toBe('https://shop.example/new?click_id={click_id}&referral_id={referral_id}');
    $this->post("/advertiser/offers/{$offer->id}/update", ['name' => $offer->name, 'preview_url' => ''])->assertSessionHas('success');
    expect($offer->fresh()->tracking_url_template)->toBeNull();
});

it('saves generated templates longer than the former 255 character limit', function () {
    [$user, $campaign] = advertiserWithCampaign();
    $destination = 'https://shop.example/landing?campaign='.str_repeat('a', 250);
    $this->actingAs($user)->post("/advertiser/offers/{$campaign->id}/create", [
        'name' => 'Long destination', 'preview_url' => $destination,
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    expect(Offer::where('name', 'Long destination')->firstOrFail()->tracking_url_template)
        ->toBe($destination.'&click_id={click_id}&referral_id={referral_id}');
});

it('uploads offer thumbnails, preserves them on edit and ignores manually supplied asset URLs', function () {
    Storage::fake('public');
    [$user, $campaign] = advertiserWithCampaign();
    $this->actingAs($user)->post("/advertiser/offers/{$campaign->id}/create", [
        'name' => 'Uploaded thumbnail',
        'thumbnail' => UploadedFile::fake()->image('offer.png'),
        'thumbnail_url' => 'https://ignored.example/file.png',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    $offer = Offer::where('name', 'Uploaded thumbnail')->firstOrFail();
    $original = $offer->thumbnail_url;
    expect($original)->toContain('/storage/offers/thumbnails/');
    $this->post("/advertiser/offers/{$offer->id}/update", ['name' => 'Renamed thumbnail'])->assertSessionHas('success');
    expect($offer->fresh()->thumbnail_url)->toBe($original);
    $this->post("/advertiser/offers/{$offer->id}/update", [
        'name' => $offer->name,
        'thumbnail' => UploadedFile::fake()->image('replacement.png'),
    ])->assertSessionHas('success');
    expect($offer->fresh()->thumbnail_url)->not->toBe($original);
    $this->post("/advertiser/offers/{$offer->id}/update", [
        'name' => $offer->name,
        'thumbnail' => UploadedFile::fake()->create('bad.php', 10, 'text/plain'),
    ])->assertSessionHasErrors('thumbnail');
});
