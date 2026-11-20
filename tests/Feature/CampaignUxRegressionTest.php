<?php

use App\Models\Campaign;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\FundingService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function campaignNetworkOperator(array $fixture): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $fixture['network']->id]);
    $user->assignRoleById(Role::findByName('network_owner')->id);

    return $user;
}

it('repairs the network campaign directory without granting campaign editing or foreign access', function () {
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $own = conversionFixture();
    $foreign = conversionFixture();
    $role = Role::findByName('network_owner');
    $role->revokePermissionTo('view_campaigns');
    $migration = require database_path('migrations/2026_11_02_000003_enable_campaign_directory.php');
    $migration->up();
    $migration->up();
    $user = campaignNetworkOperator($own);

    $this->actingAs($user)->get(route('advertiser.campaign.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('campaigns.results.data', 1)
            ->where('campaigns.results.data.0.id', $own['campaign']->id));
    $this->get(route('advertiser.campaign.show', $own['campaign']))->assertOk();
    $this->get(route('advertiser.campaign.show', $foreign['campaign']))->assertNotFound();
    $this->get(route('advertiser.campaign.edit', $own['campaign']))->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page->component('errors/forbidden'));
    $this->getJson(route('advertiser.campaign.edit', $own['campaign']))->assertForbidden()->assertJsonStructure(['message']);
    expect($role->fresh()->hasPermissionTo('manage_campaigns'))->toBeFalse();
});

it('shares direct grants and returns no stale grants after they are revoked', function () {
    $user = User::factory()->create();
    $permission = Permission::findOrCreate('view_campaigns', 'web');
    $user->givePermissionTo($permission);
    expect($user->fresh()->permissionNames()->all())->toBe(['view_campaigns']);
    $user->revokePermissionTo($permission);
    expect($user->fresh()->permissionNames()->all())->toBe([]);
});

