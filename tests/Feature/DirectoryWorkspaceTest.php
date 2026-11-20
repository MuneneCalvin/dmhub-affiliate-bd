<?php

use App\Models\Advertiser;
use App\Models\CommissionType;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\PartnerEnrollmentService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    Notification::fake();
});

/** A campaign with one offer and `$count` pending applications that accepted its current terms. */
function directoryFixture(int $count = 2): array
{
    $f = conversionFixture();
    $type = CommissionType::firstOrCreate(['name' => 'CPL'], ['nice_name' => 'Cost Per Submission']);
    OfferCommission::create(['offer_id' => $f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => '10.00']);
    $service = app(PartnerEnrollmentService::class);
    $f['applications'] = collect(range(1, $count))->map(function ($i) use ($f, $service) {
        $publisher = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true, 'first_name' => "Applicant{$i}"])->id,
            'network_id' => $f['network']->id, 'website_url' => "https://applicant{$i}.example"]);

        return $service->apply($publisher, $f['campaign']->id, [
            'applied_notes' => 'Newsletter', 'offer_id' => $f['offer']->id, 'terms_accepted' => true,
            'terms_version' => $service->version($service->contract($f['campaign']->fresh(), $f['offer']->fresh())),
        ]);
    });

    return $f;
}

function directoryOwner(array $f, string $role = 'network_owner'): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->assignRoleById(Role::findByName($role)->id);

    return $user;
}

it('bulk approves pending applications with the offer each publisher requested', function () {
    $f = directoryFixture();
    $ids = $f['applications']->pluck('id')->all();

    $this->actingAs(directoryOwner($f))->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'approve'])
        ->assertRedirect(route('applications.index', ['status' => 'P']))
        ->assertSessionHas('success', '2 applications approved.');

    $f['applications']->each(function ($application) use ($f) {
        $fresh = $application->fresh();
        expect($fresh->status)->toBe('A')
            ->and($fresh->offer_id)->toBe($f['offer']->id)
            ->and($fresh->tracking_link)->not->toBeNull();
    });
});

it('bulk rejects with a required reason', function () {
    $f = directoryFixture();
    $ids = $f['applications']->pluck('id')->all();
    $owner = directoryOwner($f);

    $this->actingAs($owner)->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'reject'])
        ->assertSessionHasErrors('rejection_reason');
    expect($f['applications']->first()->fresh()->status)->toBe('P');

    $this->actingAs($owner)->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'reject', 'rejection_reason' => 'Audience mismatch'])
        ->assertSessionHas('success', '2 applications rejected.');
    $f['applications']->each(fn ($a) => expect($a->fresh()->status)->toBe('R')
        ->and($a->fresh()->rejection_reason)->toBe('Audience mismatch'));
});

it('validates the bulk review payload', function (array $payload, string $error) {
    $f = directoryFixture(1);

    $this->actingAs(directoryOwner($f))->post(route('applications.bulk-review'), $payload)->assertSessionHasErrors($error);
})->with([
    'no ids' => [['ids' => [], 'decision' => 'approve'], 'ids'],
    'bad decision' => [['ids' => [1], 'decision' => 'maybe'], 'decision'],
    'too many' => [['ids' => range(1, 51), 'decision' => 'approve'], 'ids'],
]);

it('skips applications that are no longer pending and reports them', function () {
    $f = directoryFixture();
    [$first, $second] = $f['applications']->all();
    $second->update(['status' => 'R']);

    $this->actingAs(directoryOwner($f))->post(route('applications.bulk-review'), ['ids' => [$first->id, $second->id], 'decision' => 'approve'])
        ->assertSessionHas('success', '1 application approved. 1 application could not be reviewed; open it to see why.');
    expect($first->fresh()->status)->toBe('A')->and($second->fresh()->status)->toBe('R');
});

it('keeps bulk review inside the reviewer network and permissions', function () {
    $f = directoryFixture();
    $ids = $f['applications']->pluck('id')->all();

    // Another network's owner cannot see these applications.
    $outsider = directoryOwner(directoryFixture(1));
    $this->actingAs($outsider)->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'approve'])->assertNotFound();

    // A network member who may review but not approve.
    $reviewer = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $reviewer->id, 'network_id' => $f['network']->id]);
    foreach (['review_applications', 'reject_applications'] as $name) {
        $reviewer->givePermissionTo(Permission::findOrCreate($name, 'web'));
    }
    $this->actingAs($reviewer)->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'approve'])->assertForbidden();

    // Publishers never reach the endpoint.
    $publisher = User::find($f['applications']->first()->publisher->user_id);
    $this->actingAs($publisher)->post(route('applications.bulk-review'), ['ids' => $ids, 'decision' => 'approve'])->assertRedirect();

    $f['applications']->each(fn ($a) => expect($a->fresh()->status)->toBe('P'));
});

it('gives the applications list status counts, partner summaries and review permissions', function () {
    $f = directoryFixture(3);
    $f['applications']->last()->update(['status' => 'R']);
    directoryFixture(1); // Another network must not be counted.

    $this->actingAs(directoryOwner($f))->get(route('applications.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('applications/index')
            ->where('statusCounts', ['P' => 2, 'A' => 1, 'R' => 1]) // the fixture has one approved assignment
            ->where('can', ['approve' => true, 'reject' => true])
            ->has('applications.data', 2)
            ->where('applications.data.0.requested_offer_id', $f['offer']->id)
            ->where('applications.data.0.partner_summary.pending', 1));
});

it('filters partner directories by status with counts across all pages', function () {
    $f = directoryFixture(1);
    $owner = directoryOwner($f);
    Advertiser::create(['user_id' => User::factory()->create()->id, 'network_id' => $f['network']->id, 'business_name' => 'Dormant BV',
        'industry' => 'Retail', 'currency' => 'USD', 'status' => 'P', 'is_verified' => true]);

    $this->actingAs($owner)->get(route('advertisers.index', ['status' => 'inactive']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('advertisers/index')
            ->where('status', 'inactive')
            ->where('statusCounts.inactive', 1)
            ->where('statusCounts.all', fn ($all) => $all >= 1)
            ->has('advrts.data', 1)
            ->where('advrts.data.0.business_name', 'Dormant BV'));

    $f['publisher']->update(['is_verified' => true]);
    $this->actingAs($owner)->get(route('publishers.index', ['status' => 'active']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('publishers/index')
            ->where('status', 'active')
            ->where('statusCounts.active', fn ($n) => $n >= 1)
            ->where('pbshers.data', fn ($rows) => collect($rows)->every(fn ($row) => $row['status'] === 'A')));

    // Unknown values fall back to all records.
    $this->actingAs($owner)->get(route('advertisers.index', ['status' => 'bogus']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('status', 'all'));
});
