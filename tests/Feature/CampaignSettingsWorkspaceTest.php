<?php

use App\Models\CampaignTerms;
use App\Models\Country;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignSettingsService;
use App\Support\ConversionEligibility;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture();
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    Country::firstOrCreate(['country_iso' => 'NLD'], ['country_name' => 'Netherlands', 'status' => 'A']);
    Country::firstOrCreate(['country_iso' => 'BEL'], ['country_name' => 'Belgium', 'status' => 'A']);
    $this->url = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'settings']);
    $this->saveUrl = route('campaign.settings.update', $this->f['campaign']);
    $this->termsUrl = route('campaign.settings.terms', $this->f['campaign']);
    $this->input = app(CampaignSettingsService::class)->build($this->f['campaign'], $this->manager)['values'];
    $this->actingAs($this->manager);
});

it('provides scoped settings, publisher counts, terms and existing targets', function () {
    $foreign = conversionFixture();
    CampaignTerms::create(['advertiser_id' => $foreign['advertiser']->id, 'description' => 'Private foreign terms']);
    CampaignTerms::create(['advertiser_id' => $this->f['advertiser']->id, 'description' => 'Our terms']);
    CampaignTerms::create(['description' => 'Shared terms']);
    $this->f['campaign']->update(['geo_targeting' => ['countries' => ['NLD', 'BEL']], 'metadata' => ['tags' => ['interior']]]);
    $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('settingsWorkspace.can_edit', true)->where('settingsWorkspace.publishers.active', 1)
        ->where('settingsWorkspace.publishers.inactive', 0)->has('settingsWorkspace.terms', 2)
        ->where('settingsWorkspace.values.country_filter', 'selected')
        ->where('settingsWorkspace.values.countries', ['NLD', 'BEL'])->where('settingsWorkspace.values.tags', ['interior']));
    $this->get(route('advertiser.campaign.show', $this->f['campaign']))->assertInertia(fn (Assert $page) => $page->where('settingsWorkspace', null));
    $this->get(route('advertiser.campaign.show', ['id' => $foreign['campaign']->id, 'tab' => 'settings']))->assertNotFound();
});

it('saves every setting while preserving identity, spend and unrelated metadata', function () {
    $f = $this->f;
    $f['campaign']->update(['metadata' => ['integration_key' => 'keep-me'], 'spent_amount' => 12]);
    CampaignTerms::create(['advertiser_id' => $f['advertiser']->id, 'description' => 'Terms v3']);
    $data = [...$this->input, 'name' => 'Autumn essentials', 'description' => 'Seasonal home collection.',
        'campaign_status' => 'P', 'start_date' => '2026-10-01', 'end_date' => '2026-11-30',
        'total_budget' => '10000', 'daily_budget' => '250', 'max_publishers' => '40',
        'country_filter' => 'selected', 'countries' => ['NLD', 'BEL'], 'devices' => ['desktop', 'mobile'],
        'target_conversions' => '500', 'target_roi' => '200', 'tags' => ['interior', 'autumn'], 'terms' => ['Terms v3'],
        'currency' => 'EUR', 'network_id' => 999999, 'advertiser_id' => 999999, 'spent_amount' => 0];
    $this->put($this->saveUrl, $data)->assertSessionHasNoErrors()->assertRedirect($this->url)->assertSessionHas('success');
    $campaign = $f['campaign']->fresh();
    expect($campaign->name)->toBe('Autumn essentials')->and($campaign->description)->toBe('Seasonal home collection.')
        ->and($campaign->campaign_status)->toBe('P')->and($campaign->currency)->toBe('USD')
        ->and($campaign->network_id)->toBe($f['network']->id)->and($campaign->advertiser_id)->toBe($f['advertiser']->id)
        ->and($campaign->spent_amount)->toBe('12.00')->and($campaign->total_budget)->toBe('10000.00')
        ->and($campaign->daily_budget)->toBe('250.00')->and($campaign->max_publishers)->toBe(40)
        ->and($campaign->geo_targeting)->toBe(['countries' => ['NLD', 'BEL']])
        ->and($campaign->device_targeting)->toBe(['devices' => ['desktop', 'mobile']])
        ->and($campaign->target_conversions)->toBe(500)->and($campaign->target_roi)->toBe('200.00')
        ->and($campaign->metadata)->toBe(['integration_key' => 'keep-me', 'tags' => ['interior', 'autumn']])
        ->and($campaign->terms)->toBe(['terms' => ['Terms v3']])
        ->and($campaign->start_date->format('Y-m-d H:i:s'))->toBe('2026-10-01 00:00:00')
        ->and($campaign->end_date->format('Y-m-d H:i:s'))->toBe('2026-11-30 23:59:59');
});

