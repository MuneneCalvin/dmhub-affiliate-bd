<?php

use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\PublisherEarning;
use Illuminate\Support\Facades\Schema;

it('automatically converts successful submissions without any contact storage', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $payload = conversionPayload($click);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated()
        ->assertJsonPath('commission_amount', '10.00')->assertJsonPath('commission_status', 'pending')
        ->assertJsonMissingPath('lead_id');
    $this->postJson('/api/v1/events', $payload)->assertOk()->assertJsonPath('duplicate', true);
    expect(Conversion::count())->toBe(1)->and(PublisherEarning::count())->toBe(1)
        ->and($click->fresh()->is_converted)->toBeTrue()
        ->and($f['advertiser']->fresh()->available_budget)->toBe('990.00');
    expect(Schema::hasTable('leads'))->toBeFalse()
        ->and(Schema::hasColumn('conversion_events', 'lead_id'))->toBeFalse()
        ->and(Schema::hasColumn('publisher_earnings', 'lead_id'))->toBeFalse();
});

it('rejects failed or malformed submissions without creating financial records', function (array $override) {
    $f = conversionFixture();
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, $override))->assertUnprocessable();
    expect(ConversionEvent::count())->toBe(0)->and(Conversion::count())->toBe(0)->and(PublisherEarning::count())->toBe(0)
        ->and($f['advertiser']->fresh()->available_budget)->toBe('1000.00')
        ->and($click->fresh()->is_converted)->toBeFalse();
})->with([
    'failed save' => [['successful' => false]],
    'missing success' => [['successful' => null]],
    'missing checks' => [['spam_checks' => null]],
    'incomplete checks' => [['spam_checks' => ['is_spam' => false]]],
    'invalid boolean' => [['spam_checks' => ['honeypot_filled' => 'false', 'form_duration_ms' => 5000, 'is_spam' => false]]],
]);

it('rejects contact details and arbitrary payloads without persisting them', function (array $override) {
    $f = conversionFixture();
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, $override))->assertUnprocessable();
    expect(ConversionEvent::count())->toBe(0)->and(PublisherEarning::count())->toBe(0);
})->with([
    [['email' => 'customer@example.com']], [['first_name' => 'Customer']], [['phone' => '+123456789']],
    [['form_data' => ['message' => 'private']]], [['custom_fields' => ['email' => 'private']]],
    [['lead_token' => 'old-token']], [['event_type' => 'lead']],
    [['spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false, 'email' => 'private']]],
]);

it('removes all lead capture CRM and postback routes', function (string $method, string $path) {
    $this->json($method, $path)->assertNotFound();
})->with([
    ['GET', '/leads/index'], ['GET', '/leads/show/1'], ['GET', '/lead/capture/1'],
    ['POST', '/lead/submit'], ['GET', '/lead/thank-you'], ['POST', '/api/v1/leads/submit'],
    ['POST', '/api/postback/lead'], ['POST', '/api/postback/lead/status'], ['POST', '/api/postback/lead/info'],
]);

it('stores timing evidence for configurable fraud rules without rejecting valid submissions', function () {
    config(['tracking.minimum_form_duration_ms' => 2000]);
    $f = conversionFixture();
    $payload = conversionPayload(conversionClick($f));
    $payload['spam_checks']['form_duration_ms'] = 1999;
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    expect(ConversionEvent::first()->fraud_signals['spam_checks']['form_duration_ms'])->toBe(1999);
    expect(PublisherEarning::first()->status)->toBe('pending');
});

it('allows distinct submissions from a referral but rejects changing attribution on a retry', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $other = conversionClick($f);
    $payload = conversionPayload($click);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $this->postJson('/api/v1/events', [...$payload, 'referral_id' => $other->referral_id])->assertConflict();
    $this->postJson('/api/v1/events', [...$payload, 'external_id' => 'submission:another'])->assertCreated();
    expect(PublisherEarning::count())->toBe(2);
});

it('canonicalizes spam signals on retries and rejects changed signals', function () {
    $f = conversionFixture();
    $payload = conversionPayload(conversionClick($f));
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $payload['spam_checks'] = ['is_spam' => 0, 'form_duration_ms' => '5000', 'honeypot_filled' => 0];
    $this->postJson('/api/v1/events', $payload)->assertOk()->assertJsonPath('duplicate', true);
    $payload['spam_checks']['form_duration_ms'] = 6000;
    $this->postJson('/api/v1/events', $payload)->assertConflict();
    $payload['spam_checks']['is_spam'] = true;
    $this->postJson('/api/v1/events', $payload)->assertConflict();
    expect(PublisherEarning::count())->toBe(1);
});

it('keeps purchase and action events independent of submission-only fields', function (string $type, string $event, string $amount) {
    $f = conversionFixture($type);
    $payload = conversionPayload(conversionClick($f), ['event_type' => $event, 'amount' => $amount]);
    unset($payload['successful'], $payload['spam_checks']);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    expect(PublisherEarning::count())->toBe(1);
})->with([['CPS', 'purchase', '100.00'], ['CPA', 'action', '0.00']]);
