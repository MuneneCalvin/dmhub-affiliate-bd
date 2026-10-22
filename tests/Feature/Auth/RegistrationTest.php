<?php

use App\Models\User;
use Database\Seeders\RolePermsSeeder;

test('registration screen can be rendered', function () {
    $this->get(route('register'))->assertStatus(200);
});

test('new publishers can register and wait for approval', function () {
    $this->seed(RolePermsSeeder::class);

    $this->post(route('register.store'), [
        'first_name' => 'Test',
        'last_name' => 'Publisher',
        'role_name' => 'publisher',
        'email' => 'new-publisher@example.test',
        'coc_number' => '12345678',
        'business_name' => 'Test BV',
        'website_name' => 'https://publisher.example.test',
        'industry' => 'retail',
    ]);

    $user = User::where('email', 'new-publisher@example.test')->first();

    expect($user)->not->toBeNull();
    expect($user->is_publisher)->toBeTrue();
    expect($user->status)->toBe('P');
    expect($user->publisher)->not->toBeNull();
});

test('registration rejects privileged or unknown roles', function () {
    $this->seed(RolePermsSeeder::class);

    $this->post(route('register.store'), [
        'first_name' => 'Evil',
        'last_name' => 'User',
        'role_name' => 'super_admin',
        'email' => 'evil@example.test',
        'coc_number' => '1',
        'business_name' => 'X',
        'industry' => 'x',
    ])->assertSessionHasErrors('role_name');

    expect(User::where('email', 'evil@example.test')->exists())->toBeFalse();
});

test('registration with an already used CoC number is a validation error, not a server error', function (string $role) {
    $this->seed(RolePermsSeeder::class);
    $payload = fn (string $email) => [
        'first_name' => 'Dup', 'last_name' => 'Test', 'role_name' => $role, 'email' => $email,
        'coc_number' => '12345678', 'business_name' => 'Dup BV', 'website_name' => 'https://dup.example.test', 'industry' => 'retail',
    ];

    $this->post(route('register.store'), $payload('first@example.test'));
    auth()->logout();
    $this->post(route('register.store'), $payload('second@example.test'))->assertSessionHasErrors('coc_number');

    expect(User::where('email', 'second@example.test')->exists())->toBeFalse();
})->with(['publisher', 'advertiser']);

test('registration rejects a CoC number longer than the column allows', function () {
    $this->seed(RolePermsSeeder::class);

    $this->post(route('register.store'), [
        'first_name' => 'Long', 'last_name' => 'Coc', 'role_name' => 'publisher', 'email' => 'long@example.test',
        'coc_number' => '12345678901', 'business_name' => 'Long BV', 'industry' => 'retail',
    ])->assertSessionHasErrors('coc_number');
});
