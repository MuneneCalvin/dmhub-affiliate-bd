<?php

use App\Models\User;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\App;

beforeEach(function () {
    // The suite's own default is not Dutch; production's is.
    config(['app.locale' => 'nl']);
});

it('shows Dutch to a guest whose browser asks for English', function () {
    $this->withHeader('Accept-Language', 'en-US,en;q=0.9')->get('/login')
        ->assertInertia(fn ($page) => $page->where('locale.current', 'nl'));

    expect(App::getLocale())->toBe('nl');
});

it('shows English once the visitor chose English', function () {
    $this->withUnencryptedCookie('locale', 'en')->withHeader('Accept-Language', 'nl-NL')->get('/login')
        ->assertInertia(fn ($page) => $page->where('locale.current', 'en'));
});

it('keeps a switched language across pages of the same session', function () {
    $this->withSession(['locale' => 'en'])->get('/login')->assertInertia(fn ($page) => $page->where('locale.current', 'en'));
    $this->get('/register')->assertInertia(fn ($page) => $page->where('locale.current', 'en'));
});

it('keeps the saved language of a signed-in user whatever the cookie says', function () {
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)->withUnencryptedCookie('locale', 'nl')->get('/settings/profile')
        ->assertInertia(fn ($page) => $page->where('locale.current', 'en'));
});

it('falls back to Dutch for a language the platform does not offer', function () {
    $this->withUnencryptedCookie('locale', 'de')->get('/login')
        ->assertInertia(fn ($page) => $page->where('locale.current', 'nl'));
});

it('stores Dutch for a new partner whose browser asks for English', function () {
    $this->seed(RolePermsSeeder::class);

    $this->withHeader('Accept-Language', 'en-GB,en;q=0.8')->post(route('register.store'), [
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'role_name' => 'publisher', 'email' => 'anna@example.nl',
        'publisher_type' => 'company', 'channels' => [['type' => 'website', 'handle' => 'https://publisher.example.test']],
        'coc_number' => '12345678', 'business_name' => 'Voorbeeld BV', 'industry' => 'retail',
    ]);

    expect(User::where('email', 'anna@example.nl')->value('locale'))->toBe('nl');
});
