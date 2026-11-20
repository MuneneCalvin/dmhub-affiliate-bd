<?php

use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignOverviewService;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\InvoiceService;
use Carbon\CarbonImmutable;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
    $this->seed(CurrencySeeder::class);
    $this->travelTo(CarbonImmutable::parse('2026-11-04 15:00:00', 'UTC'));
});

function overviewFor(array $f, bool $publisher = false): array
{
    return app(CampaignOverviewService::class)->build($f['campaign']->fresh(),
        $publisher ? $f['publisher']->user : $f['advertiser']->user,
        $publisher ? $f['assignment']->fresh() : null);
}

function overviewOutcome(array $f, string $id): PublisherEarning
{
    $click = conversionClick($f);
    test()->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['external_id' => $id]))->assertCreated();

    return PublisherEarning::where('publisher_campaign_id', $f['assignment']->id)->latest('id')->firstOrFail();
}

it('separates merchant confirmation from financial approval and restates refunded performance', function () {
    $f = conversionFixture('CPS', '10.00');
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '100.00']))->assertCreated();
    $pending = overviewFor($f);
    expect($pending['lifecycle']['confirmed'])->toBe(1)
        ->and($pending['lifecycle']['pending'])->toBe(1)
        ->and($pending['metrics']['conversions'])->toBe(0)
        ->and($pending['budget']['spent'])->toEqual(10);
    $earning = PublisherEarning::firstOrFail();
    $reviews = app(EarningReviewService::class);
    $reviews->approve($earning, $f['advertiser']->user_id, 'Verified');
    $reviews->adjust($earning->fresh(), 'refund', '40.00', 'partial-refund', 'Returned items', $f['advertiser']->user_id);
    $approved = overviewFor($f);
    expect($approved['metrics'])->toEqual(['clicks' => 1, 'conversions' => 1, 'sales' => 60, 'commissions' => 6])
        ->and(array_sum(array_column($approved['days'], 'conversions')))->toBe(1)
        ->and($approved['budget']['spent'])->toEqual(6)
        ->and($approved['budget']['daily_usage'])->toEqual(10)
        ->and($approved['budget']['available'])->toEqual(994);
});

it('keeps a gross daily cap alert after reversal and clears it at UTC midnight', function () {
    $f = conversionFixture();
    $f['campaign']->update(['daily_budget' => 10]);
    $earning = overviewOutcome($f, 'daily-cap');
    app(EarningReviewService::class)->adjust($earning, 'rejection', null, 'reject', 'Invalid outcome', $f['advertiser']->user_id);
    $overview = overviewFor($f);
    expect(array_column($overview['alerts'], 'code'))->toContain('daily_cap')
        ->and($overview['traffic_eligible'])->toBeFalse()
        ->and($overview['budget']['spent'])->toEqual(0)
        ->and($overview['budget']['daily_usage'])->toEqual(10);
    $this->travelTo(CarbonImmutable::parse('2026-11-05 00:00:00', 'UTC'));
    $nextDay = overviewFor($f);
    expect(array_column($nextDay['alerts'], 'code'))->not->toContain('daily_cap')
        ->and($nextDay['traffic_eligible'])->toBeTrue()
        ->and($nextDay['budget']['daily_usage'])->toEqual(0);
});

it('applies the same UTC reporting window to clicks KPIs and chart', function () {
    $f = conversionFixture();
    $old = overviewOutcome($f, 'old');
    app(EarningReviewService::class)->approve($old, $f['advertiser']->user_id, 'Verified');
    $old->conversion->update(['conversion_date' => '2026-10-05']);
    $old->conversion->click->update(['clicked_at' => '2026-10-05 23:59:59']);
    $current = overviewOutcome($f, 'current');
    app(EarningReviewService::class)->approve($current, $f['advertiser']->user_id, 'Verified');
    $overview = overviewFor($f);
    expect($overview['period'])->toBe(['start' => '2026-10-06', 'end' => '2026-11-04'])
        ->and($overview['metrics']['clicks'])->toBe(1)
        ->and($overview['metrics']['conversions'])->toBe(1)
        ->and($overview['lifecycle']['confirmed'])->toBe(2)
        ->and($overview['days'])->toHaveCount(30)
        ->and(array_sum(array_column($overview['days'], 'conversions')))->toBe(1);
});

