<?php

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\PartnerEnrollmentService;
use App\Services\PartnerReportingService;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Symfony\Component\Process\Process;

function partnerFixture(): array
{
    $f = conversionFixture('CPS', '10.00');
    $f['assignment']->update(['status' => 'R', 'offer_id' => null, 'tracking_link' => null, 'commission_type' => null, 'commission_value' => null]);
    $type = CommissionType::firstOrCreate(['name' => 'CPS'], ['nice_name' => 'Cost Per Sale']);
    OfferCommission::create(['offer_id' => $f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => '10.00']);

    return $f;
}

function partnerApplication(array $f): array
{
    $service = app(PartnerEnrollmentService::class);

    return ['applied_notes' => 'Audience matches this offer.', 'offer_id' => $f['offer']->id,
        'terms_accepted' => true, 'terms_version' => $service->version($service->contract($f['campaign']->fresh(), $f['offer']->fresh()))];
}

function partnerUser(User $user, array $permissions): User
{
    foreach ($permissions as $name) {
        $user->givePermissionTo(Permission::findOrCreate($name, 'web'));
    }

    return $user;
}

it('reuses rejected enrollment and preserves application rejection and acceptance history', function () {
    Notification::fake();
    $f = partnerFixture();
    $user = partnerUser($f['publisher']->user, ['apply_to_campaigns']);
    $route = route('publishers.campaign.submit.application', $f['campaign']->id);
    $this->actingAs($user)->post($route, partnerApplication($f))->assertSessionHasNoErrors()->assertSessionHas('success');
    $service = app(PartnerEnrollmentService::class);
    $service->review($f['assignment']->fresh(), $f['advertiser']->user, null, 'Please clarify traffic sources.');
    $this->post($route, partnerApplication($f))->assertSessionHas('success');
    expect(PublisherCampaigns::count())->toBe(1)
        ->and($f['assignment']->fresh()->status)->toBe('P')
        ->and($f['assignment']->fresh()->offer_id)->toBeNull()
        ->and($f['assignment']->fresh()->rejection_reason)->toBeNull()
        ->and(DB::table('partner_enrollment_events')->count())->toBe(4);
    $this->assertDatabaseHas('partner_enrollment_events', ['action' => 'rejected']);
    $approved = $service->review($f['assignment']->fresh(), $f['advertiser']->user, $f['offer']->id);
    expect($approved->status)->toBe('A')->and($approved->commission_value)->toBe('10.00')->and($approved->tracking_link)->not->toBeNull();
    $this->post($route, partnerApplication($f))->assertSessionHasErrors('offer_id');
});

it('requires current explicit consent and returns request validation errors', function () {
    $f = partnerFixture();
    $user = partnerUser($f['publisher']->user, ['apply_to_campaigns']);
    $url = route('publishers.campaign.submit.application', $f['campaign']->id);
    $input = partnerApplication($f);
    $this->actingAs($user)->post($url, [])->assertSessionHasErrors(['offer_id', 'applied_notes', 'terms_accepted', 'terms_version']);
    $this->post($url, array_replace($input, ['terms_accepted' => false]))->assertSessionHasErrors('terms_accepted');
    $f['offer']->update(['terms' => ['No incentivized traffic']]);
    $this->post($url, $input)->assertSessionHasErrors('terms_accepted');
    expect($f['assignment']->fresh()->status)->toBe('R');
});

