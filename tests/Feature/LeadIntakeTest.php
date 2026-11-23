<?php

use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Models\PublisherEarning;
use App\Services\ConversionEventService;
use App\Services\LeadIntakeService;
use Illuminate\Http\Request;

function intakePost($test, array $f, string $email, string $externalId, ?string $nth = null)
{
    return $test->withToken($f['token'])->postJson('/api/v1/leads', array_merge(conversionPayload(conversionClick($f)), [
        'email' => $email, 'external_id' => $externalId,
    ]));
}

it('returns the existing lead when the same email arrives on another click of one campaign', function () {
    $f = conversionFixture();

    $first = intakePost($this, $f, 'anna@example.nl', 'sub:1')->assertCreated();
    $second = intakePost($this, $f, 'anna@example.nl', 'sub:2')->assertOk()
        ->assertJsonPath('duplicate', true)->assertJsonPath('lead_id', $first->json('lead_id'));

    expect($second->json('event_id'))->toBe($first->json('event_id'))
        ->and(LeadContact::count())->toBe(1)->and(Conversion::count())->toBe(1)
        ->and(ConversionEvent::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
});

it('treats spelling variants of one email as the same contact', function () {
    $f = conversionFixture();

    intakePost($this, $f, 'anna@example.nl', 'sub:1')->assertCreated();
    intakePost($this, $f, ' Anna@Example.NL ', 'sub:2')->assertOk()->assertJsonPath('duplicate', true);

    expect(LeadContact::count())->toBe(1);
});

it('keeps contacts with the same email in different campaigns', function () {
    $a = conversionFixture();
    $b = conversionFixture();

    intakePost($this, $a, 'anna@example.nl', 'sub:1')->assertCreated();
    intakePost($this, $b, 'anna@example.nl', 'sub:1')->assertCreated();

    expect(LeadContact::count())->toBe(2)->and(PublisherEarning::count())->toBe(2);
});

it('confirms a lead form submission without a merchant credential and still pays it', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $data = collect(conversionPayload($click, ['external_id' => 'form:'.$click->id]))->except(['referral_id'])->put('click_id', $click->id)->all();

    $result = app(ConversionEventService::class)->confirmFromLeadForm($f['advertiser']->id, $data, Request::create('/x', 'POST'));

    $event = $result['event'];
    expect($result['duplicate'])->toBeFalse()
        ->and($event->credential_id)->toBeNull()
        ->and($event->fraud_signals['source'])->toBe('lead_form')
        ->and($event->earning->amount)->toBe('10.00');
});

it('still demands a live credential on the merchant path', function () {
    $f = conversionFixture();
    $f['credential']->forceFill(['revoked_at' => now()])->save();

    intakePost($this, $f, 'anna@example.nl', 'sub:1')->assertUnauthorized();

    expect(LeadContact::count())->toBe(0);
});

it('stores the consent time given to the intake', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $at = now()->toImmutable()->startOfSecond();

    $result = app(LeadIntakeService::class)->submit(
        $click,
        collect(conversionPayload($click, ['external_id' => 'form:'.$click->id]))->except(['referral_id'])->put('click_id', $click->id)->all(),
        ['email' => 'anna@example.nl'],
        fn (array $data) => app(ConversionEventService::class)->confirmFromLeadForm($f['advertiser']->id, $data, Request::create('/x', 'POST')),
        $at,
    );

    expect($result['duplicate'])->toBeFalse()->and($result['lead']->fresh()->consented_at->equalTo($at))->toBeTrue();
});