it('triggers and clears campaign blockers without treating unset limits as exhausted', function (string $condition, string $code) {
    $f = conversionFixture();
    match ($condition) {
        'total' => $f['campaign']->update(['total_budget' => 100, 'spent_amount' => 100]),
        'inactive' => $f['campaign']->update(['campaign_status' => 'I']),
        'scheduled' => $f['campaign']->update(['start_date' => now()->addDay()]),
        'ended' => $f['campaign']->update(['end_date' => now()->subSecond()]),
        'offer' => $f['offer']->update(['expires_at' => now()->subSecond()]),
        'publishers' => $f['assignment']->update(['status' => 'I']),
        'account' => $f['advertiser']->user->update(['email_verified_at' => null]),
        'funding' => app(FundingService::class)->refund($f['advertiser'], '1000.00', 'USD', 'refund', 'Returned funding', $f['advertiser']->user_id),
    };
    $overview = overviewFor($f);
    expect(array_column($overview['alerts'], 'code'))->toContain($code)->and($overview['traffic_eligible'])->toBeFalse();
})->with([
    ['total', 'total_cap'], ['inactive', 'inactive'], ['scheduled', 'scheduled'], ['ended', 'ended'],
    ['offer', 'offers'], ['publishers', 'publishers'], ['account', 'account'], ['funding', 'funding'],
]);

it('shows honest empty metrics and no limit on an eligible new campaign', function () {
    $f = conversionFixture();
    $f['campaign']->update(['total_budget' => 0, 'daily_budget' => 0]);
    $overview = overviewFor($f);
    expect($overview['alerts'])->toBe([])->and($overview['traffic_eligible'])->toBeTrue()
        ->and($overview['metrics'])->toEqual(['clicks' => 0, 'conversions' => 0, 'sales' => 0, 'commissions' => 0])
        ->and($overview['activity'])->toBeNull()->and($overview['budget']['total_limit'])->toEqual(0);
});

it('limits publisher data and tracking links to the authorized assignment', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $otherAssignment = PublisherCampaigns::create(['publisher_id' => $foreign['publisher']->id, 'network_id' => $f['network']->id,
        'campaign_id' => $f['campaign']->id, 'offer_id' => $f['offer']->id, 'status' => 'A', 'tracking_link' => 'other-secret-link']);
    conversionClick(array_merge($f, ['assignment' => $otherAssignment, 'publisher' => $foreign['publisher']]));
    conversionClick($f);
    $user = $f['publisher']->user;
    $user->assignRoleById(Role::findByName('publisher')->id);
    $this->actingAs($user)->get(route('publishers.my.campaign.show', $f['assignment']->id))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('publishercampaigns/show')
            ->where('overview.publisher_view', true)->where('overview.metrics.clicks', 1)
            ->where('overview.budget', null)->where('overview.applications', 0)
            ->where('overview.assignment.tracking_link', $f['assignment']->tracking_link)
            ->missing('overview.tools.settings')->missing('overview.tools.publishers')->missing('campaign'));
    $this->get(route('publishers.my.campaign.show', $otherAssignment->id))->assertNotFound();
    $this->get(route('advertiser.campaign.show', $f['campaign']->id))->assertRedirect(route('dashboard'));
});

it('supports pending publisher applications with no assigned offer and no tracking link', function () {
    $f = conversionFixture();
    $f['assignment']->update(['status' => 'P', 'requested_offer_id' => $f['offer']->id, 'offer_id' => null, 'tracking_link' => null]);
    $user = $f['publisher']->user;
    $user->assignRoleById(Role::findByName('publisher')->id);
    $this->actingAs($user)->get(route('publishers.my.campaign.show', $f['assignment']->id))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('overview.assignment.tracking_link', null)
            ->where('overview.traffic_eligible', false)->where('overview.assignment.status', 'P'));
    expect(array_column(overviewFor($f, true)['alerts'], 'code'))->toContain('assignment', 'terms');
});

