<?php

use App\Models\Network;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\UsersSeeder;
use Illuminate\Support\Facades\DB;

function asProduction(): void
{
    app()->detectEnvironment(fn () => 'production');
}

// Invoke seeders directly: `db:seed` would ask for confirmation in a production environment.
function runSeeder(string $class): void
{
    app($class)->__invoke();
}

it('seeds only reference data in production, never demo users or networks', function () {
    asProduction();

    runSeeder(DatabaseSeeder::class);

    expect(User::count())->toBe(0);
    expect(Network::count())->toBe(0);
    expect(DB::table('roles')->where('name', 'super_admin')->exists())->toBeTrue();
    expect(DB::table('countries')->count())->toBeGreaterThan(100);
    expect(DB::table('currencies')->count())->toBeGreaterThan(0);
});

it('seeds the demo admin outside production', function () {
    runSeeder(DatabaseSeeder::class);

    $admin = User::where('email', 'test@test.com')->first();

    expect($admin)->not->toBeNull();
    expect($admin->is_super_admin)->toBeTrue();
});

it('can be seeded repeatedly without duplicating reference data', function () {
    asProduction();

    runSeeder(DatabaseSeeder::class);
    $countries = DB::table('countries')->count();
    $roles = DB::table('roles')->count();
    $currencies = DB::table('currencies')->count();

    runSeeder(DatabaseSeeder::class);

    expect(DB::table('countries')->count())->toBe($countries);
    expect(DB::table('roles')->count())->toBe($roles);
    expect(DB::table('currencies')->count())->toBe($currencies);
});

it('refuses to seed demo users in production', function () {
    asProduction();

    expect(fn () => runSeeder(UsersSeeder::class))->toThrow(RuntimeException::class);
    expect(User::count())->toBe(0);
});

it('creates a super admin with the role through app:create-admin', function () {
    asProduction();
    runSeeder(DatabaseSeeder::class);

    $this->artisan('app:create-admin', ['email' => 'owner@client.test'])
        ->expectsQuestion('First name', 'Client')
        ->expectsQuestion('Last name', 'Owner')
        ->expectsQuestion('Password (min. 12 characters)', 'a-long-secure-pass')
        ->expectsQuestion('Confirm password', 'a-long-secure-pass')
        ->assertSuccessful();

    $admin = User::where('email', 'owner@client.test')->first();

    expect($admin->is_super_admin)->toBeTrue();
    expect($admin->status)->toBe('A');
    expect($admin->email_verified_at)->not->toBeNull();
    expect(DB::table('user_roles')->where('user_id', $admin->id)->count())->toBe(1);
    expect(password_verify('a-long-secure-pass', $admin->password))->toBeTrue();
});

it('rejects short or mismatched admin passwords', function () {
    runSeeder(DatabaseSeeder::class);

    $this->artisan('app:create-admin', ['email' => 'short@client.test', '--first-name' => 'A', '--last-name' => 'B'])
        ->expectsQuestion('Password (min. 12 characters)', 'short')
        ->expectsQuestion('Confirm password', 'short')
        ->assertFailed();

    $this->artisan('app:create-admin', ['email' => 'mismatch@client.test', '--first-name' => 'A', '--last-name' => 'B'])
        ->expectsQuestion('Password (min. 12 characters)', 'a-long-secure-pass')
        ->expectsQuestion('Confirm password', 'different-secure-pass')
        ->assertFailed();

    expect(User::whereIn('email', ['short@client.test', 'mismatch@client.test'])->count())->toBe(0);
});
