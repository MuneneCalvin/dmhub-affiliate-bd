<?php

use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture('CPS', '10.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->hub = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'tracking']);
    $this->url = route('campaign.tracking.offer', [$this->f['campaign']->id, $this->f['offer']->id]);
    $this->handoff = route('campaign.tracking.handoff', [$this->f['campaign'], $this->f['assignment']]);
    $this->actingAs($this->manager);
});

it('lists every campaign offer and summarizes evidence from its approved assignments', function () {
    $f = $this->f;
    $empty = Offer::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id, 'name' => 'No publishers']);
    $second = PublisherCampaigns::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id,
        'offer_id' => $f['offer']->id, 'publisher_id' => conversionFixture()['publisher']->id, 'status' => 'A', 'commission_type' => 'CPL', 'script_impressions' => 1]);
    conversionClick([...$f, 'assignment' => $second]);
    $this->post(route('campaign.tracking.handoff', [$f['campaign'], $second]), ['offer_id' => $f['offer']->id, 'platform' => 'wordpress']);
    $this->get($this->hub)->assertInertia(fn (Assert $page) => $page->has('trackingHub.offers', 2)
        ->where('trackingHub.offers.0.publishers', 2)->where('trackingHub.offers.0.links', 1)
        ->where('trackingHub.offers.0.clicked', true)->where('trackingHub.offers.0.confirmed', false)
        ->where('trackingHub.offers.0.handoff_platform', 'wordpress')->where('trackingHub.offers.0.script_seen', true)
        ->where('trackingHub.offers.0.url', $this->url.'?publisher='.$second->id)
        ->where('trackingHub.offers.1.id', $empty->id)->where('trackingHub.offers.1.publishers', 0)
        ->where('trackingHub.offers.1.clicked', false)->missing('trackingWorkspace'));
    $this->get($this->url.'?publisher='.$second->id)->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.assignment_id', $second->id));
    $second->update(['terminated_at' => now()]);
    $this->get($this->hub)->assertInertia(fn (Assert $page) => $page->where('trackingHub.offers.0.clicked', false)
        ->where('trackingHub.offers.0.handoff_platform', null)->where('trackingHub.offers.0.script_seen', false));
    $this->get($this->hub.'&offer='.$f['offer']->id)->assertInertia(fn (Assert $page) => $page->component('campaigns/offer-tracking'));
});

it('renders actual scoped tracking assets and empty evidence without leaking credentials', function () {
    $foreign = conversionFixture();
    $response = $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('campaigns/offer-tracking')->has('trackingWorkspace.publishers', 1)
        ->where('trackingWorkspace.tracking_link', $this->f['assignment']->tracking_link)
        ->where('trackingWorkspace.embed_script', null)->where('trackingWorkspace.script_token', null)
        ->where('trackingWorkspace.setup_options', ['purchase'])
        ->where('trackingWorkspace.qr_code', fn ($value) => str_starts_with($value, 'data:image/png;base64,'))
        ->where('trackingWorkspace.rates.0.value', '10.00')
        ->where('trackingWorkspace.evidence.clicked_at', null)->where('trackingWorkspace.evidence.outcome', null)
        ->where('trackingWorkspace.evidence.commission', null)->where('trackingWorkspace.evidence.copied_at', null));
    $response->assertDontSee($this->f['token'])->assertDontSee($foreign['assignment']->script_token);
});

it('selects merchant setup from the agreed outcome and scopes embed evidence to form assignments', function ($type, $options, $embed) {
    $f = $this->f;
    $f['assignment']->update(['commission_type' => $type, 'script_impressions' => 2]);
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.setup_options', $options)->where('trackingWorkspace.script_seen', $embed)
        ->where('trackingWorkspace.script_token', $embed ? $f['assignment']->script_token : null)
        ->where('trackingWorkspace.embed_script', $embed ? $f['assignment']->getEmbedScriptTag() : null));
    $this->get($this->hub)->assertInertia(fn (Assert $page) => $page->where('trackingHub.offers.0.script_seen', $embed));
})->with([
    ['CPL', ['submission'], true], ['CPS', ['purchase'], false], ['RevShare', ['purchase'], false],
    ['CPA', ['action'], false], ['CPC', ['click'], false], ['Flat', ['purchase', 'action'], false],
]);

