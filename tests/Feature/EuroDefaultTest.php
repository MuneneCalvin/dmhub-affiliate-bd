<?php

use App\Models\Advertiser;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

it('names the euro as the platform default currency, and it is one the platform settles in', function () {
    expect(config('finance.default_currency'))->toBe('EUR')
        ->and(config('finance.currencies'))->toContain(config('finance.default_currency'));
});

it('gives a self-registered advertiser euros', function () {
    $this->seed(RolePermsSeeder::class);

    $this->post(route('register.store'), [
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'role_name' => 'advertiser', 'email' => 'anna@example.nl',
        'coc_number' => '12345678', 'business_name' => 'Voorbeeld BV', 'website_name' => 'https://voorbeeld.example.nl',
        'industry' => 'finance',
    ])->assertSessionHasNoErrors();

    expect(Advertiser::whereHas('user', fn ($q) => $q->where('email', 'anna@example.nl'))->value('currency'))->toBe('EUR');
});

it('defaults the currency column to euro where money is first recorded', function (string $table) {
    $default = collect(Schema::getColumns($table))->firstWhere('name', 'currency')['default'] ?? '';

    expect($default)->toContain('EUR')->not->toContain('USD');
})->with(['advertisers', 'network_earnings', 'network_invoices', 'publisher_invoices']);

// SQLite rebuilds the table to change a default and cannot do that with rows inside the test transaction;
// the production database (Postgres) changes only the default, which this proves.
it('leaves existing currencies alone when the defaults change', function () {
    $f = conversionFixture();
    $f['advertiser']->forceFill(['currency' => 'USD'])->save();

    $migration = require database_path('migrations/2026_11_24_000001_default_currency_to_eur.php');
    $migration->up();

    expect($f['advertiser']->fresh()->currency)->toBe('USD')
        ->and($f['campaign']->fresh()->currency)->toBe('USD');
})->skip(fn () => DB::getDriverName() === 'sqlite', 'SQLite rebuilds tables to change a default');