it('blocks approval for changed contracts inactive offers capacity or a nonpending state', function (string $condition) {
    $f = partnerFixture();
    $service = app(PartnerEnrollmentService::class);
    $application = $service->apply($f['publisher'], $f['campaign']->id, partnerApplication($f));
    if ($condition === 'terms') {
        $f['campaign']->update(['terms' => ['value' => 'New agreement']]);
    }
    if ($condition === 'rate') {
        $f['offer']->commissions()->update(['commission_value' => 20]);
    }
    if ($condition === 'offer') {
        $f['offer']->update(['offer_status' => 'I']);
    }
    if ($condition === 'expired') {
        $f['offer']->update(['expires_at' => now()->subMinute()]);
    }
    if ($condition === 'membership') {
        $f['publisher']->update(['network_id' => null]);
    }
    if ($condition === 'state') {
        $application->update(['status' => 'R']);
    }
    if ($condition === 'capacity') {
        $f['campaign']->update(['max_publishers' => 1]);
        $other = Publisher::create(['user_id' => User::factory()->create()->id, 'network_id' => $f['network']->id]);
        PublisherCampaigns::create(['publisher_id' => $other->id, 'campaign_id' => $f['campaign']->id, 'network_id' => $f['network']->id, 'offer_id' => $f['offer']->id, 'status' => 'A']);
    }
    $actor = partnerUser(User::factory()->create(['is_super_admin' => true]), ['approve_applications']);
    $this->actingAs($actor)->post(route('applications.approve', $application->id), ['offer_id' => $f['offer']->id])->assertSessionHasErrors('offer_id');
    expect($application->fresh()->approved_at)->toBeNull();
})->with(['terms', 'rate', 'offer', 'expired', 'membership', 'state', 'capacity']);

it('does not approve another offer or an unrelated networks application', function () {
    $f = partnerFixture();
    $service = app(PartnerEnrollmentService::class);
    $app = $service->apply($f['publisher'], $f['campaign']->id, partnerApplication($f));
    $second = $f['offer']->replicate();
    $second->name = 'Second offer';
    $second->save();
    $actor = partnerUser(User::factory()->create(['is_super_admin' => true]), ['approve_applications']);
    $this->actingAs($actor)->post(route('applications.approve', $app->id), ['offer_id' => $second->id])->assertSessionHasErrors('offer_id');
    $outsider = partnerUser(User::factory()->create(['is_network' => true]), ['approve_applications']);
    $this->actingAs($outsider)->post(route('applications.approve', $app->id), ['offer_id' => $f['offer']->id])->assertForbidden();
});

it('allows registration without websites and retains publisher business fields', function (string $role) {
    Queue::fake();
    $this->seed(RolePermsSeeder::class);
    $this->post(route('register.store'), ['first_name' => 'Pat', 'last_name' => 'Partner', 'role_name' => $role,
        'email' => 'partner@example.test', 'coc_number' => '12345678', 'business_name' => 'Partner BV', 'industry' => 'retail']
        + ($role === 'publisher' ? ['publisher_type' => 'company', 'channels' => [['type' => 'instagram', 'handle' => '@partner']]] : []))
        ->assertSessionHasNoErrors();
    $user = User::where('email', 'partner@example.test')->firstOrFail();
    $profile = $role === 'publisher' ? $user->publisher : $user->advertiser;
    expect($profile->business_name)->toBe('Partner BV')->and($profile->industry)->toBe('retail');
    expect($role === 'publisher' ? $profile->website_url : $profile->website_name)->toBeNull();
})->with(['publisher', 'advertiser']);

it('accepts ordinary payout thresholds and searches invoices by actual user columns', function () {
    $f = conversionFixture();
    $actor = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($actor)->post(route('publishers.update', $f['publisher']->user_id), [
        'first_name' => 'Pat', 'last_name' => 'Partner', 'email' => $f['publisher']->user->email,
        'network_id' => $f['network']->id, 'website_url' => 'https://example.test', 'payout_threshold' => '100.00', 'currency' => 'USD',
    ])->assertSessionHas('success');
    expect($f['publisher']->fresh()->payout_threshold)->toBe('100.00');
    $this->get('/admin/invoices?search=Pat')->assertOk();
});

