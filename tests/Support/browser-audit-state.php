<?php

use App\Services\Finance\ReconciliationService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Read-only evidence for the manual Chromium lifecycle audit.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! app()->environment('testing') || DB::connection()->getDatabaseName() !== 'dmhub_browser_20261102') {
    throw new RuntimeException('Use the isolated browser audit database.');
}
$tables = [
    'users' => ['id', 'email', 'status', 'email_verified_at', 'locale'],
    'advertisers' => ['id', 'user_id', 'network_id', 'status', 'currency', 'available_budget', 'spent_budget'],
    'publishers' => ['id', 'user_id', 'network_id', 'is_verified'],
    'campaigns' => ['id', 'name', 'campaign_status', 'currency', 'total_budget', 'spent_amount', 'start_date'],
    'offers' => ['id', 'campaign_id', 'name', 'offer_status', 'preview_url'],
    'publisher_campaigns' => ['id', 'campaign_id', 'publisher_id', 'offer_id', 'status', 'tracking_link'],
    'clicks' => ['id', 'publisher_id', 'campaign_id', 'offer_id', 'referral_id', 'is_converted'],
    'conversion_events' => ['id', 'event_type', 'external_id', 'status'],
    'conversions' => ['id', 'campaign_id', 'publisher_id', 'sale_amount', 'status'],
    'publisher_earnings' => ['id', 'publisher_id', 'amount', 'currency', 'status'],
];
$result = [];
foreach ($tables as $table => $columns) {
    $existing = Schema::getColumnListing($table);
    $result[$table] = DB::table($table)->orderBy('id')->get(array_values(array_intersect($columns, $existing)));
}
$result['reconciliation_issues'] = app(ReconciliationService::class)->inspect();
echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;
