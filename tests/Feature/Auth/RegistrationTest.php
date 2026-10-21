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