it('persists unlimited dates and limits and removes the country traffic restriction', function () {
    $this->f['campaign']->update(['geo_targeting' => ['countries' => ['NLD']]]);
    $this->put($this->saveUrl, [...$this->input, 'no_end_date' => true, 'end_date' => '', 'total_budget' => '', 'daily_budget' => '', 'country_filter' => 'all', 'countries' => []])->assertSessionHasNoErrors();
    $campaign = $this->f['campaign']->fresh();
    expect($campaign->end_date->year)->toBe(2100)->and($campaign->total_budget)->toBe('0.00')
        ->and($campaign->daily_budget)->toBe('0.00')->and($campaign->geo_targeting)->toBeNull();
    $assignment = $this->f['assignment']->fresh();
    ConversionEligibility::assertAssignment($assignment);
    ConversionEligibility::assertTraffic($assignment, null, 'desktop', null);
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page->where('settingsWorkspace.values.no_end_date', true)->where('settingsWorkspace.values.end_date', ''));
});

it('validates dates, limits, selections, goals, tags and duplicate names atomically', function (array $invalid, string $field) {
    $name = $this->f['campaign']->name;
    $this->put($this->saveUrl, [...$this->input, 'name' => 'Should not save', ...$invalid])->assertSessionHasErrors($field);
    expect($this->f['campaign']->fresh()->name)->toBe($name);
})->with([
    [['name' => ''], 'name'], [['campaign_status' => 'X'], 'campaign_status'],
    [['start_date' => '2026-10-10', 'end_date' => '2026-10-01'], 'end_date'],
    [['total_budget' => '-1'], 'total_budget'], [['daily_budget' => '1.001'], 'daily_budget'],
    [['max_publishers' => '-1'], 'max_publishers'], [['devices' => []], 'devices'],
    [['devices' => ['tv']], 'devices.0'], [['country_filter' => 'selected', 'countries' => []], 'countries'],
    [['country_filter' => 'selected', 'countries' => ['invalid']], 'countries.0'],
    [['target_conversions' => '0.5'], 'target_conversions'], [['target_roi' => '-10'], 'target_roi'],
    [['tags' => ['same', 'same']], 'tags.0'], [['terms' => ['unknown']], 'terms.0'],
]);

it('rejects duplicate campaign names within the advertiser', function () {
    $campaign = $this->f['campaign']->replicate();
    $campaign->name = 'Existing campaign';
    $campaign->save();
    $this->put($this->saveUrl, [...$this->input, 'name' => $campaign->name])->assertSessionHasErrors('name');
});

it('creates scoped reusable terms without applying them or changing the campaign', function () {
    $this->post($this->termsUrl, ['description' => 'New advertiser terms', 'advertiser_id' => 999999])->assertRedirect($this->url);
    $this->assertDatabaseHas('campaign_terms', ['advertiser_id' => $this->f['advertiser']->id, 'description' => 'New advertiser terms']);
    expect($this->f['campaign']->fresh()->terms)->toBeNull();
    $foreign = conversionFixture();
    $this->post(route('campaign.settings.terms', $foreign['campaign']), ['description' => 'No'])->assertNotFound();
    $this->put(route('campaign.settings.update', $foreign['campaign']), $this->input)->assertNotFound();
    $this->post($this->termsUrl, ['description' => ''])->assertSessionHasErrors('description');
});

it('keeps settings inaccessible to publishers and respects network edit grants', function () {
    $this->actingAs($this->f['publisher']->user)->get($this->url)->assertRedirect(route('dashboard'));
    $this->put($this->saveUrl, $this->input)->assertRedirect(route('dashboard'));
    $this->post($this->termsUrl, ['description' => 'No'])->assertRedirect(route('dashboard'));
    $this->get(route('publishers.my.campaign.show', ['id' => $this->f['assignment']->id, 'tab' => 'settings']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->missing('settingsWorkspace'));
    $network = User::factory()->create(['is_network' => true]);
    $network->assignRoleById(Role::findByName('network_owner')->id);
    UserNetworks::create(['user_id' => $network->id, 'network_id' => $this->f['network']->id]);
    $this->actingAs($network)->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page->where('settingsWorkspace.can_edit', false));
    $this->put($this->saveUrl, $this->input)->assertForbidden();
    $this->post($this->termsUrl, ['description' => 'No'])->assertForbidden();
    $network->givePermissionTo('manage_campaigns');
    $this->actingAs($network->fresh())->put($this->saveUrl, $this->input)->assertSessionHasNoErrors()->assertRedirect($this->url);
    $foreign = conversionFixture();
    $this->put(route('campaign.settings.update', $foreign['campaign']), $this->input)->assertNotFound();
    $this->actingAs(User::factory()->create(['is_super_admin' => true]))->get($this->url)->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('settingsWorkspace.can_edit', true));
    $this->put($this->saveUrl, $this->input)->assertSessionHasNoErrors()->assertRedirect($this->url);
});
