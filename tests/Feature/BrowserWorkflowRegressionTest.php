<?php

use App\Models\Offer;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\FundingService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

it('returns field validation for a duplicate company number without creating an account', function (string $role) {
    Queue::fake();
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $profile = $role === 'advertiser' ? $f['advertiser'] : $f['publisher'];
    $profile->update(['coc_number' => 'COC123456']);
    $count = User::count();

    $this->post('/register', [
        'role_name' => $role, 'first_name' => 'New', 'last_name' => 'Account',
        'email' => 'duplicate-company@example.test', 'business_name' => 'New Business',
        'industry' => 'Retail', 'website_name' => 'http://127.0.0.1:8766', 'coc_number' => 'COC123456',
        'publisher_type' => 'company', 'channels' => [['type' => 'website', 'handle' => 'http://127.0.0.1:8766']],
    ])->assertSessionHasErrors('coc_number');

    expect(User::count())->toBe($count);
    Queue::assertNothingPushed();
})->with(['advertiser', 'publisher']);

it('preserves the guest locale and pending advertiser status on registration', function (string $locale) {
    Queue::fake();
    $this->seed(RolePermsSeeder::class);
    $this->withSession(['locale' => $locale])->withHeader('Accept-Language', 'nl-NL')->post('/register', [
        'role_name' => 'advertiser', 'first_name' => 'New', 'last_name' => 'Account',
        'email' => 'new-advertiser@example.test', 'business_name' => 'New Business',
        'industry' => 'Retail', 'website_name' => 'http://127.0.0.1:8766', 'coc_number' => 'COC123456',
    ])->assertSessionHasNoErrors();

    $user = User::where('email', 'new-advertiser@example.test')->firstOrFail();
    expect($user->locale)->toBe($locale)
        ->and($user->status)->toBe('P')
        ->and($user->advertiser->status)->toBe('P');
})->with(['en', 'nl']);

it('lets default advertiser and network roles create offers only in their tenant and follow the redirect', function (string $role) {
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $other = conversionFixture();
    $user = $f['advertiser']->user;
    if ($role === 'network_owner') {
        $user = User::factory()->create(['is_network' => true]);
        UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    }
    $user->assignRoleById(Role::findByName($role)->id);
    $response = $this->actingAs($user)->post(route('advertiser.offers.create', $f['campaign']->id), ['name' => 'Authorized offer']);
    $offer = Offer::where('name', 'Authorized offer')->firstOrFail();
    $response->assertSessionHasNoErrors()->assertRedirect(route('advertiser.offers.show', $offer));
    $this->get($response->headers->get('Location'))->assertOk();
    $this->post(route('advertiser.offers.create', $other['campaign']->id), ['name' => 'Foreign offer'])->assertNotFound();
    expect(Offer::where('name', 'Foreign offer')->exists())->toBeFalse();
})->with(['advertiser', 'network_owner']);

it('repairs existing advertiser permissions and pending profiles when migrated', function () {
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $f['advertiser']->user->update(['status' => 'P']);
    $role = Role::findByName('advertiser');
    $role->revokePermissionTo(['create_offers', 'manage_offers']);

    $migration = require database_path('migrations/2026_11_02_000002_fix_browser_workflows.php');
    $migration->up();
    $migration->up();

    expect($role->fresh()->hasPermissionTo('create_offers'))->toBeTrue()
        ->and($role->fresh()->hasPermissionTo('manage_offers'))->toBeTrue()
        ->and($f['advertiser']->fresh()->status)->toBe('P');
});

it('serializes campaign dates identically in advertiser and promoter details', function () {
    $this->seed(CurrencySeeder::class);
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $f['campaign']->update(['start_date' => '2026-11-01 21:00:00', 'end_date' => '2026-12-01 21:00:00']);
    $advertiser = $f['advertiser']->user;
    $advertiser->assignRoleById(Role::findByName('advertiser')->id);
    $promoter = $f['publisher']->user;
    $promoter->assignRoleById(Role::findByName('publisher')->id);

    foreach ([[$advertiser, route('advertiser.campaign.show', $f['campaign'])],
        [$promoter, route('publishers.my.campaign.show', $f['assignment']->id)]] as [$user, $url]) {
        $this->actingAs($user)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->where('overview.campaign.start_date', '2026-11-01T21:00:00.000000Z')
            ->where('overview.campaign.end_date', '2026-12-01T21:00:00.000000Z'));
    }
});

it('reports net funded budget after fees and unused funding returns without subtracting commissions', function () {
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture(); // $1,000 already funded with no fee.
    $other = conversionFixture(); // Another advertiser must not affect the total.
    $f['network']->update(['default_commission_value' => '8.00']);
    $funding = app(FundingService::class);
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $funding->deposit($f['advertiser'], '100.00', 'USD', 'budget-deposit', 'Test receipt', $user->id);
    $funding->refund($f['advertiser'], '20.00', 'USD', 'budget-refund', 'Test return', $user->id);
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();

    $this->actingAs($user)->get('/advertiser/dashboard')->assertInertia(fn (Assert $page) => $page
        ->where('stats.net_funded_budget', 1072)
        ->where('stats.available_budget', '1062.00'));
});
