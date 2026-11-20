<?php

use App\Models\Conversion;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignAnalyticsService;
use App\Services\Finance\EarningReviewService;
use Carbon\CarbonImmutable;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->travelTo(CarbonImmutable::parse('2026-11-04 15:00:00', 'UTC'));
    $this->f = conversionFixture('CPS', '10.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->url = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'analytics']);
    $this->export = route('campaign.analytics.export', $this->f['campaign']);
    $this->actingAs($this->manager);
});

function analyticsOutcome(array $f, string $reference, bool $approve = true): PublisherEarning
{
    test()->travel(1)->seconds();
    $click = conversionClick($f);
    test()->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '100.00', 'external_id' => $reference]))->assertCreated();
    $earning = PublisherEarning::where('conversion_id', Conversion::where('click_id', $click->id)->sole()->id)->sole();
    if ($approve) {
        app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');
    }

    return $earning->fresh();
}

function analyticsData(array $f, array $filters = [], bool $publisher = false): array
{
    return app(CampaignAnalyticsService::class)->build($f['campaign'], Request::create('/', 'GET', $filters), $publisher ? $f['assignment']->fresh() : null);
}

it('renders the screenshot metrics from reviewed net performance and excludes pending rejected and reversed outcomes', function () {
    $f = $this->f;
    $approved = analyticsOutcome($f, 'approved');
    app(EarningReviewService::class)->adjust($approved, 'refund', '40.00', 'partial', 'Returned items', $this->manager->id);
    analyticsOutcome($f, 'pending', false);
    $rejected = analyticsOutcome($f, 'rejected', false);
    app(EarningReviewService::class)->adjust($rejected, 'rejection', null, 'reject', 'Invalid', $this->manager->id);
    $reversed = analyticsOutcome($f, 'reversed');
    app(EarningReviewService::class)->adjust($reversed, 'refund', '100.00', 'full', 'Returned order', $this->manager->id);
    $this->get($this->url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('analyticsWorkspace.metrics.clicks', 4)->where('analyticsWorkspace.metrics.conversions', 1)
        ->where('analyticsWorkspace.metrics.sales', 60)->where('analyticsWorkspace.metrics.commissions', 6)
        ->where('analyticsWorkspace.metrics.conversion_rate', 25)->where('analyticsWorkspace.metrics.earnings_per_click', 1.5)
        ->where('analyticsWorkspace.pending', 1)->has('analyticsWorkspace.days', 30)
        ->where('analyticsWorkspace.breakdowns.offer.0.sales', 60));
});

it('uses the same UTC dates for clicks daily results pending review and exports', function () {
    $old = analyticsOutcome($this->f, 'old');
    $old->conversion->update(['conversion_date' => '2026-10-05']);
    $old->conversion->click->update(['clicked_at' => '2026-10-05 23:59:59']);
    $current = analyticsOutcome($this->f, 'current');
    $current->conversion->update(['conversion_date' => '2026-10-06']);
    $current->conversion->click->update(['clicked_at' => '2026-10-06 00:00:00']);
    $pending = analyticsOutcome($this->f, 'old-pending', false);
    $pending->conversion->update(['conversion_date' => '2026-10-05']);
    $pending->conversion->click->update(['clicked_at' => '2026-10-05 23:59:58']);
    $data = analyticsData($this->f);
    expect($data['filters']['start'])->toBe('2026-10-06')->and($data['metrics']['clicks'])->toBe(1)
        ->and($data['metrics']['conversions'])->toBe(1)->and($data['pending'])->toBe(0)
        ->and($data['days'][0]['conversions'])->toBe(1)->and(array_sum(array_column($data['days'], 'commissions')))->toEqual(10);
    $response = $this->get($this->export.'?format=csv&dataset=daily&start=2026-10-06&end=2026-10-06')->assertOk();
    expect($response->streamedContent())->toContain('2026-10-06,1,1,100,10,100,10')->not->toContain('2026-10-05,');
});

