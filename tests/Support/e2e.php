<?php

// Fixture helper for the everyday-workflow browser suite (npm run test:e2e).
//   php tests/Support/e2e.php seed    add campaigns, an approved earning, etc.
//   php tests/Support/e2e.php state   print a JSON snapshot for assertions
// Only runs inside the disposable SQLite database created by scripts/e2e/run.mjs.

use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\CommissionType;
use App\Models\Network;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\PostbackCredential;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\PartnerEnrollmentService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
set_exception_handler(function (Throwable $error): never {
    fwrite(STDERR, $error->getMessage().PHP_EOL);
    exit(1);
});

$runDir = getenv('E2E_RUN_DIR');
$database = (string) config('database.connections.sqlite.database');
if (! app()->environment('testing') || ! $runDir || ! is_dir($runDir)
    || DB::getDefaultConnection() !== 'sqlite' || ! str_starts_with(realpath($database) ?: '', realpath($runDir))) {
    throw new RuntimeException('E2E helpers only run through npm run test:e2e against its disposable SQLite database.');
}

$action = $argv[1] ?? '';

if ($action === 'seed') {
    $network = Network::where('owner_email', 'admin@dmhub.com')->firstOrFail();
    // A small payout threshold so the publisher can invoice the seeded earning.
    $network->update(['min_payment_threshold' => 5]);
    $advertiser = Advertiser::whereHas('user', fn ($q) => $q->where('email', 'advertiser@dmhub.com'))->firstOrFail();
    $publisher = Publisher::whereHas('user', fn ($q) => $q->where('email', 'publisher@dmhub.com'))->firstOrFail();

    app(FundingService::class)->deposit($advertiser, '5000.00', 'EUR', 'e2e-deposit-1', 'E2E bank receipt', $advertiser->user_id);

    $campaign = fn (string $name) => Campaign::create([
        'network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => $name,
        'description' => "$name campaign used by the browser workflow suite.",
        'start_date' => now()->subDay(), 'end_date' => now()->addMonths(2),
        'campaign_status' => 'A', 'currency' => 'EUR', 'total_budget' => 2000,
    ]);
    $cpl = CommissionType::where('name', 'CPL')->firstOrFail();
    $offer = function (Campaign $c, string $name) use ($network, $cpl) {
        $offer = Offer::create([
            'campaign_id' => $c->id, 'network_id' => $network->id, 'name' => $name, 'offer_status' => 'A',
            'preview_url' => 'https://advertiser.example.test/', 'conversion_window_hours' => 72,
            'click_cookie_lifetime_hours' => 24,
        ]);
        // Exactly one supported commission rule, as enrollment requires.
        OfferCommission::create(['offer_id' => $offer->id, 'commission_type_id' => $cpl->id, 'commission_value' => '25.00']);

        return $offer;
    };

    // 1. A running campaign the publisher already promotes, with one approved earning.
    $running = $campaign('E2E Running Campaign');
    $runningOffer = $offer($running, 'E2E Running Offer');
    $assignment = PublisherCampaigns::create([
        'publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $running->id,
        'offer_id' => $runningOffer->id, 'status' => 'A', 'commission_type' => 'CPL', 'commission_value' => '25.00',
        'tracking_link' => url('/t/'.Str::random(20)),
    ]);
    $click = Clicks::create([
        'publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $running->id,
        'offer_id' => $runningOffer->id, 'publisher_campaign_id' => $assignment->id, 'clicked_at' => now(),
        'device_type' => 'desktop', 'country_iso' => 'NLD',
    ]);
    $token = Str::random(64);
    PostbackCredential::create(['advertiser_id' => $advertiser->id, 'name' => 'e2e',
        'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHour()]);
    // Go through the real postback endpoint so ledger, fraud and commission rules all apply.
    $response = app(HttpKernel::class)->handle(Request::create('/api/v1/events', 'POST', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer '.$token, 'HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json',
    ], json_encode([
        'event_type' => 'submission', 'external_id' => 'e2e-submission-1', 'referral_id' => $click->referral_id,
        'occurred_at' => now()->toISOString(), 'amount' => '0.00', 'currency' => 'EUR', 'successful' => true,
        'spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false],
    ])));
    if ($response->getStatusCode() !== 201) {
        throw new RuntimeException('Seed conversion failed: '.$response->getStatusCode().' '.$response->getContent());
    }
    $earning = PublisherEarning::latest('id')->firstOrFail();
    if ($earning->status !== 'approved') {
        app(EarningReviewService::class)->approve($earning, $advertiser->user_id, 'E2E verified');
    }

    // 2. An open campaign the publisher has not applied to yet.
    $open = $campaign('E2E Open Campaign');
    $offer($open, 'E2E Open Offer');

    // 3. A second open campaign for the marketplace and dashboard approval flow (dashboards.spec).
    $marketplace = $campaign('E2E Marketplace Campaign');
    $offer($marketplace, 'E2E Marketplace Offer');

    // 4. A campaign with three pending applications from other publishers, for the
    //    review drawer, reject-with-reason and bulk approval (applications.spec).
    $review = $campaign('E2E Review Campaign');
    $reviewOffer = $offer($review, 'E2E Review Offer');
    $enrollment = app(PartnerEnrollmentService::class);
    foreach (['E2E Bulk One', 'E2E Bulk Two', 'E2E Reject Me'] as $i => $business) {
        $user = User::factory()->withoutTwoFactor()->create([
            'first_name' => 'Applicant', 'last_name' => (string) ($i + 1), 'email' => 'applicant'.($i + 1).'@dmhub.test',
            'password' => 'Abcd1234!', 'is_publisher' => true, 'status' => 'A',
        ]);
        $applicant = Publisher::create(['user_id' => $user->id, 'network_id' => $network->id, 'business_name' => $business,
            'website_url' => 'https://'.Str::slug($business).'.example.test', 'is_verified' => true, 'traffic_sources' => ['content']]);
        $enrollment->apply($applicant, $review->id, [
            'applied_notes' => "$business would feature this campaign in a newsletter.", 'offer_id' => $reviewOffer->id,
            'terms_accepted' => true, 'terms_version' => $enrollment->version($enrollment->contract($review->fresh(), $reviewOffer->fresh())),
        ]);
    }

    // 6. A USD advertiser and campaign with one approved earning, so the publisher
    //    has money in two currencies (finance.spec currency switch).
    $dollarUser = User::factory()->withoutTwoFactor()->create([
        'first_name' => 'Dollar', 'last_name' => 'Advertiser', 'email' => 'dollar-advertiser@dmhub.test',
        'password' => 'Abcd1234!', 'is_advertiser' => true, 'status' => 'A',
    ]);
    $dollarAdvertiser = Advertiser::create(['user_id' => $dollarUser->id, 'network_id' => $network->id,
        'business_name' => 'E2E Dollar Brand', 'website_name' => 'https://dollar.example.test', 'industry' => 'retail',
        'status' => 'A', 'available_budget' => 0, 'currency' => 'USD']);
    app(FundingService::class)->deposit($dollarAdvertiser, '1000.00', 'USD', 'e2e-deposit-usd', 'E2E bank receipt', $dollarUser->id);
    $dollar = Campaign::create([
        'network_id' => $network->id, 'advertiser_id' => $dollarAdvertiser->id, 'name' => 'E2E Dollar Campaign',
        'description' => 'A USD campaign used by the finance workflow suite.',
        'start_date' => now()->subDay(), 'end_date' => now()->addMonths(2),
        'campaign_status' => 'A', 'currency' => 'USD', 'total_budget' => 2000,
    ]);
    $dollarOffer = $offer($dollar, 'E2E Dollar Offer');
    $dollarAssignment = PublisherCampaigns::create([
        'publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $dollar->id,
        'offer_id' => $dollarOffer->id, 'status' => 'A', 'commission_type' => 'CPL', 'commission_value' => '25.00',
        'tracking_link' => url('/t/'.Str::random(20)),
    ]);
    $dollarClick = Clicks::create([
        'publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $dollar->id,
        'offer_id' => $dollarOffer->id, 'publisher_campaign_id' => $dollarAssignment->id, 'clicked_at' => now(),
        'device_type' => 'desktop', 'country_iso' => 'USA',
    ]);
    $dollarToken = Str::random(64);
    PostbackCredential::create(['advertiser_id' => $dollarAdvertiser->id, 'name' => 'e2e-usd',
        'token_hash' => hash('sha256', $dollarToken), 'expires_at' => now()->addHour()]);
    $response = app(HttpKernel::class)->handle(Request::create('/api/v1/events', 'POST', [], [], [], [
        'HTTP_AUTHORIZATION' => 'Bearer '.$dollarToken, 'HTTP_ACCEPT' => 'application/json', 'CONTENT_TYPE' => 'application/json',
    ], json_encode([
        'event_type' => 'submission', 'external_id' => 'e2e-submission-usd', 'referral_id' => $dollarClick->referral_id,
        'occurred_at' => now()->toISOString(), 'amount' => '0.00', 'currency' => 'USD', 'successful' => true,
        'spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false],
    ])));
    if ($response->getStatusCode() !== 201) {
        throw new RuntimeException('USD seed conversion failed: '.$response->getStatusCode().' '.$response->getContent());
    }
    // Approved like the EUR earning, so no fraud-review badge changes other specs.
    $dollarEarning = PublisherEarning::latest('id')->firstOrFail();
    if ($dollarEarning->status !== 'approved') {
        app(EarningReviewService::class)->approve($dollarEarning, $dollarUser->id, 'E2E verified');
    }

    // 5. An active account that has not verified its email yet (auth.spec).
    User::factory()->unverified()->withoutTwoFactor()->create([
        'first_name' => 'E2E', 'last_name' => 'Unverified', 'email' => 'unverified@dmhub.test',
        'password' => 'Abcd1234!', 'is_publisher' => true,
    ]);

    // 7. Account settings (settings.spec): a super admin whose password and 2FA the
    //    spec changes, so the shared demo personas keep their credentials.
    $settingsUser = User::factory()->withoutTwoFactor()->create([
        'first_name' => 'E2E', 'last_name' => 'Settings', 'email' => 'settings@dmhub.test',
        'password' => 'Abcd1234!', 'is_super_admin' => true, 'status' => 'A', 'locale' => 'en',
    ]);
    $settingsUser->assignRoleById(Role::findByName('super_admin')->id);

    // 8. A network team member without any role yet (admin.spec assigns one).
    $staff = User::factory()->withoutTwoFactor()->create([
        'first_name' => 'E2E', 'last_name' => 'Staff', 'email' => 'staff@dmhub.test',
        'password' => 'Abcd1234!', 'is_network' => true, 'status' => 'A', 'locale' => 'en',
    ]);
    UserNetworks::create(['user_id' => $staff->id, 'network_id' => $network->id, 'status' => 'A']);

    echo 'seeded'.PHP_EOL;
} elseif ($action === 'state') {
    echo json_encode([
        'campaigns' => Campaign::orderBy('id')->get(['id', 'name', 'campaign_status']),
        'offers' => Offer::orderBy('id')->get(['id', 'name', 'campaign_id', 'offer_status']),
        'publisher_campaigns' => PublisherCampaigns::orderBy('id')->get(['id', 'publisher_id', 'campaign_id', 'status']),
        'publisher_earnings' => PublisherEarning::orderBy('id')->get(['id', 'publisher_id', 'amount', 'currency', 'status', 'invoice_id']),
        'publisher_invoices' => DB::table('publisher_invoices')->orderBy('id')->get(['id', 'publisher_id', 'status', 'amount', 'currency']),
        'users' => DB::table('users')->orderBy('id')->get(['id', 'email', 'first_name', 'last_name', 'status', 'locale']),
    ], JSON_PRETTY_PRINT).PHP_EOL;
} else {
    fwrite(STDERR, "Usage: php tests/Support/e2e.php seed|state\n");
    exit(1);
}
