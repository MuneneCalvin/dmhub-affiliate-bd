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
    $this->url = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'tracking']);
    $this->handoff = route('campaign.tracking.handoff', [$this->f['campaign'], $this->f['assignment']]);
    $this->actingAs($this->manager);
});

it('renders actual scoped tracking assets and empty evidence without leaking credentials', function () {
    $foreign = conversionFixture();
    $response = $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('trackingWorkspace.offers', 1)->has('trackingWorkspace.publishers', 1)
        ->where('trackingWorkspace.tracking_link', $this->f['assignment']->tracking_link)
        ->where('trackingWorkspace.embed_script', $this->f['assignment']->getEmbedScriptTag())
        ->where('trackingWorkspace.qr_code', fn ($value) => str_starts_with($value, 'data:image/png;base64,'))
        ->where('trackingWorkspace.rates.0.value', '10.00')
        ->where('trackingWorkspace.evidence.clicked_at', null)->where('trackingWorkspace.evidence.outcome', null)
        ->where('trackingWorkspace.evidence.commission', null)->where('trackingWorkspace.evidence.copied_at', null));
    $response->assertDontSee($this->f['token'])->assertDontSee($foreign['assignment']->script_token);
});

it('rejects foreign offers and assignments in selectors', function () {
    $foreign = conversionFixture();
    $this->get($this->url.'&offer='.$foreign['offer']->id)->assertNotFound();
    $this->get($this->url.'&publisher='.$foreign['assignment']->id)->assertNotFound();
    $offer = Offer::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id, 'name' => 'Second offer']);
    $this->get($this->url.'&offer='.$offer->id.'&publisher='.$this->f['assignment']->id)->assertNotFound();
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
    $earning = PublisherEarning::where('publisher_campaign_id', $f['assignment']->id)->sole();
    app(EarningReviewService::class)->approve($earning, $this->manager->id, 'Verified');
    $this->get($this->url)->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.evidence.commission.status', 'approved'));
    $other = PublisherCampaigns::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id,
        'offer_id' => $f['offer']->id, 'publisher_id' => conversionFixture()['publisher']->id, 'status' => 'A']);
    $this->get($this->url.'&publisher='.$other->id)->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.evidence.outcome', null)->where('trackingWorkspace.evidence.clicked_at', null));
});

it('limits publishers to their assigned offer guides and hides manager evidence', function () {
    $f = $this->f;
    $unassigned = Offer::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id, 'name' => 'Private offer']);
    $foreign = conversionFixture();
    $this->actingAs($f['publisher']->user);
    $url = route('publishers.my.campaign.show', ['id' => $f['assignment']->id, 'tab' => 'tracking']);
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('trackingWorkspace.publisher_view', true)->has('trackingWorkspace.offers', 1)->has('trackingWorkspace.publishers', 1)
        ->where('trackingWorkspace.offer.id', $f['offer']->id)->where('offerWorkspace.offers.0.tracking_guide_url', $url.'&offer='.$f['offer']->id)->where('trackingWorkspace.evidence', null)->where('trackingWorkspace.handoff_url', null));
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
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('trackingWorkspace.offers', 0)
        ->where('offerWorkspace.offers.0.tracking_guide_url', null)->where('trackingWorkspace.offer', null)->where('trackingWorkspace.tracking_link', null)->where('trackingWorkspace.embed_script', null));
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
    $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page->has('trackingWorkspace.offers', 0)->where('trackingWorkspace.offer', null));
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
