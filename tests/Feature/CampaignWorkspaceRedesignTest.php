<?php

use App\Models\Campaign;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignOverviewService;
use Carbon\CarbonImmutable;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->travelTo(CarbonImmutable::parse('2026-11-04 15:00:00', 'UTC'));
    $this->f = conversionFixture();
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
});

function networkOwnerFor(array $f): User
{
    $owner = User::factory()->create(['is_network' => true]);
    $owner->assignRoleById(Role::findByName('network_owner')->id);
    UserNetworks::create(['user_id' => $owner->id, 'network_id' => $f['network']->id]);

    return $owner->fresh();
}

it('pauses and resumes a campaign from the workspace header', function () {
    $campaign = $this->f['campaign'];
    $url = route('campaign.status.update', $campaign);

    $this->actingAs($this->manager)->from(route('advertiser.campaign.show', $campaign->id))
        ->patch($url, ['campaign_status' => 'P'])
        ->assertRedirect(route('advertiser.campaign.show', $campaign->id))
        ->assertSessionHas('success', __('messages.campaigns.paused'));
    expect($campaign->fresh()->campaign_status)->toBe('P');

    $this->patch($url, ['campaign_status' => 'A'])->assertSessionHas('success', __('messages.campaigns.resumed'));
    expect($campaign->fresh()->campaign_status)->toBe('A');

    // Only pause/resume: other statuses go through the full edit form.
    $this->patch($url, ['campaign_status' => 'I'])->assertSessionHasErrors('campaign_status');
    expect($campaign->fresh()->campaign_status)->toBe('A');
});

it('keeps pause and resume scoped and permission checked', function () {
    $campaign = $this->f['campaign'];
    $url = route('campaign.status.update', $campaign);

    // Another advertiser cannot see the campaign.
    $foreign = conversionFixture();
    $foreign['advertiser']->user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($foreign['advertiser']->user->fresh())->patch($url, ['campaign_status' => 'P'])->assertNotFound();

    // The default network owner may view but not manage campaigns.
    $owner = networkOwnerFor($this->f);
    $this->actingAs($owner)->patch($url, ['campaign_status' => 'P'])->assertForbidden();

    // Publishers are not campaign managers.
    $this->actingAs($this->f['publisher']->user->fresh())->patch($url, ['campaign_status' => 'P'])->assertRedirect();
    expect($campaign->fresh()->campaign_status)->toBe('A');
});

it('gives the workspace header and overview real campaign data', function () {
    $f = $this->f;
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    // Targeting is set afterwards so the test click (USA) still converts.
    $f['campaign']->update(['geo_targeting' => ['countries' => ['NLD', 'BEL']], 'metadata' => ['tags' => ['seasonal']]]);

    $this->actingAs($this->manager)->get(route('advertiser.campaign.show', $f['campaign']->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('advertisercampaigns/show')
            ->where('overview.campaign.countries', ['NLD', 'BEL'])
            ->where('overview.campaign.tags', ['seasonal'])
            ->where('overview.counts.offers', 1)
            ->where('overview.counts.publishers', 1)
            ->where('overview.offer_conversions.'.$f['offer']->id, 1)
            ->where('overview.tracking.last_click_at', fn ($value) => $value !== null)
            ->where('overview.tracking.last_outcome_at', fn ($value) => $value !== null)
            ->where('overview.can.manage', true)
            ->where('overview.can.create_offers', true)
            // Advertisers cannot record their own funding.
            ->where('overview.can.fund', false)
            ->where('overview.funding_advertiser', null)
            ->has('offerWorkspace.offers', 1));
});

it('offers add funds only to operators who may record funding', function () {
    $owner = networkOwnerFor($this->f);
    $overview = app(CampaignOverviewService::class)->build($this->f['campaign']->fresh(), $owner);
    $canFund = $owner->permissionNames()->contains('manage_funding');
    expect($overview['can']['fund'])->toBe($canFund)
        ->and($overview['can']['manage'])->toBe($owner->permissionNames()->contains('manage_campaigns'));
    if ($canFund) {
        expect($overview['funding_advertiser'])->toBe([
            'id' => $this->f['advertiser']->id,
            'business_name' => 'Merchant',
            'currency' => 'USD',
        ]);
    }

    $owner->givePermissionTo('manage_funding');
    $funded = app(CampaignOverviewService::class)->build($this->f['campaign']->fresh(), $owner->fresh());
    expect($funded['can']['fund'])->toBeTrue()
        ->and($funded['funding_advertiser']['id'])->toBe($this->f['advertiser']->id);
});

it('shows the publisher only their own counts and no manager actions', function () {
    $overview = app(CampaignOverviewService::class)->build(
        $this->f['campaign']->fresh(), $this->f['publisher']->user, $this->f['assignment']->fresh());

    expect($overview['counts']['publishers'])->toBeNull()
        ->and($overview['can'])->toBe(['manage' => false, 'create_offers' => false, 'fund' => false])
        ->and($overview['funding_advertiser'])->toBeNull();
});

it('counts only conversions in the 30-day window per offer', function () {
    $f = $this->f;
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['external_id' => 'old']))->assertCreated();
    $old = $f['assignment']->conversions()->latest('id')->firstOrFail();
    $old->update(['conversion_date' => '2026-09-01']);

    $overview = app(CampaignOverviewService::class)->build($f['campaign']->fresh(), $this->manager);
    expect((array) $overview['offer_conversions'])->toBe([]);
});

it('filters the campaign list by status and counts every status', function () {
    $f = $this->f;
    Campaign::create(['network_id' => $f['network']->id, 'advertiser_id' => $f['advertiser']->id, 'name' => 'Paused one',
        'start_date' => now(), 'end_date' => now()->addMonth(), 'campaign_status' => 'P', 'currency' => 'USD']);
    $foreign = conversionFixture();
    Campaign::create(['network_id' => $foreign['network']->id, 'advertiser_id' => $foreign['advertiser']->id, 'name' => 'Foreign paused',
        'start_date' => now(), 'end_date' => now()->addMonth(), 'campaign_status' => 'P', 'currency' => 'USD']);

    $this->actingAs($this->manager)->get(route('advertiser.campaign.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('advertisercampaigns/index')
            ->where('status', 'all')
            ->where('statusCounts', ['all' => 2, 'A' => 1, 'P' => 1, 'I' => 0])
            ->has('campaigns.results.data', 2)
            ->where('campaigns.results.data.0.advertiser_name', 'Merchant')
            ->where('campaigns.results.data.1.offers_count', 1));

    $this->get(route('advertiser.campaign.index', ['status' => 'P']))
        ->assertInertia(fn (Assert $page) => $page->where('status', 'P')
            ->has('campaigns.results.data', 1)
            ->where('campaigns.results.data.0.name', 'Paused one'));

    // Unknown filters fall back to all campaigns.
    $this->get(route('advertiser.campaign.index', ['status' => 'X']))
        ->assertInertia(fn (Assert $page) => $page->where('status', 'all')->has('campaigns.results.data', 2));
});

it('gives the offer and campaign forms the names they show', function () {
    $f = $this->f;
    $this->actingAs($this->manager)->get(route('advertiser.offers.index', $f['campaign']->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('campaign.name', $f['campaign']->name)
            ->where('campaign.currency', 'USD'));

    $this->get(route('advertiser.campaign.edit', $f['campaign']->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('advertiserName', 'Merchant'));
});
