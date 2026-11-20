<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\CampaignTerms;
use App\Models\Creative;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
});

function advertiserWorkspaceOperator(array $fixture): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $fixture['network']->id]);
    $user->assignRoleById(Role::findByName('network_owner')->id);

    return $user;
}

it('opens an advertiser workspace for its owner and scopes every related list', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $user = $own['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $url = route('advertisers.show', $user->id);
    $this->actingAs($user)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('advertisers/show')->where('workspace.permissions.settings', false)
        ->where('workspace.permissions.recordFunding', false)->where('workspace.permissions.directory', false)
        ->where('workspace.summary.campaigns', 1)->where('workspace.summary.available', '1000.00')
        ->missing('advertiser.password')->missing('advertiser.two_factor_secret')->has('networks', 0)->has('currencies', 0));
    $this->get($url.'?tab=campaigns')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.campaigns.data', 1)->where('workspace.campaigns.data.0.id', $own['campaign']->id));
    $this->get($url.'?tab=funding')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.funding.data', 1)->where('workspace.funding.data.0.amount_minor', 100000)
        ->missing('workspace.funding.data.0.details')->missing('workspace.funding.data.0.evidence'));
    $shared = CampaignTerms::create(['description' => 'Shared']);
    $term = CampaignTerms::create(['advertiser_id' => $own['advertiser']->id, 'description' => 'Own terms']);
    CampaignTerms::create(['advertiser_id' => $foreign['advertiser']->id, 'description' => 'Private foreign terms']);
    $this->get($url.'?tab=terms')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.terms.data', 2)->where('workspace.terms.data.0.id', $term->id)
        ->where('workspace.terms.data.1.id', $shared->id));
    foreach ([$own, $foreign] as $fixture) {
        Creative::create(['campaign_id' => $fixture['campaign']->id, 'offer_id' => $fixture['offer']->id,
            'name' => 'Text material', 'type' => 'text', 'file_url' => '', 'status' => 'A']);
    }
    $this->get($url.'?tab=materials')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.materials.data', 1)->where('workspace.materials.data.0.campaign.id', $own['campaign']->id));
    $this->get($url.'?tab=settings')->assertForbidden();
    $this->get(route('advertisers.show', $foreign['advertiser']->user_id))->assertNotFound();
});

it('limits network staff to their network and does not grant funding writes', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $user = advertiserWorkspaceOperator($own);
    $this->actingAs($user)->get(route('advertisers.show', $own['advertiser']->user_id))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('workspace.permissions.edit', true)
            ->where('workspace.permissions.activate', true)->where('workspace.permissions.recordFunding', false)
            ->where('workspace.permissions.changeNetwork', false)->where('workspace.permissions.createCampaign', false)
            ->where('workspace.permissions.funding', true)->has('networks', 0));
    $this->get(route('advertisers.show', $foreign['advertiser']->user_id))->assertNotFound();
    $this->postJson(route('finance.funding', $own['advertiser']))->assertRedirect(route('dashboard'));
    expect($own['advertiser']->fresh()->available_budget)->toBe('1000.00');
});

it('omits restricted data and rejects direct and partial requests for hidden tabs', function () {
    $own = conversionFixture();
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $own['network']->id]);
    $user->givePermissionTo('view_advertisers');
    $url = route('advertisers.show', $own['advertiser']->user_id);
    $this->actingAs($user)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.tabs', 2)->where('workspace.tabs.0.key', 'overview')->where('workspace.tabs.1.key', 'account')
        ->where('workspace.summary.campaigns', null)->where('workspace.summary.available', null)
        ->where('workspace.summary.netFunded', null)->missing('advertiser.available_budget')
        ->where('workspace.campaigns', null)->where('workspace.funding', null)->has('networks', 0)->has('currencies', 0));
    foreach (['campaigns', 'materials', 'terms', 'funding', 'settings'] as $tab) {
        $this->get($url.'?tab='.$tab)->assertForbidden();
    }
    $this->get($url.'?tab=funding', ['X-Inertia' => 'true', 'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(request()), 'X-Inertia-Partial-Component' => 'advertisers/show', 'X-Inertia-Partial-Data' => 'workspace'])->assertForbidden();
    $user->givePermissionTo('view_campaigns');
    $this->get($url.'?tab=campaigns')->assertOk();
    $user->revokePermissionTo('view_campaigns');
    $this->get($url.'?tab=campaigns')->assertForbidden();
});

