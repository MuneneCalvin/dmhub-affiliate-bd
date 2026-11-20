<?php

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\User;
use Spatie\Permission\Models\Role;

function reviewAdmin(): User
{
    return User::factory()->create(['is_super_admin' => true, 'status' => 'A', 'email_verified_at' => now()]);
}

function reviewNetwork(): Network
{
    return Network::forceCreate([
        'network_name' => 'Review Network', 'owner_email' => 'owner@review.example', 'default_currency' => 'EUR',
        'pay_day_of_week' => 3, 'status' => 'A',
    ]);
}

function advertiserForm(Network $network, array $overrides = []): array
{
    return array_merge([
        'business_name' => 'Shop BV', 'coc_number' => '12345678', 'website_name' => 'https://shop.example',
        'industry' => 'retail', 'first_name' => 'Sam', 'last_name' => 'Shop', 'role_name' => 'advertiser',
        'currency_code' => 'EUR', 'network_id' => $network->id, 'email' => 'sam@shop.example',
    ], $overrides);
}

it('marks accounts created by an administrator as email verified so tracking is not locked out', function () {
    Role::create(['name' => 'advertiser', 'guard_name' => 'web']);
    $network = reviewNetwork();

    $this->actingAs(reviewAdmin())->post('/advertisers/store', advertiserForm($network));

    expect(User::where('email', 'sam@shop.example')->first()?->hasVerifiedEmail())->toBeTrue();
});

it('rejects an over-long or duplicate CoC number when an administrator creates an advertiser', function () {
    Role::create(['name' => 'advertiser', 'guard_name' => 'web']);
    $network = reviewNetwork();
    $admin = reviewAdmin();

    $this->actingAs($admin)->post('/advertisers/store', advertiserForm($network, ['coc_number' => '12345678901']))
        ->assertSessionHasErrors('coc_number');

    $this->actingAs($admin)->post('/advertisers/store', advertiserForm($network));
    $this->actingAs($admin)->post('/advertisers/store', advertiserForm($network, ['email' => 'other@shop.example']))
        ->assertSessionHasErrors('coc_number');

    expect(Advertiser::where('coc_number', '12345678')->count())->toBe(1);
});

it('throttles the unauthenticated revision endpoint', function () {
    foreach (range(1, 30) as $_) {
        $this->getJson('/up/revision')->assertOk();
    }

    $this->getJson('/up/revision')->assertStatus(429);
});
