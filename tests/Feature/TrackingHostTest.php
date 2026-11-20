<?php

use App\Models\Creative;
use App\Support\ReferralScript;
use App\Support\TrackingUrl;
use Illuminate\Http\Request;

it('uses the current host for tracking links when no tracking host is configured', function () {
    config(['tracking.url' => null]);
    expect(TrackingUrl::to('/t/abc'))->toBe(url('/t/abc'))->and(TrackingUrl::to('/'))->toBe(url('/').'/');
});

it('serves every generated link from the configured tracking host', function () {
    config(['tracking.url' => 'https://dm-l.ink/']);
    $f = conversionFixture();
    $assignment = $f['assignment'];
    $assignment->update(['tracking_link' => 'https://affiliates-nl.dmhub.cloud/t/abc-123']);
    $assignment = $assignment->fresh();
    expect(TrackingUrl::to('t/abc'))->toBe('https://dm-l.ink/t/abc')
        ->and($assignment->tracking_link)->toBe('https://dm-l.ink/t/abc-123')
        ->and($assignment->extractTrackingId())->toBe('abc-123')
        ->and($assignment->getEmbedScriptTag())->toStartWith('<script src="https://dm-l.ink/s/')
        ->and($assignment->getImpressionPixelUrl())->toStartWith('https://dm-l.ink/sp/')
        ->and($assignment->getCreativeTrackingUrl($f['creative'] ?? new Creative(['id' => 7])))->toStartWith('https://dm-l.ink/t/abc-123/c/')
        ->and(ReferralScript::forOffer(1, 2))->toContain('https:\/\/dm-l.ink\/api\/v1\/referrals');
});

it('still resolves a tracking click arriving on either domain', function () {
    config(['tracking.url' => 'https://dm-l.ink']);
    $f = conversionFixture();
    $f['assignment']->update(['tracking_link' => 'https://affiliates-nl.dmhub.cloud/t/either-host']);
    $f['offer']->update(['preview_url' => 'https://merchant.example/']);
    foreach (['https://dm-l.ink', 'https://affiliates-nl.dmhub.cloud'] as $host) {
        $this->get($host.'/t/either-host')->assertRedirectContains('https://merchant.example/');
    }
});

describe('client IP behind Cloudflare', function () {
    beforeEach(function () {
        Route::get('/_test/ip', fn (Request $request) => $request->ip());
    });
    $get = fn ($test, string $forwarded, ?string $cf) => $test->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])
        ->withHeaders(array_filter(['X-Forwarded-For' => $forwarded, 'CF-Connecting-IP' => $cf]))->get('/_test/ip');

    it('uses CF-Connecting-IP when the request came from a Cloudflare edge', function () use ($get) {
        $get($this, '173.245.48.5', '41.90.8.199')->assertContent('41.90.8.199');
        $get($this, '2606:4700::1', '2001:db8::7')->assertContent('2001:db8::7');
    });

    it('ignores CF-Connecting-IP from anything that is not Cloudflare', function () use ($get) {
        $get($this, '198.51.100.7', '41.90.8.199')->assertContent('198.51.100.7');
    });

    it('ignores a missing or malformed CF-Connecting-IP', function () use ($get) {
        $get($this, '173.245.48.5', null)->assertContent('173.245.48.5');
        $get($this, '173.245.48.5', 'not-an-ip')->assertContent('173.245.48.5');
    });
});
