<?php

use App\Models\Creative;
use App\Models\Offer;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Storage::fake('public');
    $this->seed(RolePermsSeeder::class);
    $this->context = conversionFixture();
    $this->user = $this->context['advertiser']->user;
    $this->user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($this->user);
});

function libraryCreative(array $context, string $type, array $attributes = []): Creative
{
    return Creative::create([
        'campaign_id' => $context['campaign']->id, 'offer_id' => $context['offer']->id,
        'name' => ucfirst($type).' creative', 'type' => $type, 'file_url' => '', 'status' => 'A',
        'alt_text' => 'Shop now', ...$attributes,
    ]);
}

it('lists only visible creatives with type counts, offers and permissions', function () {
    libraryCreative($this->context, 'banner', ['width' => 728, 'height' => 90, 'clicks' => 12]);
    libraryCreative($this->context, 'image');
    libraryCreative($this->context, 'text');
    libraryCreative($this->context, 'email');
    libraryCreative(conversionFixture(), 'banner');

    $this->get(route('advertiser.creatives.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('creatives/index')
        ->has('creatives.data', 4)
        ->where('type', 'all')
        ->where('campaign', null)
        ->where('typeCounts', ['all' => 4, 'banner' => 2, 'text' => 1, 'email' => 1, 'html' => 0, 'video' => 0])
        ->has('campaigns', 1)
        ->where('campaigns.0.id', $this->context['campaign']->id)
        ->has('offers', 1)
        ->where('offers.0.id', $this->context['offer']->id)
        ->where('can', ['upload' => true, 'manage' => true])
        ->has('creatives.data.0.embed_code')
        ->has('creatives.data.0.campaign.name'));
});

it('filters by type and campaign and ignores unknown or foreign values', function () {
    libraryCreative($this->context, 'banner');
    libraryCreative($this->context, 'image');
    libraryCreative($this->context, 'text');
    Offer::create(['campaign_id' => $this->context['campaign']->id, 'network_id' => $this->context['network']->id, 'name' => 'Other offer']);
    $foreign = conversionFixture();

    $this->get(route('advertiser.creatives.index', ['type' => 'banner']))->assertInertia(fn (Assert $page) => $page
        ->where('type', 'banner')->has('creatives.data', 2)->where('typeCounts.all', 3));
    $this->get(route('advertiser.creatives.index', ['type' => 'nope']))->assertInertia(fn (Assert $page) => $page
        ->where('type', 'all')->has('creatives.data', 3));
    $this->get(route('advertiser.creatives.index', ['campaign' => $this->context['campaign']->id, 'type' => 'text']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('campaign', $this->context['campaign']->id)->has('creatives.data', 1)->has('offers', 2));
    $this->get(route('advertiser.creatives.index', ['campaign' => $foreign['campaign']->id]))
        ->assertInertia(fn (Assert $page) => $page->where('campaign', null)->has('creatives.data', 3));
});

it('returns uploads, edits and deletes started in the library to the library', function () {
    $library = route('advertiser.creatives.index');
    $this->post(route('advertiser.creatives.store'), [
        'campaign_id' => $this->context['campaign']->id, 'offer_id' => $this->context['offer']->id,
        'name' => 'Dropped banner', 'type' => 'banner', 'return_to' => 'library',
        'asset' => UploadedFile::fake()->image('drop.png', 300, 250),
    ])->assertSessionHasNoErrors()->assertRedirect($library);
    $creative = Creative::where('name', 'Dropped banner')->firstOrFail();
    expect((int) $creative->width)->toBe(300);

    $this->post(route('advertiser.creatives.update', $creative), [
        'campaign_id' => $creative->campaign_id, 'offer_id' => $creative->offer_id,
        'name' => 'Renamed banner', 'type' => 'banner', 'return_to' => 'library',
    ])->assertRedirect($library);
    expect($creative->fresh()->name)->toBe('Renamed banner');

    $this->get(route('advertiser.creatives.edit', ['id' => $creative->id, 'from' => 'library']))
        ->assertInertia(fn (Assert $page) => $page->where('returnTo', 'library'));
    $this->get(route('advertiser.creatives.create', ['offer_id' => $creative->offer_id, 'from' => 'library']))
        ->assertInertia(fn (Assert $page) => $page->where('returnTo', 'library'));

    $this->delete(route('advertiser.creatives.delete', $creative), ['return_to' => 'library'])->assertRedirect($library);
    $this->assertModelMissing($creative);
});

it('keeps the library behind the manage_creatives permission', function () {
    $this->user->syncRoles([]);
    $this->user->syncPermissions([]);
    $this->get(route('advertiser.creatives.index'))->assertForbidden();
});

it('shares manage permission with the creative details page', function () {
    $creative = libraryCreative($this->context, 'text');
    $this->get(route('advertiser.creatives.show', $creative))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('creatives/show')->where('can.manage', true)->where('creative.id', $creative->id));
});
