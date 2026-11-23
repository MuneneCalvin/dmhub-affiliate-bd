<?php

use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\User;
use Database\Seeders\RolePermsSeeder;

beforeEach(fn () => $this->seed(RolePermsSeeder::class));

function publisherInput(array $override = []): array
{
    return array_merge([
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'email' => 'anna@example.nl', 'role_name' => 'publisher',
        'publisher_type' => 'company', 'business_name' => 'Voorbeeld BV', 'industry' => 'media', 'coc_number' => '12345678',
        'channels' => [['type' => 'website', 'handle' => 'https://voorbeeld.example.nl']],
    ], $override);
}

function registered(): Publisher
{
    return Publisher::whereHas('user', fn ($q) => $q->where('email', 'anna@example.nl'))->firstOrFail();
}

it('registers a company with its channels and keeps its company details', function () {
    $this->post(route('register.store'), publisherInput(['channels' => [
        ['type' => 'website', 'handle' => 'https://voorbeeld.example.nl'], ['type' => 'newsletter', 'handle' => 'Pensioen Weekly'],
    ]]))->assertSessionHasNoErrors();

    $publisher = registered();
    expect($publisher->publisher_type)->toBe('company')
        ->and($publisher->business_name)->toBe('Voorbeeld BV')
        ->and($publisher->coc_number)->toBe('12345678')
        ->and($publisher->website_url)->toBe('https://voorbeeld.example.nl')
        ->and($publisher->channels->map->only(['type', 'handle'])->all())->toBe([
            ['type' => 'website', 'handle' => 'https://voorbeeld.example.nl'], ['type' => 'newsletter', 'handle' => 'Pensioen Weekly'],
        ]);
});

it('registers an individual who has no company, CoC number or industry', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'email' => 'anna@example.nl', 'role_name' => 'publisher',
        'publisher_type' => 'individual',
        'channels' => [['type' => 'instagram', 'handle' => '@anna.spaart'], ['type' => 'tiktok', 'handle' => 'https://www.tiktok.com/@anna']],
    ])->assertSessionHasNoErrors();

    $publisher = registered();
    expect($publisher->publisher_type)->toBe('individual')
        ->and($publisher->business_name)->toBeNull()
        ->and($publisher->industry)->toBeNull()
        ->and($publisher->coc_number)->toBeNull()
        ->and($publisher->website_url)->toBeNull()
        ->and($publisher->channels)->toHaveCount(2)
        ->and($publisher->user->status)->toBe('P');
});

it('ignores company details an individual sends along', function () {
    $this->post(route('register.store'), publisherInput(['publisher_type' => 'individual']))->assertSessionHasNoErrors();

    expect(registered())->business_name->toBeNull()->coc_number->toBeNull()->industry->toBeNull();
});

it('lets several individuals register without a CoC number', function () {
    foreach (['a', 'b'] as $i => $name) {
        $this->post(route('register.store'), [
            'first_name' => 'Anna', 'last_name' => $name, 'email' => "{$name}@example.nl", 'role_name' => 'publisher',
            'publisher_type' => 'individual', 'channels' => [['type' => 'youtube', 'handle' => "@{$name}"]],
        ])->assertSessionHasNoErrors();
        // Registering signs the partner in; the next visitor is someone else.
        auth()->logout();
    }

    expect(Publisher::where('publisher_type', 'individual')->count())->toBe(2);
});

it('still requires a company to give its company details', function (string $field) {
    $this->post(route('register.store'), publisherInput([$field => '']))->assertSessionHasErrors($field);

    expect(User::where('email', 'anna@example.nl')->exists())->toBeFalse();
})->with(['business_name', 'industry', 'coc_number']);

it('refuses a publisher without a type or without any channel', function (array $override, string $error) {
    $this->post(route('register.store'), publisherInput($override))->assertSessionHasErrors($error);

    expect(User::where('email', 'anna@example.nl')->exists())->toBeFalse();
})->with([
    'no type' => [['publisher_type' => null], 'publisher_type'],
    'unknown type' => [['publisher_type' => 'agency'], 'publisher_type'],
    'no channels' => [['channels' => []], 'channels'],
    'channels missing' => [['channels' => null], 'channels'],
]);

it('refuses channels that are unknown, repeated or empty', function (array $channels, string $error) {
    $this->post(route('register.store'), publisherInput(['channels' => $channels]))->assertSessionHasErrors($error);

    expect(Publisher::count())->toBe(0);
})->with([
    'unknown type' => [[['type' => 'myspace', 'handle' => '@anna']], 'channels.0.type'],
    'same type twice' => [[['type' => 'instagram', 'handle' => '@a'], ['type' => 'instagram', 'handle' => '@b']], 'channels.0.type'],
    'no handle' => [[['type' => 'instagram', 'handle' => '']], 'channels.0.handle'],
    'too long' => [[['type' => 'other', 'handle' => str_repeat('a', 256)]], 'channels.0.handle'],
]);

it('wants a web address for a website or comparison site', function (string $type, string $handle, bool $ok) {
    $response = $this->post(route('register.store'), publisherInput(['channels' => [['type' => $type, 'handle' => $handle]]]));

    $ok ? $response->assertSessionHasNoErrors() : $response->assertSessionHasErrors('channels.0.handle');
})->with([
    'website url' => ['website', 'https://voorbeeld.example.nl/blog', true],
    'website name only' => ['website', 'voorbeeld', false],
    'website not http' => ['website', 'ftp://voorbeeld.example.nl', false],
    'comparison url' => ['comparison_site', 'https://vergelijk.example.nl', true],
    'comparison name' => ['comparison_site', 'vergelijk.nl', false],
]);

it('takes a URL or an account name for the other channels, but not a broken URL', function (string $type, string $handle, bool $ok) {
    $response = $this->post(route('register.store'), publisherInput(['channels' => [['type' => $type, 'handle' => $handle]]]));

    $ok ? $response->assertSessionHasNoErrors() : $response->assertSessionHasErrors('channels.0.handle');
})->with([
    'instagram handle' => ['instagram', '@anna.spaart', true],
    'facebook page url' => ['facebook', 'https://www.facebook.com/anna', true],
    'newsletter name' => ['newsletter', 'Pensioen Weekly', true],
    'other free text' => ['other', 'Mijn podcast', true],
    'broken url' => ['youtube', 'https://', false],
    'not a web scheme' => ['tiktok', 'javascript://alert(1)', false],
    'www without scheme' => ['facebook', 'www.facebook.com/anna', false],
]);

it('leaves advertiser sign-up exactly as it was', function () {
    $this->post(route('register.store'), [
        'first_name' => 'Piet', 'last_name' => 'Jansen', 'email' => 'piet@example.nl', 'role_name' => 'advertiser',
        'business_name' => 'Adviesbureau BV', 'industry' => 'finance', 'coc_number' => '87654321', 'website_name' => 'https://advies.example.nl',
        'publisher_type' => 'individual', 'channels' => [['type' => 'website', 'handle' => 'https://x.example']],
    ])->assertSessionHasNoErrors();

    expect(Advertiser::count())->toBe(1)->and(Publisher::count())->toBe(0);
    auth()->logout();
    $this->post(route('register.store'), [
        'first_name' => 'Kees', 'last_name' => 'Bakker', 'email' => 'kees@example.nl', 'role_name' => 'advertiser',
    ])->assertSessionHasErrors(['business_name', 'industry', 'coc_number']);
});