it('filters on original offer attribution even after the assignment changes and includes offers with no outcomes', function () {
    analyticsOutcome($this->f, 'first');
    $second = Offer::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id, 'name' => 'Second offer']);
    $this->f['assignment']->update(['offer_id' => $second->id]);
    $data = analyticsData($this->f, ['offer' => $this->f['offer']->id]);
    expect($data['metrics']['conversions'])->toBe(1)->and($data['breakdowns']['offer'])->toHaveCount(1);
    $empty = analyticsData($this->f, ['offer' => $second->id]);
    expect($empty['metrics']['clicks'])->toBe(0)->and($empty['metrics']['earnings_per_click'])->toEqual(0)
        ->and($empty['breakdowns']['offer'][0]['purchases'])->toBe(0);
    expect(analyticsData($this->f, [], true)['offers'])->toHaveCount(2);
});

it('scopes publisher results and exports to their own assignment and hides other publishers', function () {
    analyticsOutcome($this->f, 'own');
    $other = conversionFixture();
    PublisherCampaigns::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id,
        'offer_id' => $this->f['offer']->id, 'publisher_id' => $other['publisher']->id, 'status' => 'A']);
    $private = Offer::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id, 'name' => 'Private offer']);
    $url = route('publishers.my.campaign.show', ['id' => $this->f['assignment']->id, 'tab' => 'analytics']);
    $export = route('publisher.analytics.export', $this->f['assignment']);
    $this->actingAs($this->f['publisher']->user)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('analyticsWorkspace.publisher_view', true)->has('analyticsWorkspace.publishers', 0)
        ->missing('analyticsWorkspace.breakdowns.publisher')->has('analyticsWorkspace.offers', 1)
        ->where('analyticsWorkspace.metrics.conversions', 1));
    $this->get($url.'&publisher='.$other['publisher']->id)->assertNotFound();
    $this->get($url.'&offer='.$private->id)->assertNotFound();
    $this->get($export.'?format=csv&publisher='.$other['publisher']->id)->assertNotFound();
    $this->get($export.'?format=csv&group=publisher')->assertSessionHasErrors('group');
    $this->get(route('publisher.analytics.export', $other['assignment']).'?format=csv')->assertNotFound();
    $this->get($this->export.'?format=csv')->assertRedirect(route('dashboard'));
    $csv = $this->get($export.'?format=csv')->assertOk()->streamedContent();
    expect($csv)->toContain('Your assignment only')->not->toContain('Private offer');
});

it('allows all manager roles with campaign visibility and enforces network and advertiser export boundaries', function () {
    $foreign = conversionFixture();
    $this->get($this->url)->assertOk();
    $this->get(route('campaign.analytics.export', $foreign['campaign']).'?format=csv')->assertNotFound();
    $this->get($this->url.'&offer='.$foreign['offer']->id)->assertNotFound();
    $this->get($this->export.'?format=csv&publisher='.$foreign['publisher']->id)->assertNotFound();
    $network = User::factory()->create(['is_network' => true]);
    $network->assignRoleById(Role::findByName('network_owner')->id);
    UserNetworks::create(['user_id' => $network->id, 'network_id' => $this->f['network']->id]);
    $this->actingAs($network)->get($this->url)->assertOk();
    $this->get($this->export.'?format=csv')->assertOk();
    $this->get(route('campaign.analytics.export', $foreign['campaign']).'?format=csv')->assertNotFound();
    $this->actingAs(User::factory()->create(['is_super_admin' => true]))->get($this->url)->assertOk();
    $this->get(route('campaign.analytics.export', $foreign['campaign']).'?format=csv')->assertOk();
});

it('validates filters consistently for the page and export', function (string $query, string $field) {
    $this->get($this->url.'&'.$query)->assertSessionHasErrors($field);
    $this->get($this->export.'?format=csv&'.$query)->assertSessionHasErrors($field);
})->with([
    ['start=invalid', 'start'], ['end=2026-02-30', 'end'], ['start=2026-11-05&end=2026-11-04', 'start'],
    ['start=2020-01-01&end=2026-11-04', 'start'], ['offer[]=1', 'offer'], ['publisher=-1', 'publisher'], ['group=invalid', 'group'],
]);

