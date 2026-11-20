<?php

use App\Models\Conversion;
use App\Models\ConversionEvent;
use App\Models\LeadContact;
use App\Models\PublisherEarning;
use Illuminate\Support\Facades\Schema;

function leadPayload($click, array $overrides = []): array
{
    return array_merge(conversionPayload($click), [
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'email' => 'anna@example.nl',
        'phone' => '+31201234567', 'company' => 'Voorbeeld BV',
    ], $overrides);
}

it('stores the contact and pays the submission through the event pipeline', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    $this->withToken($f['token'])->postJson('/api/v1/leads', leadPayload($click))->assertCreated()
        ->assertJsonPath('commission_amount', '10.00')->assertJsonPath('commission_status', 'pending')
        ->assertJsonPath('duplicate', false)->assertJsonStructure(['lead_id', 'event_id']);

    $lead = LeadContact::sole();
    expect($lead->email)->toBe('anna@example.nl')
        ->and($lead->advertiser_id)->toBe($f['advertiser']->id)
        ->and($lead->campaign_id)->toBe($f['campaign']->id)
        ->and($lead->conversion_event_id)->toBe(ConversionEvent::sole()->id)
        ->and($lead->status)->toBe('new')
        ->and(PublisherEarning::count())->toBe(1);
    // The financial event itself never carries contact details.
    expect(json_encode(ConversionEvent::sole()->getAttributes()))->not->toContain('anna@example.nl');
});

it('does not create a second lead or earning when the advertiser retries', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $payload = leadPayload($click);

    $first = $this->withToken($f['token'])->postJson('/api/v1/leads', $payload)->assertCreated();
    $this->withToken($f['token'])->postJson('/api/v1/leads', $payload)->assertOk()
        ->assertJsonPath('duplicate', true)->assertJsonPath('lead_id', $first->json('lead_id'));

    expect(LeadContact::count())->toBe(1)->and(Conversion::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
});

it('requires a valid advertiser credential', function () {
    $f = conversionFixture();
    $click = conversionClick($f);

    $this->postJson('/api/v1/leads', leadPayload($click))->assertUnauthorized();
    $this->withToken('not-a-real-token')->postJson('/api/v1/leads', leadPayload($click))->assertUnauthorized();
    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
});

it('rejects invalid contacts and failed submissions without creating any record', function (array $override) {
    $f = conversionFixture();
    $click = conversionClick($f);

    $this->withToken($f['token'])->postJson('/api/v1/leads', leadPayload($click, $override))->assertUnprocessable();

    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0)->and(PublisherEarning::count())->toBe(0);
})->with([
    'missing email' => [['email' => null]],
    'invalid email' => [['email' => 'not-an-email']],
    'overlong name' => [['first_name' => str_repeat('a', 101)]],
    'failed save' => [['successful' => false]],
    'other event type' => [['event_type' => 'purchase']],
    'unknown field' => [['password' => 'secret']],
]);

it('does not let one advertiser attach contacts to another advertiser\'s referral', function () {
    $mine = conversionFixture();
    $theirs = conversionFixture();
    $theirClick = conversionClick($theirs);

    $this->withToken($mine['token'])->postJson('/api/v1/leads', leadPayload($theirClick))->assertNotFound();

    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(0);
});

it('keeps the contact table separate from the financial tables', function () {
    expect(Schema::hasTable('lead_contacts'))->toBeTrue()
        ->and(Schema::hasTable('leads'))->toBeFalse()
        ->and(Schema::hasColumn('conversion_events', 'lead_id'))->toBeFalse()
        ->and(Schema::hasColumn('publisher_earnings', 'lead_id'))->toBeFalse();
});

// --- Leads screens -------------------------------------------------------------------------

use App\Models\User;
use Database\Seeders\RolePermsSeeder;
use Maatwebsite\Excel\Facades\Excel;
use Spatie\Permission\Models\Role;

function leadFor(array $f, string $email = 'lead@example.nl'): LeadContact
{
    $click = conversionClick($f);
    test()->withToken($f['token'])->postJson('/api/v1/leads', leadPayload($click, ['email' => $email, 'external_id' => 'sub:'.md5($email)]))->assertCreated();

    return LeadContact::where('email', $email)->firstOrFail();
}

function leadUser(string $role, array $f = []): User
{
    test()->seed(RolePermsSeeder::class);
    $user = isset($f['advertiser']) && $role === 'advertiser' ? $f['advertiser']->user : User::factory()->create();
    $user->assignRoleById(Role::findByName($role)->id);

    return $user;
}

it('lists only the contacts of the viewer\'s own campaigns', function () {
    $mine = conversionFixture();
    $theirs = conversionFixture();
    leadFor($mine, 'mine@example.nl');
    leadFor($theirs, 'theirs@example.nl');

    $this->actingAs(leadUser('advertiser', $mine))->get(route('leads.index'))->assertOk()
        ->assertInertia(fn ($page) => $page->component('leads/index')->has('leads.data', 1)->where('leads.data.0.email', 'mine@example.nl'));
});

it('hides contacts from publishers and users without the leads permission', function () {
    $f = conversionFixture();
    leadFor($f);

    // Publishers are turned away at the campaign-manager gate and redirected to their dashboard.
    $this->actingAs(leadUser('publisher'))->get(route('leads.index'))->assertRedirect(route('dashboard'));
    $this->actingAs(leadUser('publisher'))->get(route('leads.export'))->assertRedirect(route('dashboard'));
});

it('lets the owner change a contact status and add notes but nobody else', function () {
    $mine = conversionFixture();
    $theirs = conversionFixture();
    $lead = leadFor($mine);
    $other = leadFor($theirs, 'other@example.nl');
    $user = leadUser('advertiser', $mine);

    $this->actingAs($user)->patch(route('leads.update', $lead), ['status' => 'qualified', 'notes' => 'Call back Monday'])->assertRedirect();
    expect($lead->fresh()->status)->toBe('qualified')->and($lead->fresh()->notes)->toBe('Call back Monday');

    $this->actingAs($user)->patch(route('leads.update', $lead), ['status' => 'bogus'])->assertSessionHasErrors('status');
    $this->actingAs($user)->patch(route('leads.update', $other), ['status' => 'lost'])->assertNotFound();
    expect($other->fresh()->status)->toBe('new');
});

it('erases a contact without touching the earned commission', function () {
    $f = conversionFixture();
    $lead = leadFor($f);
    $user = leadUser('advertiser', $f);

    $this->actingAs($user)->delete(route('leads.destroy', $lead))->assertRedirect();

    expect(LeadContact::count())->toBe(0)->and(ConversionEvent::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
});

it('exports only the contacts the viewer may see', function () {
    Excel::fake();
    $mine = conversionFixture();
    leadFor($mine, 'mine@example.nl');
    leadFor(conversionFixture(), 'theirs@example.nl');

    $this->actingAs(leadUser('advertiser', $mine))->get(route('leads.export'))->assertOk();

    Excel::assertDownloaded('leads.xlsx', fn ($export) => $export->collection()->pluck('email')->all() === ['mine@example.nl']);
});