it('does not disclose campaign spend through publisher budget alerts', function () {
    $f = conversionFixture();
    $f['campaign']->update(['daily_budget' => 10]);
    overviewOutcome($f, 'publisher-cap');
    $overview = overviewFor($f, true);
    $alert = collect($overview['alerts'])->firstWhere('code', 'daily_cap');
    expect($overview['budget'])->toBeNull()->and($alert['values'])->toBe([])
        ->and($alert['description'])->toContain('00:00 UTC')->and($overview['traffic_eligible'])->toBeFalse();
});

it('exposes role-appropriate operator tools without granting advertisers finance review', function () {
    $f = conversionFixture();
    $user = $f['advertiser']->user;
    $user->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($user)->get(route('advertiser.campaign.show', $f['campaign']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('overview.role', 'Advertiser')
            ->has('overview.tools.settings')->missing('overview.tools.finance')->missing('overview.tools.publishers'));
    $operator = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $operator->id, 'network_id' => $f['network']->id]);
    $operator->assignRoleById(Role::findByName('network_owner')->id);
    $this->actingAs($operator)->get(route('advertiser.campaign.show', $f['campaign']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('overview.role', 'Network operator')->has('overview.tools.finance')->has('overview.tools.publishers')->missing('overview.tools.settings'));
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->get(route('advertiser.campaign.show', $f['campaign']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('overview.role', 'Administrator')->has('overview.tools.settings')->has('overview.tools.finance'));
});

it('counts invoices once and retains paid invoice history after a full reversal', function () {
    $f = conversionFixture();
    $f['publisher']->update(['payout_threshold' => 0]);
    $first = overviewOutcome($f, 'invoice-first');
    $second = overviewOutcome($f, 'invoice-second');
    $reviews = app(EarningReviewService::class);
    $reviews->approve($first, $f['advertiser']->user_id, 'Verified');
    $reviews->approve($second, $f['advertiser']->user_id, 'Verified');
    $invoices = app(InvoiceService::class);
    $invoice = $invoices->createInvoice($f['publisher']->fresh());
    expect(overviewFor($f)['lifecycle']['invoiced'])->toBe(1);
    $invoice->update(['status' => 'paid']);
    $invoice->earnings()->update(['status' => 'paid']);
    $reviews->adjust($first->fresh(), 'reversal', null, 'refund-first', 'Returned', $f['advertiser']->user_id);
    $reviews->adjust($second->fresh(), 'reversal', null, 'refund-second', 'Returned', $f['advertiser']->user_id);
    $overview = overviewFor($f);
    expect($overview['lifecycle']['paid'])->toBe(1)->and($overview['lifecycle']['invoiced'])->toBe(1)
        ->and($overview['lifecycle']['confirmed'])->toBe(2)->and($overview['metrics']['conversions'])->toBe(0);
});

it('separates publisher payout warnings from traffic blockers and names their account scope', function () {
    $f = conversionFixture();
    $f['publisher']->update(['payout_threshold' => 50]);
    $earning = overviewOutcome($f, 'threshold');
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');
    $overview = overviewFor($f, true);
    $alert = collect($overview['alerts'])->firstWhere('code', 'threshold');
    expect($alert['blocks'])->toBeFalse()->and($alert['values']['remaining'])->toBe('USD 40.00')
        ->and($alert['description'])->toContain('across campaigns')
        ->and($overview['traffic_eligible'])->toBeTrue()->and($overview['earnings']['approved'])->toEqual(10);
});

it('flags legacy commissions without counting them as approved performance', function () {
    $f = conversionFixture();
    $earning = overviewOutcome($f, 'legacy');
    $earning->update(['ledger_transaction_id' => null, 'status' => 'approved']);
    $earning->conversion->update(['status' => 'A']);
    $overview = overviewFor($f);
    expect(array_column($overview['alerts'], 'code'))->toContain('reconciliation')
        ->and($overview['metrics']['conversions'])->toBe(0)->and($overview['traffic_eligible'])->toBeTrue();
});

it('does not label traffic eligible when the only approved publisher is unverified', function () {
    $f = conversionFixture();
    $f['publisher']->user->update(['email_verified_at' => null]);
    $overview = overviewFor($f);
    expect($overview['traffic_eligible'])->toBeFalse()
        ->and(array_column($overview['alerts'], 'code'))->toContain('publisher_readiness');
    $f['publisher']->user->update(['email_verified_at' => now()]);
    expect(overviewFor($f)['traffic_eligible'])->toBeTrue();
});
