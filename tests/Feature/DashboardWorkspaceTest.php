<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\PartnerEnrollmentService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    Notification::fake();
});

/** A conversion fixture plus one pending application that asked for the fixture's offer. */
function dashboardFixture(): array
{
    $f = conversionFixture();
    $applicant = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true, 'first_name' => 'Dana', 'last_name' => 'Visser'])->id,
        'network_id' => $f['network']->id, 'website_url' => 'https://applicant.example']);
    $type = CommissionType::firstOrCreate(['name' => 'CPL'], ['nice_name' => 'Cost Per Submission']);
    OfferCommission::create(['offer_id' => $f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => '10.00']);
    // Apply through the real service so the accepted terms match what approval checks.
    $service = app(PartnerEnrollmentService::class);
    $f['application'] = $service->apply($applicant, $f['campaign']->id, [
        'applied_notes' => 'Newsletter', 'offer_id' => $f['offer']->id, 'terms_accepted' => true,
        'terms_version' => $service->version($service->contract($f['campaign']->fresh(), $f['offer']->fresh())),
    ]);

    return $f;
}

function dashboardOwner(array $f): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->assignRoleById(Role::findByName('network_owner')->id);

    return $user;
}

it('gives the network dashboard health, budget, click and application data for its own network only', function () {
    $f = dashboardFixture();
    dashboardFixture(); // Another network must not leak in.
    conversionClick($f);
    conversionClick($f);
    Campaign::create(['network_id' => $f['network']->id, 'advertiser_id' => $f['advertiser']->id, 'name' => 'Paused one',
        'start_date' => now(), 'end_date' => now()->addMonth(), 'campaign_status' => 'I', 'currency' => 'USD', 'total_budget' => 500, 'spent_amount' => 120]);

    $this->actingAs(dashboardOwner($f))->get(route('network.dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('network_dashboard/dashboard')
            ->where('campaignStatusCounts', ['A' => 1, 'I' => 1])
            ->has('budgets', 1)
            ->where('budgets.0.currency', 'USD')
            ->where('budgets.0.total', fn ($total) => (float) $total === 1500.0)
            ->where('budgets.0.spent', fn ($spent) => (float) $spent === 120.0)
            ->has('dailyClicks', 30)
            ->where('dailyClicks.29', ['date' => now()->toDateString(), 'count' => 2])
            ->where('pendingApplicationsCount', 1)
            ->has('pendingApplications', 1)
            ->where('pendingApplications.0.id', $f['application']->id)
            ->where('pendingApplications.0.requested_offer_id', $f['offer']->id)
            ->where('pendingApplications.0.campaign_name', $f['campaign']->name)
            ->where('pendingApplications.0.first_name', 'Dana')
            ->has('dailyRevenue', 1)
            ->where('dailyRevenue.0.currency', 'USD'));
});

it('keeps each currency in its own revenue series on the network dashboard', function () {
    $f = conversionFixture('CPS');
    $euro = Advertiser::create(['user_id' => User::factory()->create(['is_advertiser' => true])->id,
        'network_id' => $f['network']->id, 'business_name' => 'Euro merchant', 'website_name' => 'https://euro.example',
        'industry' => 'retail', 'currency' => 'EUR', 'status' => 'A']);
    app(FundingService::class)->deposit($euro, '1000.00', 'EUR', 'euro-bank', 'receipt', $euro->user_id);
    $eur = conversionFixture('CPS');
    $eur['campaign']->update(['network_id' => $f['network']->id, 'advertiser_id' => $euro->id, 'currency' => 'EUR']);
    $eur['offer']->update(['network_id' => $f['network']->id]);
    $eur['assignment']->update(['network_id' => $f['network']->id]);
    $eur['credential']->update(['advertiser_id' => $euro->id]);
    $eur['publisher']->update(['network_id' => $f['network']->id]);
    $eur['network'] = $f['network'];

    foreach ([[$f, 'USD', '100.00'], [$eur, 'EUR', '40.00']] as [$fixture, $currency, $amount]) {
        $click = conversionClick($fixture);
        $this->withToken($fixture['token'])->postJson('/api/v1/events', conversionPayload($click,
            ['event_type' => 'purchase', 'amount' => $amount, 'currency' => $currency, 'external_id' => "order-$currency"]))->assertCreated();
        app(EarningReviewService::class)->approve(PublisherEarning::latest('id')->first(), $fixture['advertiser']->user_id, 'Verified');
    }

    $this->actingAs(dashboardOwner($f))->get(route('network.dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('dailyRevenue', 2)
            ->where('dailyRevenue', function ($series) {
                $byCurrency = collect($series)->keyBy('currency');

                return (float) array_sum(array_column($byCurrency['EUR']['days'], 'revenue')) === 40.0
                    && (float) array_sum(array_column($byCurrency['USD']['days'], 'revenue')) === 100.0;
            }));
});

it('returns to the dashboard after an approval or rejection made there', function () {
    $f = dashboardFixture();
    $owner = dashboardOwner($f);

    $this->actingAs($owner)->post(route('applications.approve', $f['application']->id),
        ['offer_id' => $f['offer']->id, 'return_to' => 'dashboard'])->assertRedirect(route('dashboard'));
    expect($f['application']->fresh()->status)->toBe('A');

    $other = dashboardFixture();
    $otherOwner = dashboardOwner($other);
    $this->actingAs($otherOwner)->post(route('applications.reject', $other['application']->id),
        ['rejection_reason' => 'Not a fit'])->assertRedirect(route('applications.index'));
    expect($other['application']->fresh()->status)->toBe('R');
});

it('still blocks dashboard approvals for another network', function () {
    $f = dashboardFixture();
    $intruder = dashboardOwner(dashboardFixture());

    $this->actingAs($intruder)->post(route('applications.approve', $f['application']->id),
        ['offer_id' => $f['offer']->id, 'return_to' => 'dashboard'])->assertNotFound();
    expect($f['application']->fresh()->status)->toBe('P');
});

it('gives the advertiser dashboard a pending count and campaign names', function () {
    $f = dashboardFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);

    $this->actingAs($user)->get(route('advertiser.dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pendingApplicationsCount', 1)
            ->where('pendingApplications.0.campaign_name', $f['campaign']->name)
            ->has('campaigns', 1)
            ->has('stats.net_funded_budget'));
});

it('searches and filters the marketplace by advertiser industry and reports EPC and my campaigns', function () {
    $f = conversionFixture();
    $f['advertiser']->update(['business_name' => 'Skyline Travel', 'industry' => 'Travel']);
    $f['campaign']->update(['name' => 'Winter Getaways']);
    $other = Advertiser::create(['user_id' => User::factory()->create(['is_advertiser' => true])->id,
        'network_id' => $f['network']->id, 'business_name' => 'Voltix', 'website_name' => 'https://voltix.example',
        'industry' => 'Electronics', 'currency' => 'USD', 'status' => 'A']);
    Campaign::create(['network_id' => $f['network']->id, 'advertiser_id' => $other->id, 'name' => 'Smart Home Week',
        'start_date' => now()->subDay(), 'end_date' => now()->addMonth(), 'campaign_status' => 'A', 'currency' => 'USD', 'total_budget' => 100]);
    $click = conversionClick($f);
    conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    app(EarningReviewService::class)->approve(PublisherEarning::latest('id')->first(), $f['advertiser']->user_id, 'Verified');

    $user = $f['publisher']->user;
    $user->assignRoleById(Role::findByName('publisher')->id);
    $this->actingAs($user)->get(route('publisher.dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('campaigns.data', 2)
            ->where('industries', ['Electronics', 'Travel'])
            ->where('myCampaignsCount', 1));

    $this->get(route('publisher.dashboard', ['search' => 'skyline']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('campaigns.data', 1)
            ->where('campaigns.data.0.name', 'Winter Getaways')
            ->where('campaigns.data.0.advertiser.business_name', 'Skyline Travel')
            // One approved $10.00 commission over two clicks.
            ->where('campaigns.data.0.epc', 5));

    $this->get(route('publisher.dashboard', ['industry' => 'Electronics']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('campaigns.data', 1)
            ->where('campaigns.data.0.name', 'Smart Home Week')
            ->where('campaigns.data.0.epc', null));
});
