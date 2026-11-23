<?php

use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Models\PublisherEarning;

const FORM_ORIGIN = 'https://merchant.example';

function formUrl(array $f, ?string $key = null): string
{
    return '/lf/'.($key ?? $f['offer']->fresh()->lead_form_key);
}

function formBody($click, array $overrides = []): array
{
    return array_merge([
        'referral_id' => $click->referral_id, 'email' => 'anna@example.nl', 'first_name' => 'Anna', 'last_name' => 'de Vries',
        'phone' => '+31201234567', 'consent' => true, 'hp' => '', 'duration_ms' => 6000,
    ], $overrides);
}

function submitForm($test, array $f, array $body, ?string $origin = FORM_ORIGIN, ?string $key = null)
{
    return $test->postJson(formUrl($f, $key), $body, $origin ? ['Origin' => $origin] : []);
}

it('creates the consented lead, the event and the earning', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    submitForm($this, $f, formBody($click))->assertCreated()
        ->assertJson(['success' => true, 'duplicate' => false])
        ->assertHeader('Access-Control-Allow-Origin', FORM_ORIGIN);

    $lead = LeadContact::sole();
    expect($lead->email)->toBe('anna@example.nl')->and($lead->consented_at)->not->toBeNull()
        ->and($lead->campaign_id)->toBe($f['campaign']->id)
        ->and(ConversionEvent::sole()->credential_id)->toBeNull()
        ->and(PublisherEarning::sole()->amount)->toBe('10.00');
});

it('never echoes contact details back', function () {
    $f = conversionFixture();

    $response = submitForm($this, $f, formBody(conversionClick($f)))->assertCreated();

    expect($response->getContent())->not->toContain('anna@example.nl')->and($response->json())->toHaveKeys(['success', 'duplicate'])->toHaveCount(2);
});

it('accepts a text/plain body so the browser sends no preflight', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    $this->call('POST', formUrl($f), [], [], [], ['CONTENT_TYPE' => 'text/plain', 'HTTP_ORIGIN' => FORM_ORIGIN], json_encode(formBody($click)))
        ->assertCreated();
});

it('answers a repeat of the same email with a duplicate and creates nothing more', function () {
    $f = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($f)))->assertCreated();
    submitForm($this, $f, formBody(conversionClick($f)))->assertOk()->assertJson(['duplicate' => true]);

    expect(LeadContact::count())->toBe(1)->and(ConversionEvent::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
});

it('answers a second submit on the same click with a duplicate even for another email', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    submitForm($this, $f, formBody($click))->assertCreated();
    submitForm($this, $f, formBody($click, ['email' => 'other@example.nl']))->assertOk()->assertJson(['duplicate' => true]);

    expect(LeadContact::count())->toBe(1);
});

it('stores nothing without consent', function (array $override) {
    $f = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($f), $override))->assertUnprocessable();

    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
})->with([
    'consent false' => [['consent' => false]],
    'consent missing' => [['consent' => null]],
    'invalid email' => [['email' => 'nope']],
    'no click reference' => [['referral_id' => null]],
]);

it('lets the allowed page read why a submit was refused', function (array $override, string $field) {
    $f = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($f), $override))->assertUnprocessable()
        ->assertHeader('Access-Control-Allow-Origin', FORM_ORIGIN)->assertJsonValidationErrors($field);
})->with([
    'no consent' => [['consent' => false], 'consent'],
    'bad email' => [['email' => 'nope'], 'email'],
]);

it('lets the allowed page read why a foreign click was refused', function () {
    $f = conversionFixture();
    $other = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($other)))->assertUnprocessable()
        ->assertHeader('Access-Control-Allow-Origin', FORM_ORIGIN);
});

it('does not take a guessable click id in place of the unguessable referral', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    submitForm($this, $f, ['referral_id' => null, 'click_id' => $click->id] + formBody($click))->assertUnprocessable();

    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
});

it('refuses a missing or foreign origin without any cross-origin header', function (?string $origin) {
    $f = conversionFixture();

    $response = submitForm($this, $f, formBody(conversionClick($f)), $origin)->assertForbidden();

    expect($response->headers->has('Access-Control-Allow-Origin'))->toBeFalse()
        ->and(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
})->with(['missing' => [null], 'foreign' => ['https://evil.example'], 'same host, other scheme' => ['http://merchant.example']]);

it('accepts an origin from the offer allow-list', function () {
    $f = conversionFixture();
    $f['offer']->update(['lead_form_allowed_origins' => ['https://forms.partner.example']]);

    submitForm($this, $f, formBody(conversionClick($f)), 'https://forms.partner.example')->assertCreated();
});

it('answers 404 for an unknown key and for a rotated key', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $old = $f['offer']->lead_form_key;
    $f['offer']->rotateLeadFormKey();

    submitForm($this, $f, formBody($click), FORM_ORIGIN, $old)->assertNotFound();
    submitForm($this, $f, formBody($click), FORM_ORIGIN, 'does-not-exist')->assertNotFound();
    expect(LeadContact::count())->toBe(0);
});

it('rejects a click that belongs to another offer or another advertiser', function () {
    $f = conversionFixture();
    $other = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($other)))->assertUnprocessable();
    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
});

it('rejects submissions to an inactive offer, campaign or advertiser', function (string $which) {
    $f = conversionFixture();
    $click = conversionClick($f);
    match ($which) {
        'offer' => $f['offer']->update(['offer_status' => 'I']),
        'campaign' => $f['campaign']->update(['campaign_status' => 'I']),
        'advertiser' => $f['advertiser']->update(['status' => 'I']),
    };

    submitForm($this, $f, formBody($click))->assertStatus(403);

    expect(LeadContact::count())->toBe(0);
})->with(['offer', 'campaign', 'advertiser']);

it('rejects a click outside its conversion window', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $click->forceFill(['clicked_at' => now()->subDays(30), 'conversion_expires_at' => now()->subDays(27)])->save();

    submitForm($this, $f, formBody($click))->assertUnprocessable();

    expect(LeadContact::count())->toBe(0);
});

it('records the honeypot as a signal on the event instead of dropping the lead', function () {
    $f = conversionFixture();

    submitForm($this, $f, formBody(conversionClick($f), ['hp' => 'http://spam.example', 'duration_ms' => 300]))->assertCreated();

    expect(ConversionEvent::sole()->fraud_signals['spam_checks'])
        ->toMatchArray(['honeypot_filled' => true, 'form_duration_ms' => 300, 'is_spam' => false]);
});

it('throttles one address to thirty submissions a minute', function () {
    $f = conversionFixture();
    $body = formBody(conversionClick($f));

    foreach (range(1, 30) as $i) {
        submitForm($this, $f, $body)->assertSuccessful();
    }
    submitForm($this, $f, $body)->assertStatus(429);
});