it('gives publishers sharing assets without merchant setup or script tokens', function () {
    $f = $this->f;
    $f['assignment']->update(['commission_type' => 'CPL', 'script_impressions' => 1]);
    $this->actingAs($f['publisher']->user)->get(route('publisher.tracking.offer', [$f['assignment'], $f['offer']]))
        ->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.setup_options', [])
            ->where('trackingWorkspace.events_url', null)->where('trackingWorkspace.embed_script', null)
            ->where('trackingWorkspace.script_token', null)->where('trackingWorkspace.script_seen', false)
            ->where('trackingWorkspace.tracking_link', $f['assignment']->tracking_link));
});

it('rejects foreign offers and assignments in selectors', function () {
    $foreign = conversionFixture();
    $this->get($this->hub.'&offer='.$foreign['offer']->id)->assertNotFound();
    $this->get($this->url.'?publisher='.$foreign['assignment']->id)->assertNotFound();
    $offer = Offer::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id, 'name' => 'Second offer']);
    $this->get($this->hub.'&offer='.$offer->id.'&publisher='.$this->f['assignment']->id)->assertNotFound();
});

it('persists successful handoff evidence for the selected assignment and offer', function () {
    $input = ['platform' => 'shopify', 'offer_id' => $this->f['offer']->id];
    $this->from($this->url)->post($this->handoff, $input)->assertRedirect($this->url);
    $this->assertDatabaseHas('campaign_tracking_handoffs', ['publisher_campaign_id' => $this->f['assignment']->id,
        'offer_id' => $this->f['offer']->id, 'platform' => 'shopify', 'copied_by' => $this->manager->id]);
    $this->post($this->handoff, [...$input, 'platform' => 'woocommerce'])->assertRedirect();
    $this->assertDatabaseCount('campaign_tracking_handoffs', 1);
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.evidence.copied_at', fn ($value) => $value !== null));
    $this->post($this->handoff, [...$input, 'platform' => 'invalid'])->assertSessionHasErrors('platform');
    $this->post($this->handoff, [...$input, 'offer_id' => 999999])->assertNotFound();
    $foreign = conversionFixture();
    $this->post(route('campaign.tracking.handoff', [$foreign['campaign'], $foreign['assignment']]), ['platform' => 'shopify', 'offer_id' => $foreign['offer']->id])->assertNotFound();
});

it('reports confirmed outcomes independently of financial review and only for the selected publisher', function () {
    $f = $this->f;
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '120.00', 'external_id' => 'order:HH-2048']))->assertCreated();
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.evidence.clicked_at', $click->clicked_at->toISOString())
        ->where('trackingWorkspace.evidence.outcome.reference', 'order:HH-2048')
        ->where('trackingWorkspace.evidence.commission.status', 'pending')
        ->where('trackingWorkspace.evidence.commission.amount', '12.00'));
    $this->get($this->hub)->assertInertia(fn (Assert $page) => $page->where('trackingHub.offers.0.confirmed', true));
    $earning = PublisherEarning::where('publisher_campaign_id', $f['assignment']->id)->sole();
    app(EarningReviewService::class)->approve($earning, $this->manager->id, 'Verified');
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.evidence.commission.status', 'approved'));
    $other = PublisherCampaigns::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id,
        'offer_id' => $f['offer']->id, 'publisher_id' => conversionFixture()['publisher']->id, 'status' => 'A']);
    $this->get($this->url.'?publisher='.$other->id)->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.evidence.outcome', null)->where('trackingWorkspace.evidence.clicked_at', null));
});

