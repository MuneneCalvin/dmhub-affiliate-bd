<?php

use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Models\Offer;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

function leadContactFor(array $f, string $email, array $overrides = []): LeadContact
{
    $click = conversionClick($f);
    $event = ConversionEvent::create([
        'advertiser_id' => $f['advertiser']->id, 'credential_id' => $f['credential']->id, 'click_id' => $click->id,
        'event_type' => 'submission', 'external_id' => 'form:'.$click->id, 'payload_hash' => hash('sha256', (string) $click->id),
        'occurred_at' => now(), 'amount' => '0.00', 'currency' => 'USD', 'fraud_signals' => [], 'attribution' => [],
    ]);

    return LeadContact::create(array_merge([
        'conversion_event_id' => $event->id, 'advertiser_id' => $f['advertiser']->id, 'network_id' => $f['network']->id,
        'campaign_id' => $f['campaign']->id, 'offer_id' => $f['offer']->id, 'email' => $email,
    ], $overrides));
}

it('gives every new offer a lead form key', function () {
    $offer = conversionFixture()['offer'];

    expect($offer->lead_form_key)->toBeString()->toHaveLength(32);
});

it('rotates the lead form key and persists it', function () {
    $offer = conversionFixture()['offer'];
    $old = $offer->lead_form_key;

    $new = $offer->rotateLeadFormKey();

    expect($new)->not->toBe($old)->and($offer->fresh()->lead_form_key)->toBe($new);
});

it('hashes emails without regard to case or surrounding whitespace', function () {
    expect(LeadContact::hashEmail(' Anna@Example.NL '))->toBe(hash('sha256', 'anna@example.nl'));
});

it('stores the email hash and refuses a second contact with the same email in one campaign', function () {
    $f = conversionFixture();
    $first = leadContactFor($f, 'anna@example.nl');

    expect($first->email_hash)->toBe(hash('sha256', 'anna@example.nl'));
    expect(fn () => leadContactFor($f, 'Anna@Example.NL '))->toThrow(UniqueConstraintViolationException::class);
});

it('allows the same email in another campaign', function () {
    $f = conversionFixture();
    $other = conversionFixture();

    leadContactFor($f, 'anna@example.nl');
    leadContactFor($other, 'anna@example.nl');

    expect(LeadContact::count())->toBe(2);
});

it('lets a conversion event exist without a merchant credential', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    $event = ConversionEvent::create([
        'advertiser_id' => $f['advertiser']->id, 'credential_id' => null, 'click_id' => $click->id,
        'event_type' => 'submission', 'external_id' => 'form:'.$click->id, 'payload_hash' => 'x',
        'occurred_at' => now(), 'amount' => '0.00', 'currency' => 'USD', 'fraud_signals' => [], 'attribution' => [],
    ]);

    expect($event->fresh()->credential_id)->toBeNull();
});

it('backfills keys and hashes for rows that existed before the migration', function () {
    $f = conversionFixture();
    $lead = leadContactFor($f, 'Anna@Example.NL');
    DB::table('offers')->where('id', $f['offer']->id)->update(['lead_form_key' => null]);
    DB::table('lead_contacts')->where('id', $lead->id)->update(['email_hash' => '']);

    $migration = require database_path('migrations/2026_11_23_000001_add_embedded_lead_form_columns.php');
    $migration->backfill();

    expect($f['offer']->fresh()->lead_form_key)->toHaveLength(32)
        ->and($lead->fresh()->email_hash)->toBe(hash('sha256', 'anna@example.nl'))
        ->and(Schema::hasColumn('lead_contacts', 'consented_at'))->toBeTrue();
});

it('gives a replicated offer its own lead form key', function () {
    $offer = conversionFixture()['offer'];

    $copy = $offer->replicate();
    $copy->name = 'Copy';
    $copy->save();

    expect($copy->lead_form_key)->toHaveLength(32)->and($copy->lead_form_key)->not->toBe($offer->lead_form_key);
});
