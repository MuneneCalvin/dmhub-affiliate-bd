<?php

use App\Models\CommissionType;
use App\Models\Creative;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture('CPS', '8.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $type = CommissionType::forceCreate(['name' => 'CPS', 'nice_name' => 'Cost Per Sale']);
    OfferCommission::create(['offer_id' => $this->f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => 10]);
    $this->material = Creative::create(['campaign_id' => $this->f['campaign']->id, 'offer_id' => $this->f['offer']->id,
        'name' => 'Autumn text', 'type' => 'text', 'alt_text' => 'Make room for autumn', 'file_url' => '', 'status' => 'A', 'clicks' => 540, 'impressions' => 18000]);
    $this->workspaceUrl = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'offers', 'offer' => $this->f['offer']->id]);
    $this->actingAs($this->manager);
});

it('provides scoped offers materials counts and manager permissions', function () {
    $foreign = conversionFixture();
    Creative::create(['campaign_id' => $foreign['campaign']->id, 'offer_id' => $foreign['offer']->id, 'name' => 'Foreign', 'type' => 'text', 'file_url' => '', 'status' => 'A']);
    $this->get($this->workspaceUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('offerWorkspace.offers', 1)->has('offerWorkspace.offers.0.materials', 1)
        ->where('offerWorkspace.offers.0.publishers_count', 1)
        ->where('offerWorkspace.offers.0.rates.0.value', fn ($value) => in_array($value, ['10', '10.00'], true))
        ->where('offerWorkspace.offers.0.materials.0.clicks', 540)
        ->where('offerWorkspace.offers.0.materials.0.impressions', 18000)
        ->where('offerWorkspace.can_create', true)->where('offerWorkspace.can_upload', true));
    $this->get(route('advertiser.campaign.show', $foreign['campaign']))->assertNotFound();
});