it('lets managers choose an authorized advertiser and validates campaign state', function () {
    Notification::fake();
    $f = conversionFixture();
    $actor = User::factory()->create(['is_super_admin' => true]);
    $input = ['name' => 'Managed campaign', 'advertiser_id' => $f['advertiser']->id,
        'start_date' => now()->toDateString(), 'end_date' => now()->addMonth()->toDateString(),
        'currency' => 'USD', 'total_budget' => 100, 'daily_budget' => 10];
    $this->actingAs($actor)->post(route('advertiser.campaign.store'), $input)->assertSessionHas('success');
    $campaign = Campaign::where('name', 'Managed campaign')->firstOrFail();
    expect($campaign->advertiser_id)->toBe($f['advertiser']->id);
    $this->post(route('advertiser.campaign.update', $campaign->id), $input + ['campaign_status' => 'I'])->assertSessionHas('success');
    expect($campaign->fresh()->campaign_status)->toBe('I');
    $this->post(route('advertiser.campaign.update', $campaign->id), $input + ['campaign_status' => 'invalid'])->assertSessionHasErrors('campaign_status');
    $this->post(route('advertiser.campaign.store'), [])->assertSessionHasErrors('name');
    $networkUser = partnerUser(User::factory()->create(['is_network' => true]), ['create_campaigns']);
    $other = conversionFixture();
    UserNetworks::create(['user_id' => $networkUser->id, 'network_id' => $other['network']->id]);
    $this->actingAs($networkUser)->post(route('advertiser.campaign.store'), $input)->assertSessionHasErrors('advertiser_id');
});

it('pauses offer traffic without destroying the approved enrollment', function () {
    $f = conversionFixture();
    $actor = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($actor)->patch(route('advertiser.offers.deactivate', $f['offer']))->assertSessionHas('success');
    expect($f['assignment']->fresh()->status)->toBe('A');
    $this->get($f['assignment']->tracking_link)->assertForbidden();
    $this->patch(route('advertiser.offers.activate', $f['offer']))->assertSessionHas('success');
    $this->get($f['assignment']->tracking_link)->assertRedirect();
});

it('reports publisher events independently and restates approved money after refunds', function () {
    $f = conversionFixture('CPS', '10.00');
    $f['offer']->update(['total_clicks' => 999, 'total_conversions' => 888]);
    $f['assignment']->update(['total_clicks' => 999, 'total_revenue' => 999, 'total_commission' => 999]);
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click,
        ['event_type' => 'purchase', 'external_id' => 'order-report', 'amount' => '100.00']))->assertCreated();
    $earning = PublisherEarning::firstOrFail();
    $reporting = app(PartnerReportingService::class);
    $scope = DB::table('publisher_campaigns')->where('id', $f['assignment']->id);
    expect($reporting->performance($scope)->total_conversions)->toBe(0);
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');
    app(EarningReviewService::class)->adjust($earning->fresh(), 'refund', '25.00', 'refund-report', 'Part returned', $f['advertiser']->user_id);
    $result = $reporting->performance($scope);
    expect($result->total_clicks)->toBe(1)->and($result->total_conversions)->toBe(1)
        ->and((float) $result->by_currency[0]->revenue)->toBe(75.0)
        ->and((float) $result->by_currency[0]->commission)->toBe(7.5);
    $other = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true])->id, 'network_id' => $f['network']->id]);
    $assignment = $f['assignment']->replicate(['script_token']);
    $assignment->publisher_id = $other->id;
    $assignment->save();
    $reporting->assignment($assignment);
    expect($assignment->total_clicks)->toBe(0)->and($assignment->total_conversions)->toBe(0)->and((float) $assignment->total_revenue)->toBe(0.0);
    $user = partnerUser($f['publisher']->user, ['view_my_campaigns']);
    $this->actingAs($user)->get(route('publishers.my.campaign'))->assertInertia(fn (Assert $page) => $page
        ->has('campaigns.data', 1)->where('campaigns.data.0.total_clicks', 1)->where('campaigns.data.0.total_revenue', '75.00'));
});