it('records funding from the selected advertiser workspace and refreshes the same tab', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $url = route('advertisers.show', ['id' => $own['advertiser']->user_id, 'tab' => 'funding']);
    $this->actingAs($admin)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.permissions.recordFunding', true));
    $this->from($url)->post(route('finance.funding', $own['advertiser']), [
        'operation' => 'deposit', 'amount' => '25.00', 'currency' => 'USD',
        'reference' => 'workspace-deposit', 'evidence' => 'Verified transfer',
    ])->assertRedirect($url)->assertSessionHasNoErrors();
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.summary.available', '1025.00')->has('workspace.funding.data', 2));
    expect($foreign['advertiser']->fresh()->available_budget)->toBe('1000.00');
    $this->from($url)->post(route('finance.funding', $own['advertiser']), [
        'operation' => 'refund', 'amount' => '10.00', 'currency' => 'USD',
        'reference' => 'workspace-refund', 'evidence' => 'Unused funds returned',
    ])->assertRedirect($url)->assertSessionHasNoErrors();
    expect($own['advertiser']->fresh()->available_budget)->toBe('1015.00');
});

it('preserves advertiser context when creating a campaign and rejects foreign selections', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $user = $own['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($user)->get(route('advertiser.campaign.create', ['advertiser_id' => $own['advertiser']->id]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->where('selectedAdvertiserId', $own['advertiser']->id));
    $this->get(route('advertiser.campaign.create', ['advertiser_id' => $foreign['advertiser']->id]))->assertNotFound();
});

it('does not admit publishers or inactive network memberships', function () {
    $own = conversionFixture();
    $url = route('advertisers.show', $own['advertiser']->user_id);
    $this->actingAs($own['publisher']->user)->get($url)->assertRedirect(route('dashboard'));
    $operator = advertiserWorkspaceOperator($own);
    $own['network']->update(['status' => 'I']);
    $this->actingAs($operator)->get($url)->assertForbidden();
});

it('saves business settings in context without changing funds or network ownership', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $operator = advertiserWorkspaceOperator($own);
    $input = ['business_name' => 'Updated business', 'website_name' => 'https://merchant.example',
        'industry' => 'retail', 'currency_code' => 'USD', 'total_budget' => '2500',
        'network_id' => $foreign['network']->id];
    $this->actingAs($operator)->post(route('advertisers.update', $own['advertiser']), $input)
        ->assertSessionHasNoErrors()->assertRedirect(route('advertisers.show', ['id' => $own['advertiser']->user_id, 'tab' => 'settings']));
    expect($own['advertiser']->fresh()->business_name)->toBe('Updated business')
        ->and($own['advertiser']->fresh()->available_budget)->toBe('1000.00')
        ->and($own['advertiser']->fresh()->network_id)->toBe($own['network']->id);
    $this->post(route('advertisers.update', $own['advertiser']), [...$input, 'currency_code' => 'EUR'])->assertSessionHasErrors('currency');
    $this->post(route('advertisers.update', $foreign['advertiser']), $input)->assertNotFound();
});

it('paginates related campaigns without losing advertiser and tab context', function () {
    $own = conversionFixture();
    $admin = User::factory()->create(['is_super_admin' => true]);
    for ($i = 0; $i < 15; $i++) {
        $copy = $own['campaign']->replicate();
        $copy->name = 'Additional campaign '.$i;
        $copy->save();
    }
    $url = route('advertisers.show', ['id' => $own['advertiser']->user_id, 'tab' => 'campaigns']);
    $this->actingAs($admin)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.campaigns.data', 15)->where('workspace.campaigns.total', 16)
        ->where('workspace.campaigns.next_page_url', fn ($value) => str_contains($value, '/advertisers/show/'.$own['advertiser']->user_id.'?') && str_contains($value, 'tab=campaigns') && str_contains($value, 'page=2')));
    $this->get($url.'&page=2')->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.campaigns.data', 1));
});

it('requires the workspace entry permission for both owners and network staff', function (string $actorType) {
    $own = conversionFixture();
    $actor = $actorType === 'owner' ? $own['advertiser']->user : User::factory()->create(['is_network' => true]);
    if ($actorType === 'network') {
        UserNetworks::create(['user_id' => $actor->id, 'network_id' => $own['network']->id]);
    }
    $this->actingAs($actor)->get(route('advertisers.show', $own['advertiser']->user_id))->assertForbidden();
})->with(['owner', 'network']);