it('exports filtered CSV and a full Excel workbook with literal text names and numeric metrics', function () {
    $this->f['offer']->update(['name' => '=HYPERLINK("https://example.test")']);
    analyticsOutcome($this->f, 'export');
    $csv = $this->get($this->export.'?format=csv&offer='.$this->f['offer']->id)->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')->streamedContent();
    expect($csv)->toContain("'=HYPERLINK")->toContain(',1,1,100,10,100,10');
    $response = $this->get($this->export.'?format=xlsx&offer='.$this->f['offer']->id)->assertOk();
    Cell::setValueBinder(new DefaultValueBinder);
    $workbook = IOFactory::load($response->baseResponse->getFile()->getPathname());
    expect($workbook->getSheetNames())->toBe(['Summary', 'By offer', 'By publisher', 'Daily']);
    $sheet = $workbook->getSheetByName('By offer');
    $last = $sheet->getHighestDataRow();
    expect($sheet->getCell('A'.$last)->getValue())->toBe($this->f['offer']->name)
        ->and($sheet->getCell('A'.$last)->getDataType())->toBe(DataType::TYPE_STRING)
        ->and($sheet->getCell('B'.$last)->getValue())->toEqual(1)
        ->and($sheet->getCell('B'.$last)->getDataType())->toBe(DataType::TYPE_NUMERIC);
    $workbook->disconnectWorksheets();
});

it('reconciles totals and both breakdowns while filtering one of multiple publishers', function () {
    analyticsOutcome($this->f, 'first-publisher');
    $other = conversionFixture('CPS', '10.00');
    $other['publisher']->update(['network_id' => $this->f['network']->id]);
    $assignment = PublisherCampaigns::create(['campaign_id' => $this->f['campaign']->id, 'network_id' => $this->f['network']->id,
        'publisher_id' => $other['publisher']->id, 'offer_id' => $this->f['offer']->id, 'status' => 'A',
        'commission_type' => 'CPS', 'commission_value' => '10.00']);
    analyticsOutcome([...$this->f, 'publisher' => $other['publisher'], 'assignment' => $assignment], 'second-publisher');
    $all = analyticsData($this->f);
    foreach (['offer', 'publisher'] as $group) {
        foreach (['clicks', 'conversions', 'sales', 'commissions'] as $metric) {
            expect(array_sum(array_column($all['breakdowns'][$group], $metric)))->toEqual($all['metrics'][$metric]);
        }
    }
    $filtered = analyticsData($this->f, ['publisher' => $other['publisher']->id, 'group' => 'publisher']);
    expect($filtered['metrics']['conversions'])->toBe(1)->and($filtered['breakdowns']['publisher'])->toHaveCount(1);
    $own = analyticsData($this->f, [], true);
    expect($own['metrics']['conversions'])->toBe(1)->and($own['metrics']['commissions'])->toEqual(10);
});

it('requires current business permissions for analytics and exports', function () {
    $this->manager->syncRoles([]);
    $this->get($this->url)->assertForbidden();
    $this->get($this->export.'?format=csv')->assertForbidden();
    $publisher = $this->f['publisher']->user;
    $publisher->syncRoles([]);
    $this->actingAs($publisher)->get(route('publisher.analytics.export', $this->f['assignment']).'?format=xlsx')->assertForbidden();
});

it('keeps zero metrics as numeric cells in empty Excel reports', function () {
    $response = $this->get($this->export.'?format=xlsx')->assertOk();
    Cell::setValueBinder(new DefaultValueBinder);
    $workbook = IOFactory::load($response->baseResponse->getFile()->getPathname());
    $sheet = $workbook->getSheetByName('By offer');
    $last = $sheet->getHighestDataRow();
    expect($sheet->getCell('B'.$last)->getValue())->toBe(0)
        ->and($sheet->getCell('B'.$last)->getDataType())->toBe(DataType::TYPE_NUMERIC)
        ->and($sheet->getCell('D'.$last)->getValue())->toBeNull();
    $workbook->disconnectWorksheets();
});
