<?php

use App\Models\Creative;
use App\Models\Offer;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
    $this->context = conversionFixture();
    $user = $this->context['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($user);
});

function offerMaterial(array $context): Creative
{
    return Creative::create([
        'campaign_id' => $context['campaign']->id, 'offer_id' => $context['offer']->id,
        'name' => 'Promotional link', 'type' => 'text', 'alt_text' => 'Learn more', 'file_url' => '', 'status' => 'A',
    ]);
}

it('shows an offer with optional materials and no hosted contact form', function () {
    $offer = $this->context['offer'];
    $this->get(route('advertiser.offers.show', $offer))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('advertisercampaigns/offers/show')
        ->has('materials.data', 0)
        ->missing('leadFormEmbedCode'));
    expect(Creative::count())->toBe(0);
    $own = offerMaterial($this->context);
    offerMaterial(conversionFixture());
    $this->get(route('advertiser.offers.show', $offer))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('materials.data', 1)->where('materials.data.0.id', $own->id));
});

it('scopes material creation and editing to the current offer and rejects foreign offers', function () {
    $offer = $this->context['offer'];
    $this->get(route('advertiser.creatives.create', ['offer_id' => $offer->id]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('offer.id', $offer->id)->has('offers', 1)->has('campaigns', 1));
    $creative = offerMaterial($this->context);
    $this->get(route('advertiser.creatives.edit', $creative))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('offer.id', $offer->id)->has('offers', 1));
    $foreign = conversionFixture();
    $this->get(route('advertiser.creatives.create', ['offer_id' => $foreign['offer']->id]))->assertNotFound();
    $this->get(route('advertiser.offers.show', $foreign['offer']))->assertForbidden();
});

it('returns material mutations to the offer and preserves existing tracking codes', function () {
    $offer = $this->context['offer'];
    $target = route('advertiser.offers.show', ['offer' => $offer->id, 'tab' => 'materials']);
    $data = ['campaign_id' => $offer->campaign_id, 'offer_id' => $offer->id, 'name' => 'Link', 'type' => 'text', 'alt_text' => 'Learn more'];
    $this->post(route('advertiser.creatives.store'), $data)->assertRedirect($target);
    $creative = Creative::sole();
    $code = $creative->tracking_code;
    $this->post(route('advertiser.creatives.update', $creative), [...$data, 'name' => 'Updated'])->assertRedirect($target);
    expect($creative->fresh()->tracking_code)->toBe($code);
    $other = Offer::create(['campaign_id' => $offer->campaign_id, 'network_id' => $offer->network_id, 'name' => 'Another offer']);
    $this->post(route('advertiser.creatives.update', $creative), [...$data, 'offer_id' => $other->id])->assertStatus(422);
    expect($creative->fresh()->offer_id)->toBe($offer->id);
    $this->delete(route('advertiser.creatives.delete', $creative))->assertRedirect($target);
    $this->assertModelMissing($creative);
});

it('redirects legacy standalone material navigation to campaigns', function () {
    $this->get(route('advertiser.creatives.index'))->assertRedirect(route('advertiser.campaign.index'));
    $this->get(route('advertiser.creatives.create'))->assertRedirect(route('advertiser.campaign.index'));
});
