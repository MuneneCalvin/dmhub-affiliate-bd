<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Network;
use App\Models\Offer;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function leadFormOwner(string $previewUrl = 'https://forms.brandnewday.example/aanmelden'): array
{
    $network = Network::forceCreate(['network_name' => fake()->company(), 'owner_email' => fake()->safeEmail(),
        'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'status' => 'A']);
    $user = User::factory()->create(['is_advertiser' => true]);
    $role = Role::findOrCreate('lead_form_manager', 'web');
    foreach (['manage_offers', 'view_offers'] as $permission) {
        $role->givePermissionTo(Permission::findOrCreate($permission, 'web'));
    }
    $user->assignRoleById($role->id);
    $advertiser = Advertiser::create(['user_id' => $user->id, 'network_id' => $network->id, 'business_name' => 'Adv BV',
        'website_name' => 'https://adv.test', 'industry' => 'retail', 'currency' => 'EUR', 'status' => 'A', 'is_verified' => true]);
    $campaign = Campaign::create(['network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => fake()->uuid(),
        'start_date' => now(), 'end_date' => now()->addMonth(), 'currency' => 'EUR', 'campaign_status' => 'A']);
    $offer = Offer::create(['campaign_id' => $campaign->id, 'network_id' => $network->id, 'name' => 'Offer', 'preview_url' => $previewUrl]);

    return [$user, $offer];
}

it('shows the owner a snippet, the key and the origin settings on the offer page', function () {
    [$user, $offer] = leadFormOwner();

    $this->actingAs($user)->get(route('advertiser.offers.show', $offer))->assertOk()
        ->assertInertia(fn ($page) => $page->component('advertisercampaigns/offers/show')
            ->where('leadForm.key', $offer->lead_form_key)
            ->where('leadForm.snippet', '<script async src="'.url('/lf/'.$offer->lead_form_key.'.js').'"></script>')
            ->where('leadForm.destinationHost', 'forms.brandnewday.example')
            ->where('leadForm.allowedOrigins', []));
});

it('shows the same settings when editing the offer', function () {
    [$user, $offer] = leadFormOwner();

    $this->actingAs($user)->get(route('advertiser.offers.edit', $offer))->assertOk()
        ->assertInertia(fn ($page) => $page->where('leadForm.key', $offer->lead_form_key));
});

it('keeps the key out of the offer itself so publisher-facing pages cannot leak it', function () {
    [, $offer] = leadFormOwner();

    expect($offer->fresh()->toArray())->not->toHaveKeys(['lead_form_key', 'lead_form_allowed_origins']);
});

it('stores the allowed origins in a normalized form', function () {
    [$user, $offer] = leadFormOwner();

    $this->actingAs($user)->post(route('advertiser.offers.lead-form.update', $offer), [
        'allowed_origins' => ['https://Forms.Partner.example/', 'https://forms.partner.example', 'http://localhost:3000'],
    ])->assertRedirect()->assertSessionHas('success');

    expect($offer->fresh()->lead_form_allowed_origins)->toBe(['https://forms.partner.example', 'http://localhost:3000']);
});

it('refuses origins that are not a scheme and host', function (string $origin) {
    [$user, $offer] = leadFormOwner();

    $this->actingAs($user)->post(route('advertiser.offers.lead-form.update', $offer), ['allowed_origins' => [$origin]])
        ->assertSessionHasErrors('allowed_origins.0');

    expect($offer->fresh()->lead_form_allowed_origins)->toBeNull();
})->with(['no scheme' => ['forms.example'], 'path' => ['https://forms.example/path'], 'javascript' => ['javascript:alert(1)'], 'wildcard' => ['*'], 'ftp' => ['ftp://forms.example']]);

it('refuses more than ten origins', function () {
    [$user, $offer] = leadFormOwner();

    $this->actingAs($user)->post(route('advertiser.offers.lead-form.update', $offer), [
        'allowed_origins' => array_map(fn ($i) => "https://f{$i}.example", range(1, 11)),
    ])->assertSessionHasErrors('allowed_origins');
});

it('rotates the key and retires the old embed at once', function () {
    [$user, $offer] = leadFormOwner();
    $old = $offer->lead_form_key;

    $this->actingAs($user)->post(route('advertiser.offers.lead-form.update', $offer), ['rotate' => true])->assertRedirect();

    expect($offer->fresh()->lead_form_key)->not->toBe($old);
    $this->get('/lf/'.$old.'.js')->assertNotFound();
});

it('keeps the key when only origins change', function () {
    [$user, $offer] = leadFormOwner();
    $key = $offer->lead_form_key;

    $this->actingAs($user)->post(route('advertiser.offers.lead-form.update', $offer), ['allowed_origins' => []])->assertRedirect();

    expect($offer->fresh()->lead_form_key)->toBe($key);
});

it('turns away another advertiser', function () {
    [, $offer] = leadFormOwner();
    [$other] = leadFormOwner();
    $key = $offer->lead_form_key;

    $this->actingAs($other)->post(route('advertiser.offers.lead-form.update', $offer), ['rotate' => true])->assertForbidden();
    $this->actingAs($other)->get(route('advertiser.offers.show', $offer))->assertForbidden();

    expect($offer->fresh()->lead_form_key)->toBe($key);
});

it('gives publishers neither the settings nor the snippet', function () {
    $f = conversionFixture();
    $key = $f['offer']->lead_form_key;
    $publisher = $f['publisher']->user;

    $response = $this->actingAs($publisher)->post(route('advertiser.offers.lead-form.update', $f['offer']), ['rotate' => true]);

    expect($response->status())->toBeIn([302, 403])->and($f['offer']->fresh()->lead_form_key)->toBe($key);
    $this->actingAs($publisher)->get(route('advertiser.offers.show', $f['offer']))->assertRedirect();
});
