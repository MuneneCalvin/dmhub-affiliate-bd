<?php

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\NetworkSeeder;
use Database\Seeders\RolePermsSeeder;
use Database\Seeders\SampleRolesSeeder;
use Database\Seeders\TestUsersSeeder;
use Database\Seeders\UsersSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

it('creates usable demo accounts with permissions and matching network profiles', function () {
    $this->seed(DatabaseSeeder::class);

    $network = Network::where('owner_email', 'admin@dmhub.com')->firstOrFail();
    $owner = User::where('email', 'network@dmhub.com')->firstOrFail();
    $advertiser = User::where('email', 'advertiser@dmhub.com')->firstOrFail();
    $publisher = User::where('email', 'publisher@dmhub.com')->firstOrFail();

    expect($network->default_commission_model)->toBe('P')
        ->and($network->settings)->toBeArray()
        ->and($owner->networkId())->toBe($network->id)
        ->and($owner->permissionNames())->toContain('create_offers')
        ->and($advertiser->advertiser->network_id)->toBe($network->id)
        ->and($advertiser->advertiser->status)->toBe('A')
        ->and($advertiser->permissionNames())->toContain('create_campaigns')
        ->and($publisher->publisher->network_id)->toBe($network->id)
        ->and($publisher->permissionNames())->toContain('view_conversions', 'view_embeded_scripts')
        ->and($publisher->permissionNames())->not->toContain('manage_leads');

    foreach ([$owner, $advertiser, $publisher] as $user) {
        expect($user->hasVerifiedEmail())->toBeTrue()
            ->and(Hash::check('Abcd1234!', $user->password))->toBeTrue();
    }
});

it('can rerun demo seeders without duplicates or resetting passwords and network settings', function () {
    $this->seed(UsersSeeder::class);
    $owner = User::where('email', 'network@dmhub.com')->firstOrFail();
    $owner->update(['password' => 'changed-password']);
    Network::firstOrFail()->update(['default_commission_value' => 12]);

    $this->seed(UsersSeeder::class);

    expect(User::count())->toBe(4)
        ->and(Network::count())->toBe(1)
        ->and(Advertiser::count())->toBe(1)
        ->and(Publisher::count())->toBe(1)
        ->and(DB::table('user_networks')->count())->toBe(3)
        ->and(DB::table('user_roles')->count())->toBe(4)
        ->and(Hash::check('changed-password', $owner->fresh()->password))->toBeTrue()
        ->and(Network::firstOrFail()->default_commission_value)->toBe('12.00');
});

it('repairs the legacy demo network formats without duplicating the network', function () {
    $this->seed(NetworkSeeder::class);
    $network = Network::firstOrFail();
    $network->update([
        'default_commission_model' => 'percentage',
        'settings' => json_encode(['allow_external_partners' => false, 'auto_approval' => true]),
    ]);

    $this->seed(NetworkSeeder::class);

    expect(Network::count())->toBe(1)
        ->and($network->fresh()->default_commission_model)->toBe('P')
        ->and($network->fresh()->settings)->toEqual(['allow_external_partners' => false, 'auto_approval' => true]);
});

it('does not reactivate closed demo accounts or recreate their role grants', function () {
    $this->seed(UsersSeeder::class);
    $user = User::where('email', 'advertiser@dmhub.com')->firstOrFail();
    $user->forceFill(['status' => 'C', 'closed_at' => now(), 'password' => 'closed-password'])->save();
    DB::table('user_roles')->where('user_id', $user->id)->delete();

    $this->seed(UsersSeeder::class);

    expect($user->fresh()->status)->toBe('C')
        ->and($user->fresh()->closed_at)->not->toBeNull()
        ->and(Hash::check('closed-password', $user->fresh()->password))->toBeTrue()
        ->and($user->fresh()->roles()->count())->toBe(0);
});

it('preserves closed bulk test accounts when adding the 200 demo users', function () {
    $user = User::factory()->create(['email' => 'testuser_001@example.test', 'status' => 'C', 'closed_at' => now()]);
    $password = $user->password;

    $this->seed(TestUsersSeeder::class);
    $this->seed(TestUsersSeeder::class);

    expect(User::count())->toBe(200)
        ->and($user->fresh()->status)->toBe('C')
        ->and($user->fresh()->password)->toBe($password)
        ->and(User::where('email', 'testuser_200@example.test')->firstOrFail()->hasVerifiedEmail())->toBeTrue();
});

it('keeps sample roles repeatable and scopes business role lookup to the web guard', function () {
    DB::table('roles')->insert(['name' => 'publisher', 'guard_name' => 'api']);
    DB::table('permissions')->insert(['name' => 'view_conversions', 'guard_name' => 'api']);

    $this->seed(SampleRolesSeeder::class);
    $this->seed(SampleRolesSeeder::class);
    $this->seed(RolePermsSeeder::class);

    expect(DB::table('sample_roles')->count())->toBe(4)
        ->and(DB::table('roles')->where('name', 'publisher')->count())->toBe(2)
        ->and(DB::table('permissions')->where('name', 'view_conversions')->count())->toBe(2);
});

it('blocks each demo data entry point in production', function (string $seeder) {
    app()->detectEnvironment(fn () => 'production');

    expect(fn () => app($seeder)->__invoke())->toThrow(RuntimeException::class)
        ->and(User::count())->toBe(0)
        ->and(Network::count())->toBe(0);
})->with([NetworkSeeder::class, UsersSeeder::class, TestUsersSeeder::class]);
