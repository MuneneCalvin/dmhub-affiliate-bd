<?php

use App\Models\Clicks;
use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\PublisherEarning;
use App\Services\Finance\FundingService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

it('requires authenticated merchant confirmation and immutable event identities', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $payload = conversionPayload($click);
    $this->postJson('/api/v1/events', $payload)->assertUnauthorized();
    $this->withToken($f['assignment']->script_token)->postJson('/api/v1/events', $payload)->assertUnauthorized();
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $this->postJson('/api/v1/events', array_merge($payload, ['amount' => '1.00']))->assertConflict();
    $this->postJson('/api/v1/events', array_merge($payload, ['event_type' => 'action']))->assertConflict();
    expect(PublisherEarning::count())->toBe(1);
});

it('pays distinct orders from one referral and uses the assigned event-specific commission', function (string $type, string $event, string $basis, string $expected) {
    $f = conversionFixture($type, '12.50');
    $click = conversionClick($f);
    $payload = conversionPayload($click, ['event_type' => $event, 'external_id' => 'order-1', 'amount' => $basis]);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated()->assertJsonPath('commission_amount', $expected);
    $this->postJson('/api/v1/events', $payload)->assertOk()->assertJsonPath('duplicate', true);
    $this->postJson('/api/v1/events', array_merge($payload, ['external_id' => 'order-2']))->assertCreated();
    expect(PublisherEarning::count())->toBe(2)->and(Conversion::count())->toBe(2);
    expect($f['assignment']->fresh()->total_conversions)->toBe(2);
    expect(ConversionEvent::first()->attribution)->toMatchArray(['policy' => 'last_eligible_referral_v1', 'publisher_id' => $f['publisher']->id]);
})->with([
    ['CPS', 'purchase', '99.99', '12.50'], ['RevShare', 'purchase', '20.00', '2.50'],
    ['Flat', 'purchase', '20.00', '12.50'], ['CPA', 'action', '0.00', '12.50'],
    ['Flat', 'action', '0.00', '12.50'],
]);

it('scopes event identity and referral access to the authenticated advertiser', function () {
    $own = conversionFixture();
    $other = conversionFixture();
    $click = conversionClick($own);
    $foreign = conversionClick($other);
    $this->withToken($own['token'])->postJson('/api/v1/events', conversionPayload($foreign))->assertNotFound();
    $this->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    $this->withToken($other['token'])->postJson('/api/v1/events', conversionPayload($foreign))->assertCreated();
    expect(ConversionEvent::count())->toBe(2);
});

it('rejects invalid, unconfirmed and contradictory event payloads', function (array $override) {
    $f = conversionFixture();
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, $override))->assertUnprocessable();
    expect(ConversionEvent::count())->toBe(0);
})->with([
    [['status' => 'failed']], [['event_type' => 'refund']], [['amount' => '-1.00']],
    [['amount' => '1.001']], [['amount' => '1e2']], [['currency' => 'EUR']],
    [['occurred_at' => '2026-10-29 10:00:00']], [['occurred_at' => '2099-01-01T00:00:00Z']],
    [['custom_fields' => ['password' => 'private']]], [['password' => 'private']],
    [['click_id' => 99999]], [['event_type' => 'purchase']],
    [['event_type' => 'purchase', 'amount' => '0.00']],
]);

it('enforces referral expiry, event windows and late receipt without changing click snapshots', function () {
    $this->freezeTime();
    $f = conversionFixture('CPS');
    $click = conversionClick($f);
    $payload = conversionPayload($click, ['event_type' => 'purchase', 'amount' => '100.00']);
    $f['offer']->update(['conversion_window_hours' => 10000, 'click_cookie_lifetime_hours' => 10000]);
    $this->travel(25)->hours();
    $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertUnprocessable();
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $this->travel(48)->hours();
    $payload['external_id'] = 'late-order';
    $this->postJson('/api/v1/events', $payload)->assertUnprocessable();
    // A true retry succeeds even after expiry and budget exhaustion.
    $payload['external_id'] = 'submission:merchant-1';
    $f['advertiser']->update(['available_budget' => 0]);
    $this->postJson('/api/v1/events', $payload)->assertOk()->assertJsonPath('duplicate', true);
});

it('applies status and date restrictions to links, scripts, capture and merchant events', function (string $condition) {
    $f = conversionFixture();
    $click = conversionClick($f);
    match ($condition) {
        'campaign inactive' => $f['campaign']->update(['campaign_status' => 'P']),
        'offer inactive' => $f['offer']->update(['offer_status' => 'P']),
        'campaign expired' => $f['campaign']->update(['end_date' => now()->subSecond()]),
        'campaign future' => $f['campaign']->update(['start_date' => now()->addDay()]),
        'offer expired' => $f['offer']->update(['expires_at' => now()->subSecond()]),
        'publisher suspended' => $f['publisher']->user->update(['status' => 'P']),
        'network suspended' => $f['network']->update(['status' => 'P']),
        'assignment terminated' => $f['assignment']->update(['terminated_at' => now()]),
    };
    foreach ([$f['assignment']->tracking_link, $f['assignment']->getScriptUrl()] as $url) {
        expect($this->get($url)->status())->toBeIn([403, 422]);
    }
    expect($this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->status())->toBeIn([403, 422]);
    expect(PublisherEarning::count())->toBe(0);
})->with(['campaign inactive', 'offer inactive', 'campaign expired', 'campaign future', 'offer expired', 'publisher suspended', 'network suspended', 'assignment terminated']);