it('reads current offer commissions and includes unassigned pending applications', function () {
    $f = partnerFixture();
    app(PartnerEnrollmentService::class)->apply($f['publisher'], $f['campaign']->id, partnerApplication($f));
    DB::table('offers')->where('id', $f['offer']->id)->update(['commission_value_1' => 999]);
    expect((float) $f['offer']->fresh()->commission_value_1)->toBe(10.0);
    $this->actingAs(partnerUser($f['advertiser']->user, ['access_advertiser_dashboard']))->get(route('advertiser.dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('pendingApplications', 1)->where('pendingApplications.0.offer_name', null));
});

it('serves a paginated marketplace with publisher scoped status filters and review notes', function () {
    $f = partnerFixture();
    $other = partnerFixture();
    $f['assignment']->update(['rejection_reason' => 'Explain your audience']);
    $user = partnerUser($f['publisher']->user, ['access_publisher_dashboard']);
    $this->actingAs($user)->get(route('publisher.dashboard', ['application_status' => 'R']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('campaigns.data', 1)
            ->where('campaigns.data.0.enrollment.rejection_reason', 'Explain your audience')
            ->where('campaigns.data.0.offers.0.commission_value_1', fn ($value) => (float) $value === 10.0));
    $this->get(route('publisher.dashboard', ['application_status' => 'none']))
        ->assertInertia(fn (Assert $page) => $page->has('campaigns.data', 0));
});

it('keeps reporting currencies separate and reconciles chart totals after review and reversal', function () {
    $usd = conversionFixture('CPS');
    $eur = conversionFixture('CPS');
    // A separate advertiser with no funding yet is needed for a different currency.
    $advertiser = Advertiser::create(['user_id' => User::factory()->create(['is_advertiser' => true])->id,
        'network_id' => $eur['network']->id, 'business_name' => 'Euro merchant', 'industry' => 'retail', 'currency' => 'EUR', 'status' => 'A']);
    app(FundingService::class)->deposit($advertiser, '1000.00', 'EUR', 'euro-bank', 'receipt', $advertiser->user_id);
    $eur['campaign']->update(['advertiser_id' => $advertiser->id, 'currency' => 'EUR']);
    $eur['credential']->update(['advertiser_id' => $advertiser->id]);
    foreach ([$usd, $eur] as $f) {
        $currency = $f['campaign']->fresh()->currency;
        $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload(conversionClick($f),
            ['event_type' => 'purchase', 'amount' => '100.00', 'currency' => $currency]))->assertCreated();
        app(EarningReviewService::class)->approve(PublisherEarning::latest('id')->first(), $f['advertiser']->user_id, 'Verified');
    }
    $service = app(PartnerReportingService::class);
    $scope = DB::table('publisher_campaigns');
    $summary = $service->performance($scope);
    expect($summary->by_currency->pluck('currency')->all())->toBe(['EUR', 'USD']);
    foreach ($service->daily($scope) as $series) {
        expect(array_sum(array_column($series['days'], 'revenue')))->toBe(100.0);
    }
    app(EarningReviewService::class)->adjust(PublisherEarning::first(), 'reversal', null, 'cancelled', 'Order cancelled', $usd['advertiser']->user_id);
    expect($service->performance($scope)->total_conversions)->toBe(1);
});

it('supports multiple SDK instances and rejects unsupported popup settings', function () {
    $first = conversionFixture();
    $second = conversionFixture();
    $scripts = [];
    foreach ([$first, $second] as $f) {
        $scripts[] = $this->get('/s/'.$f['assignment']->script_token.'.js')->assertOk()->getContent();
    }
    $process = new Process(['node', base_path('tests/js/partner-sdk.mjs')]);
    $process->setInput(json_encode($scripts));
    $process->mustRun();
    expect($process->getOutput())->toBe('ok');
    $user = partnerUser($first['publisher']->user, ['manage_publisher_account']);
    $this->actingAs($user)->putJson('/api/v1/assets/campaign/'.$first['assignment']->id.'/settings', ['form_trigger' => 'auto'])
        ->assertNotFound();
    $this->get('/docs/script/'.$first['assignment']->script_token.'/download')->assertOk()->assertSee('SDK v2')->assertSee('DMHub.instances');
});

it('retains append-only enrollment evidence and existing financial triggers after migration', function () {
    $f = partnerFixture();
    app(PartnerEnrollmentService::class)->apply($f['publisher'], $f['campaign']->id, partnerApplication($f));
    expect(fn () => DB::transaction(fn () => DB::table('partner_enrollment_events')->delete()))->toThrow(QueryException::class);
    expect(fn () => DB::transaction(fn () => DB::table('advertisers')->where('id', $f['advertiser']->id)->update(['currency' => 'EUR'])))->toThrow(QueryException::class);
});
