<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

it('sets a chosen password on a demo account', function () {
    $user = User::factory()->create(['email' => 'bnd.adviseur@demo.dmhub.cloud']);

    $this->artisan('demo:set-password', ['email' => $user->email, '--force' => true])
        ->expectsQuestion('New password (not shown)', 'Zomer-2026-Pensioen!')
        ->expectsQuestion('Repeat the password', 'Zomer-2026-Pensioen!')
        ->assertSuccessful();

    expect(Hash::check('Zomer-2026-Pensioen!', $user->fresh()->password))->toBeTrue();
});

it('refuses accounts that are not demo accounts', function () {
    $user = User::factory()->create(['email' => 'real.person@example.nl']);
    $before = $user->password;

    $this->artisan('demo:set-password', ['email' => $user->email, '--force' => true])->assertFailed();

    expect($user->fresh()->password)->toBe($before);
});

it('refuses a short password and one typed differently the second time', function () {
    $user = User::factory()->create(['email' => 'creator@demo.dmhub.cloud']);
    $before = $user->password;

    $this->artisan('demo:set-password', ['email' => $user->email, '--force' => true])
        ->expectsQuestion('New password (not shown)', 'kort')
        ->assertFailed();
    $this->artisan('demo:set-password', ['email' => $user->email, '--force' => true])
        ->expectsQuestion('New password (not shown)', 'Zomer-2026-Pensioen!')
        ->expectsQuestion('Repeat the password', 'Anders-2026-Pensioen!')
        ->assertFailed();

    expect($user->fresh()->password)->toBe($before);
});

it('tells you when the account does not exist', function () {
    $this->artisan('demo:set-password', ['email' => 'nobody@demo.dmhub.cloud', '--force' => true])->assertFailed();
});