it('supplies the campaign currency and the scoped advertiser funding balance', function () {
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $f = conversionFixture();
    $f['campaign']->update(['currency' => 'EUR']);
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($user)->get(route('advertiser.offers.show', $f['offer']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('offer.currency', 'EUR'));
    $this->get(route('advertiser.campaign.show', $f['campaign']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('funding.currency', 'USD')
            ->where('funding.available_budget', '1000.00'));
    $this->get(route('advertiser.campaign.edit', $f['campaign']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('funding.currency', 'USD')
            ->where('funding.available_budget', '1000.00'));
});

it('shows the requested offer before approval without assigning it', function () {
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $f = conversionFixture();
    $f['assignment']->update(['status' => 'P', 'offer_id' => null, 'requested_offer_id' => $f['offer']->id]);
    $user = campaignNetworkOperator($f);
    $this->actingAs($user)->get(route('applications.show', $f['assignment']->id))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('application.requested_offer_name', 'Offer')
            ->where('application.offer_id', null));
    $this->get(route('applications.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('applications.data.0.requested_offer_name', 'Offer'));
});

it('reports actual advertiser verification and role flags without exposing authentication secrets', function () {
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $f = conversionFixture();
    $f['advertiser']->user->update(['email_verified_at' => now(), 'two_factor_confirmed_at' => now()]);
    $user = campaignNetworkOperator($f);
    $this->actingAs($user)->get(route('advertisers.show', $f['advertiser']->user_id))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('advertiser.is_advertiser', true)
            ->where('advertiser.email_verified_at', fn ($value) => $value !== null)
            ->where('advertiser.two_factor_confirmed_at', fn ($value) => $value !== null)
            ->missing('advertiser.password')->missing('advertiser.two_factor_secret'));
});

it('creates campaigns without advertiser funds and with independently optional budgets', function (array $budgets, string $total, string $daily) {
    Notification::fake();
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $f = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    app(FundingService::class)->refund($f['advertiser'], '1000.00', 'USD',
        'campaign-setup-refund', 'Return test funding', $user->id);

    $this->actingAs($user)->get(route('advertiser.campaign.create'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('advertisers', 1)
            ->where('advertisers.0.id', $f['advertiser']->id)
            ->where('advertisers.0.available_budget', '0.00'));
    $this->post(route('advertiser.campaign.store'), [
        'name' => 'Unfunded campaign', 'currency' => 'USD',
        'start_date' => now()->toDateString(), 'end_date' => now()->addMonth()->toDateString(),
        ...$budgets,
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $campaign = Campaign::where('name', 'Unfunded campaign')->firstOrFail();
    expect($campaign->advertiser_id)->toBe($f['advertiser']->id)
        ->and($campaign->total_budget)->toBe($total)
        ->and($campaign->daily_budget)->toBe($daily)
        ->and($f['advertiser']->fresh()->available_budget)->toBe('0.00');
    $this->get(route('advertiser.campaign.show', $campaign))->assertOk();
})->with([
    'omitted' => [[], '0.00', '0.00'],
    'blank' => [['total_budget' => '', 'daily_budget' => ''], '0.00', '0.00'],
    'null' => [['total_budget' => null, 'daily_budget' => null], '0.00', '0.00'],
    'total only' => [['total_budget' => '250.50'], '250.50', '0.00'],
    'daily only' => [['daily_budget' => '25.00'], '0.00', '25.00'],
    'explicit zero' => [['total_budget' => 0, 'daily_budget' => 0], '0.00', '0.00'],
]);

it('clears optional spending limits when editing a campaign', function () {
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $f['campaign']->update(['daily_budget' => '100.00']);

    $this->actingAs($user)->post(route('advertiser.campaign.update', $f['campaign']), [
        'name' => $f['campaign']->name, 'currency' => 'USD',
        'start_date' => now()->toDateString(), 'end_date' => now()->addMonth()->toDateString(),
        'total_budget' => '', 'daily_budget' => null,
    ])->assertSessionHasNoErrors()->assertSessionHas('success');
    expect($f['campaign']->fresh()->total_budget)->toBe('0.00')
        ->and($f['campaign']->fresh()->daily_budget)->toBe('0.00');
});

it('rejects invalid optional budgets on create and update', function (string $field, mixed $value) {
    Notification::fake();
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $input = ['name' => 'Invalid budget', 'currency' => 'USD',
        'start_date' => now()->toDateString(), 'end_date' => now()->addMonth()->toDateString(),
        $field => $value];
    $this->actingAs($user)->post(route('advertiser.campaign.store'), $input)->assertSessionHasErrors($field);
    $this->post(route('advertiser.campaign.update', $f['campaign']), $input)->assertSessionHasErrors($field);
    expect(Campaign::where('name', 'Invalid budget')->exists())->toBeFalse()
        ->and($f['campaign']->fresh()->total_budget)->toBe('1000.00');
})->with([
    'negative total' => ['total_budget', '-0.01'],
    'negative daily' => ['daily_budget', '-1'],
    'nonnumeric total' => ['total_budget', 'abc'],
    'nonnumeric daily' => ['daily_budget', 'abc'],
]);

it('confirms funded conversions when both campaign spending limits are unset', function () {
    $f = conversionFixture();
    $f['campaign']->update(['total_budget' => 0, 'daily_budget' => 0]);
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    expect($f['campaign']->fresh()->spent_amount)->toBe('10.00')
        ->and($f['advertiser']->fresh()->available_budget)->toBe('990.00');
});

it('binds an advertiser campaign to the signed-in profile and persists expanded country targeting', function () {
    Notification::fake();
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $foreign = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $countries = ['BEL', 'LUX', 'NLD'];

    $this->actingAs($user)->post(route('advertiser.campaign.store'), [
        'name' => 'Regional campaign', 'currency' => 'USD',
        'advertiser_id' => $foreign['advertiser']->id,
        'start_date' => now()->toDateString(), 'end_date' => now()->addMonth()->toDateString(),
        'geo_targeting' => json_encode(['countries' => $countries]),
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $campaign = Campaign::where('name', 'Regional campaign')->firstOrFail();
    expect($campaign->advertiser_id)->toBe($f['advertiser']->id)
        ->and($campaign->network_id)->toBe($f['network']->id)
        ->and($campaign->geo_targeting)->toBe(['countries' => $countries]);
    $this->get(route('advertiser.campaign.edit', $campaign))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('campaign.geo_targeting.countries', $countries));
});