it('limits publishers to their assigned offer guides and hides manager evidence', function () {
    $f = $this->f;
    $unassigned = Offer::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id, 'name' => 'Private offer']);
    $foreign = conversionFixture();
    $this->actingAs($f['publisher']->user);
    $url = route('publishers.my.campaign.show', ['id' => $f['assignment']->id, 'tab' => 'tracking']);
    $guide = route('publisher.tracking.offer', [$f['assignment'], $f['offer']]);
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('trackingHub.publisher_view', true)->has('trackingHub.offers', 1)
        ->where('trackingHub.offers.0.url', $guide)->where('offerWorkspace.offers.0.tracking_guide_url', $guide));
    $this->get($guide)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.publisher_view', true)->has('trackingWorkspace.publishers', 1)
        ->where('trackingWorkspace.offer.id', $f['offer']->id)->where('trackingWorkspace.evidence', null)->where('trackingWorkspace.handoff_url', null));
    $this->get($url.'&offer='.$unassigned->id)->assertNotFound();
    $this->get($url.'&publisher='.$foreign['assignment']->id)->assertNotFound();
    $this->get(route('publishers.my.campaign.show', ['id' => $foreign['assignment']->id, 'tab' => 'tracking']))->assertNotFound();
    $this->post($this->handoff, ['platform' => 'shopify', 'offer_id' => $f['offer']->id])->assertRedirect(route('dashboard'));
    $this->assertDatabaseCount('campaign_tracking_handoffs', 0);
});

it('withholds guides and assets from pending or terminated publisher assignments', function (string $state) {
    $f = $this->f;
    $f['assignment']->update($state === 'terminated' ? ['terminated_at' => now()] : ['status' => $state]);
    $this->actingAs($f['publisher']->user)->get(route('publishers.my.campaign.show', ['id' => $f['assignment']->id, 'tab' => 'tracking']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('trackingHub.offers', 0)
        ->where('offerWorkspace.offers.0.tracking_guide_url', null)->missing('trackingWorkspace'));
    $this->get(route('publisher.tracking.offer', [$f['assignment'], $f['offer']]))->assertNotFound();
})->with(['P', 'R', 'terminated']);

it('allows network operators and admins but prevents cross-network access', function () {
    $f = $this->f;
    $network = User::factory()->create(['is_network' => true]);
    $network->assignRoleById(Role::findByName('network_owner')->id);
    UserNetworks::create(['user_id' => $network->id, 'network_id' => $f['network']->id]);
    $this->actingAs($network)->get($this->url)->assertOk();
    $foreign = conversionFixture();
    $this->get(route('advertiser.campaign.show', ['id' => $foreign['campaign']->id, 'tab' => 'tracking']))->assertNotFound();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->get($this->url)->assertOk();
    $this->post($this->handoff, ['platform' => 'custom-website', 'offer_id' => $f['offer']->id])->assertRedirect();
});

it('offers a guide with no approved publisher and handles an empty campaign', function () {
    $this->f['assignment']->update(['status' => 'P']);
    $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.offer.id', $this->f['offer']->id)->has('trackingWorkspace.publishers', 0)
        ->where('trackingWorkspace.qr_code', null)->where('trackingWorkspace.evidence', null));
    $this->post($this->handoff, ['platform' => 'custom-website', 'offer_id' => $this->f['offer']->id])->assertNotFound();
    $this->f['assignment']->delete();
    $this->f['offer']->delete();
    $this->get($this->hub)->assertOk()->assertInertia(fn (Assert $page) => $page->has('trackingHub.offers', 0)->missing('trackingWorkspace'));
});

it('downloads a PNG with the same scoped link and rejects inaccessible or inactive assignments', function () {
    $f = $this->f;
    $foreign = conversionFixture();
    $url = route('campaign.tracking.qr', [$f['campaign'], $f['assignment']]);
    $response = $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Content-Disposition', 'attachment; filename="tracking-'.$f['offer']->id.'-'.$f['assignment']->id.'.png"');
    expect(substr($response->getContent(), 0, 8))->toBe("\x89PNG\r\n\x1a\n");
    $this->get(route('campaign.tracking.qr', [$f['campaign'], $foreign['assignment']]))->assertNotFound();
    $this->get(route('campaign.tracking.qr', [$foreign['campaign'], $foreign['assignment']]))->assertNotFound();
    $this->actingAs($f['publisher']->user)->get(route('publisher.tracking.qr', $f['assignment']))->assertOk();
    $this->get(route('publisher.tracking.qr', $foreign['assignment']))->assertNotFound();
    $f['assignment']->update(['terminated_at' => now()]);
    $this->get(route('publisher.tracking.qr', $f['assignment']))->assertNotFound();
});