it('uses the publisher agreed rate and own clicks without disclosing other offers or aggregate statistics', function () {
    $f = $this->f;
    Offer::create(['campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id, 'name' => 'Unassigned offer']);
    Creative::create(['campaign_id' => $f['campaign']->id, 'offer_id' => $f['offer']->id, 'name' => 'Inactive', 'type' => 'text', 'file_url' => '', 'status' => 'I']);
    conversionClick($f)->update(['creative_id' => $this->material->id]);
    $foreign = conversionFixture();
    conversionClick($foreign)->update(['creative_id' => $this->material->id]);
    $this->actingAs($f['publisher']->user)->get(route('publishers.my.campaign.show', $f['assignment']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('offerWorkspace.offers', 1)->has('offerWorkspace.offers.0.materials', 1)
            ->where('offerWorkspace.offers.0.rates.0.value', '8.00')
            ->where('offerWorkspace.offers.0.publishers_count', null)
            ->where('offerWorkspace.offers.0.materials.0.clicks', 1)
            ->where('offerWorkspace.offers.0.materials.0.impressions', null)
            ->where('offerWorkspace.offers.0.materials.0.tracking_url', $f['assignment']->getCreativeTrackingUrl($this->material))
            ->missing('offerWorkspace.offers.0.materials.0.tracking_code')
            ->where('offerWorkspace.can_create', false)->where('offerWorkspace.can_edit', false)->where('offerWorkspace.can_upload', false));
    $this->post(route('advertiser.offers.update', $f['offer']), ['name' => 'Forbidden'])->assertRedirect(route('dashboard'));
});

it('supports pending unassigned publishers without leaking requested materials', function () {
    $this->f['assignment']->update(['offer_id' => null, 'requested_offer_id' => $this->f['offer']->id, 'status' => 'P']);
    $this->actingAs($this->f['publisher']->user)->get(route('publishers.my.campaign.show', $this->f['assignment']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('offerWorkspace.offers', 0));
});

it('returns create and edit to the overlay and preserves assignment rates', function () {
    $type = CommissionType::where('name', 'CPS')->firstOrFail();
    $input = ['workspace' => true, 'name' => 'New rate', 'commission_type_1' => $type->id, 'commission_value_1' => 15];
    $this->post(route('advertiser.offers.update', $this->f['offer']), $input)->assertRedirect($this->workspaceUrl)->assertSessionHasNoErrors();
    expect($this->f['assignment']->fresh()->commission_value)->toBe('8.00');
    $this->post(route('advertiser.offers.create', $this->f['campaign']), [...$input, 'name' => 'New offer'])->assertSessionHasNoErrors();
    $offer = Offer::where('name', 'New offer')->sole();
    $this->assertDatabaseHas('offer_commissions', ['offer_id' => $offer->id, 'commission_value' => 15]);
    $this->get(route('advertiser.campaign.show', $this->f['campaign']))->assertOk()->assertInertia(fn (Assert $page) => $page->has('offerWorkspace.offers', 2));
});

it('validates paired commission values and retains an explicitly zero rate', function () {
    $type = CommissionType::where('name', 'CPS')->firstOrFail();
    $input = ['workspace' => true, 'name' => 'Zero', 'commission_type_1' => $type->id];
    $this->post(route('advertiser.offers.update', $this->f['offer']), $input)->assertSessionHasErrors('commission_value_1');
    $this->post(route('advertiser.offers.update', $this->f['offer']), [...$input, 'commission_value_1' => 0])->assertSessionHasNoErrors();
    expect($this->f['offer']->fresh()->commission_value_1)->toEqual(0);
});

it('uploads edits and downloads material within the campaign workspace', function () {
    Storage::fake('public');
    $input = ['workspace' => true, 'campaign_id' => $this->f['campaign']->id, 'offer_id' => $this->f['offer']->id, 'name' => 'Autumn banner', 'type' => 'image'];
    $this->post(route('advertiser.creatives.store'), [...$input, 'asset' => UploadedFile::fake()->image('autumn.png', 1200, 628)])
        ->assertRedirect($this->workspaceUrl)->assertSessionHasNoErrors();
    $creative = Creative::where('name', 'Autumn banner')->sole();
    $this->get(route('campaign.materials.download', $creative))->assertOk()->assertDownload('autumn-banner.png');
    $this->post(route('advertiser.creatives.update', $creative), [...$input, 'name' => 'Updated banner'])->assertRedirect($this->workspaceUrl);
    expect($creative->fresh()->file_url)->toBe($creative->file_url)->and($creative->fresh()->tracking_code)->toBe($creative->tracking_code);
});

it('authorizes downloads for the owning manager and publisher but rejects foreign assignments and inactive materials', function () {
    $url = route('campaign.materials.download', $this->material);
    $this->get($url)->assertDownload('autumn-text.txt')->assertStreamedContent('Make room for autumn');
    $this->actingAs($this->f['publisher']->user)->get($url.'?assignment='.$this->f['assignment']->id)->assertOk();
    $foreign = conversionFixture();
    $foreign['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->get($url.'?assignment='.$foreign['assignment']->id)->assertNotFound();
    $this->actingAs($foreign['publisher']->user)->get($url.'?assignment='.$this->f['assignment']->id)->assertNotFound();
    $this->material->update(['status' => 'I']);
    $this->actingAs($this->f['publisher']->user)->get($url.'?assignment='.$this->f['assignment']->id)->assertNotFound();
    $foreign['advertiser']->user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($foreign['advertiser']->user)->get($url)->assertNotFound();
});

it('supports network and admin management while enforcing network tenancy', function () {
    $operator = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $operator->id, 'network_id' => $this->f['network']->id]);
    $operator->assignRoleById(Role::findByName('network_owner')->id);
    $this->actingAs($operator)->get($this->workspaceUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('offerWorkspace.can_create', true)->where('offerWorkspace.can_edit', true)->where('offerWorkspace.can_upload', true)->where('offerWorkspace.can_edit_materials', true));
    $foreign = conversionFixture();
    $this->post(route('advertiser.creatives.store'), ['campaign_id' => $foreign['campaign']->id, 'offer_id' => $foreign['offer']->id, 'name' => 'Forbidden', 'type' => 'text', 'alt_text' => 'No'])->assertNotFound();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->get($this->workspaceUrl)->assertOk()->assertInertia(fn (Assert $page) => $page->where('offerWorkspace.can_edit', true)->where('offerWorkspace.can_upload', true));
});

it('backfills network material permissions idempotently', function () {
    $role = Role::findByName('network_owner');
    $role->revokePermissionTo(['upload_creatives', 'manage_creatives']);
    $migration = require database_path('migrations/2026_11_04_000001_enable_network_offer_materials.php');
    $migration->up();
    $migration->up();
    expect($role->fresh()->hasAllPermissions(['upload_creatives', 'manage_creatives']))->toBeTrue();
});
