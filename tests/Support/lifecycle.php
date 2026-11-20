<?php

use App\Models\Advertiser;
use App\Models\PostbackCredential;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Services\Finance\ReconciliationService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
// Laravel's default CLI exception handler renders errors but can exit successfully here.
set_exception_handler(function (Throwable $error): never {
    fwrite(STDERR, $error->getMessage().PHP_EOL);
    exit(1);
});
$target = getenv('DB_DATABASE');
$directory = getenv('LIFECYCLE_RUN_DIR');
$connection = config('database.connections.pgsql');
if (! app()->environment('testing') || ! preg_match('/^dmhub_e2e_[a-f0-9]{16}$/D', $target ?: '')
    || ! $directory || ! is_dir($directory) || DB::getDefaultConnection() !== 'pgsql'
    || $connection['database'] !== $target || ! empty($connection['url'])
    || ! in_array($connection['host'], ['localhost', '127.0.0.1', '::1'], true)) {
    throw new RuntimeException('Lifecycle helpers require the runner, a disposable dmhub_e2e database, and loopback PostgreSQL.');
}
$action = $argv[1] ?? '';
if (in_array($action, ['create', 'drop'], true)) {
    config(['database.connections.lifecycle_admin' => array_merge($connection, ['database' => 'postgres'])]);
    $admin = DB::connection('lifecycle_admin');
    // Identifiers are validated above, never derived from an existing user DB.
    if ($action === 'create') {
        $admin->statement('CREATE DATABASE "'.$target.'"');
        file_put_contents($directory.'/database-owner', $target);
    } else {
        if (@file_get_contents($directory.'/database-owner') !== $target) {
            throw new RuntimeException('Refusing cleanup without this run\'s ownership marker.');
        }
        $admin->select('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ? AND pid <> pg_backend_pid()', [$target]);
        $admin->statement('DROP DATABASE "'.$target.'"');
    }
    echo $action.' '.$target.PHP_EOL;
} elseif ($action === 'baseline') {
    // Only an existing seeded demo profile, for independent negative-form tests.
    Advertiser::whereHas('user', fn ($q) => $q->where('email', 'advertiser@dmhub.com'))
        ->update(['coc_number' => 'E2E999999']);
    Publisher::whereHas('user', fn ($q) => $q->where('email', 'publisher@dmhub.com'))
        ->update(['coc_number' => 'E2E999999']);
    file_put_contents($directory.'/merchant.json', json_encode(['scripts' => [], 'credential' => '']));
    chmod($directory.'/merchant.json', 0600);
} elseif ($action === 'merchant') {
    $advertiser = Advertiser::whereHas('user', fn ($q) => $q->where('email', $argv[2]))->firstOrFail();
    $token = Str::random(64);
    PostbackCredential::create(['advertiser_id' => $advertiser->id, 'name' => 'lifecycle-test',
        'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHour()]);
    $assignments = PublisherCampaigns::whereHas('campaign', fn ($q) => $q->where('advertiser_id', $advertiser->id))
        ->where('status', 'A')->orderBy('id')->get();
    $scripts = [];
    foreach ($assignments as $assignment) {
        $kind = $assignment->commission_type === 'CPL' ? 'submission' : 'purchase';
        $scripts[$kind] ??= $assignment->getScriptUrl();
    }
    file_put_contents($directory.'/merchant.json', json_encode(['credential' => $token, 'scripts' => $scripts], JSON_THROW_ON_ERROR));
    chmod($directory.'/merchant.json', 0600);
    echo "Merchant configured\n";
} elseif ($action === 'state') {
    $columns = [
        'users' => ['id', 'email', 'status', 'locale', 'email_verified_at'],
        'advertisers' => ['id', 'user_id', 'network_id', 'status', 'currency', 'available_budget'],
        'publishers' => ['id', 'user_id', 'network_id', 'is_verified'],
        'campaigns' => ['id', 'name', 'campaign_status', 'currency', 'total_budget', 'spent_amount', 'start_date'],
        'offers' => ['id', 'campaign_id', 'name', 'offer_status'],
        'publisher_campaigns' => ['id', 'publisher_id', 'campaign_id', 'offer_id', 'status', 'tracking_link'],
        'clicks' => ['id', 'publisher_id', 'campaign_id', 'referral_id', 'is_converted'],
        'conversion_events' => ['id', 'event_type', 'external_id'],
        'conversions' => ['id', 'publisher_id', 'sale_amount', 'status'],
        'publisher_earnings' => ['id', 'publisher_id', 'amount', 'currency', 'status'],
    ];
    $result = [];
    foreach ($columns as $table => $fields) {
        $result[$table] = DB::table($table)->orderBy('id')->get($fields);
    }
    $result['reconciliation_issues'] = app(ReconciliationService::class)->inspect();
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
} else {
    throw new RuntimeException('Unknown lifecycle helper action.');
}
