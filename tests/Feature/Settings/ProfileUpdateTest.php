<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->user_name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can close their account while retaining their record', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh()->status)->toBe('C');
    expect($user->fresh()->closed_at)->not->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('personal details and preferences can be updated without changing account privileges', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => $user->user_name, 'email' => $user->email,
        'first_name' => 'Jane', 'last_name' => 'Smith', 'title' => 'Director',
        'country_iso' => 'NLD', 'timezone' => 'Europe/Amsterdam', 'language' => 'nl',
        'is_super_admin' => true, 'status' => 'P', 'currency' => 'EUR',
    ])->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
    $user->refresh();
    expect($user->first_name)->toBe('Jane')->and($user->last_name)->toBe('Smith')
        ->and($user->title)->toBe('Director')->and($user->country_iso)->toBe('NLD')
        ->and($user->timezone)->toBe('Europe/Amsterdam')->and($user->language)->toBe('nl')
        ->and($user->is_super_admin)->toBeFalse()->and($user->status)->toBe('A')
        ->and($user->email_verified_at)->not->toBeNull();
});

test('invalid personal details do not partially save', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => $user->user_name, 'email' => $user->email,
        'first_name' => str_repeat('a', 31), 'last_name' => '',
        'title' => str_repeat('a', 51), 'country_iso' => 'NL',
        'timezone' => 'invalid', 'language' => 'unknown',
    ])->assertSessionHasErrors(['first_name', 'last_name', 'title', 'country_iso', 'timezone', 'language']);
    expect($user->fresh()->first_name)->toBe($user->first_name);
});