it('reserves funds atomically and rolls back over-budget events completely', function (string $cap) {
    $f = conversionFixture('Flat');
    $click = conversionClick($f);
    match ($cap) {
        'advertiser' => app(FundingService::class)->refund($f['advertiser'], '990.00', 'USD', 'cap-test', 'Test refund', $f['advertiser']->user_id),
        'campaign' => $f['campaign']->update(['total_budget' => '10.00']),
        'daily' => $f['campaign']->update(['daily_budget' => '10.00']),
    };
    $payload = conversionPayload($click, ['event_type' => 'action']);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $this->postJson('/api/v1/events', array_merge($payload, ['external_id' => 'over-cap']))->assertUnprocessable();
    $this->postJson('/api/v1/events', $payload)->assertOk();
    expect(PublisherEarning::count())->toBe(1)->and(ConversionEvent::count())->toBe(1);
    expect($f['campaign']->fresh()->spent_amount)->toBe('10.00');
    expect($f['assignment']->fresh()->total_conversions)->toBe(1);
})->with(['advertiser', 'campaign', 'daily']);

it('rejects a commission larger than remaining funds without partial writes', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $f['advertiser']->update(['available_budget' => '9.99']);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertUnprocessable();
    expect(Conversion::count())->toBe(0)->and(ConversionEvent::count())->toBe(0)->and(PublisherEarning::count())->toBe(0);
    expect($f['advertiser']->fresh()->available_budget)->toBe('9.99');
});

it('captures dynamic traffic references and enforces source and device restrictions', function () {
    $f = conversionFixture();
    $f['offer']->update(['allowed_traffic_sources' => ['email'], 'prohibited_traffic_sources' => ['incentive']]);
    $this->get($f['assignment']->tracking_link.'?traffic_source=incentive')->assertUnprocessable();
    $this->get($f['assignment']->tracking_link.'?traffic_source=email&sub=mail-42')->assertRedirect();
    $click = Clicks::firstOrFail();
    expect($click->sub_id)->toBe('mail-42')->and($click->traffic_source)->toBe('email');
    $f['campaign']->update(['device_targeting' => ['mobile']]);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertUnprocessable();
});

it('allows multiple visitors in the same second and exposes only opaque referral metadata', function () {
    $this->freezeTime();
    $f = conversionFixture();
    $this->get($f['assignment']->tracking_link)->assertRedirect();
    $this->get($f['assignment']->tracking_link)->assertRedirect();
    expect(Clicks::count())->toBe(2);
    $click = Clicks::firstOrFail();
    $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertOk()->assertExactJson([
        'referral_id' => $click->referral_id, 'click_id' => $click->id,
        'campaign_id' => $click->campaign_id, 'offer_id' => $click->offer_id,
        'clicked_at' => $click->clicked_at->toISOString(), 'expires_at' => $click->referral_expires_at->toISOString(),
    ]);
});

it('persists referrals across pages and publishers in the actual served JavaScript', function () {
    $f = conversionFixture();
    $response = $this->get($f['assignment']->getScriptUrl())->assertOk();
    $process = new Process(['node', base_path('tests/js/referral-persistence.mjs')]);
    $process->setInput($response->getContent());
    $process->mustRun();
    expect(trim($process->getOutput()))->toBe('ok');
});

it('enforces database event and earning uniqueness independently of controller lookups', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    $event = ConversionEvent::firstOrFail();
    expect(fn () => DB::transaction(fn () => $event->replicate()->save()))->toThrow(QueryException::class);
    $earning = PublisherEarning::firstOrFail();
    expect(fn () => DB::transaction(fn () => $earning->replicate()->save()))->toThrow(QueryException::class);
    expect(PublisherEarning::count())->toBe(1)->and(ConversionEvent::count())->toBe(1);
});

it('resets the daily reservation cap on the next UTC day', function () {
    $this->freezeTime();
    $f = conversionFixture('Flat');
    $f['campaign']->update(['daily_budget' => '10.00']);
    $click = conversionClick($f);
    $first = conversionPayload($click, ['event_type' => 'action']);
    $this->withToken($f['token'])->postJson('/api/v1/events', $first)->assertCreated();
    $this->travel(1)->days();
    $second = conversionPayload($click, ['event_type' => 'action', 'external_id' => 'tomorrow']);
    $this->postJson('/api/v1/events', $second)->assertCreated();
    expect(PublisherEarning::count())->toBe(2);
});

it('caps browser referrals by the conversion window even when cookie lifetime is longer', function () {
    $this->freezeTime();
    $f = conversionFixture();
    $f['offer']->update(['conversion_window_hours' => 1, 'click_cookie_lifetime_hours' => 24]);
    $click = conversionClick($f);
    $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertOk()
        ->assertJsonPath('expires_at', $click->conversion_expires_at->toISOString());
    $this->travel(2)->hours();
    $this->getJson('/api/v1/referrals/'.$click->referral_id)->assertUnprocessable();
});
