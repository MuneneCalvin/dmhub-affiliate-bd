<?php

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\URL;

function bootWith(string $env, string $appUrl): string
{
    app()->detectEnvironment(fn () => $env);
    config(['app.url' => $appUrl]);
    URL::forceScheme(null);
    app()->getProvider(AppServiceProvider::class)->boot();

    return url('/dashboard');
}

it('forces https in production when APP_URL is https', function () {
    expect(bootWith('production', 'https://affiliates.example.com'))->toStartWith('https://');
});

it('keeps http in production when APP_URL is http (IP-only staging)', function () {
    expect(bootWith('production', 'http://203.0.113.10'))->toStartWith('http://');
});

it('does not force https outside production', function () {
    expect(bootWith('local', 'https://affiliates.example.com'))->toStartWith('http://');
});
