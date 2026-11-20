<?php

use App\Models\ConversionEvent;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\ReconciliationService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
require __DIR__.'/ConversionFixtures.php';
set_exception_handler(function (Throwable $error): never {
    fwrite(STDERR, $error->getMessage().PHP_EOL);
    exit(1);
});

if (! app()->environment('testing') || DB::getDriverName() !== 'pgsql'
    || ! str_ends_with(DB::connection()->getDatabaseName(), '_qualification')) {
    throw new RuntimeException('Release fixtures require APP_ENV=testing and a PostgreSQL *_qualification database.');
}

$action = $argv[1] ?? '';
if ($action === 'seed') {
    if (User::exists()) {
        throw new RuntimeException('Release fixture requires a freshly migrated empty database.');
    }
    $f = conversionFixture();
    $f['offer']->update(['preview_url' => 'http://127.0.0.1:8766/']);
    $other = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true])->id,
        'network_id' => $f['network']->id, 'website_url' => 'https://second.example']);
    $second = $f['assignment']->replicate(['script_token']);
    $second->publisher_id = $other->id;
    $second->tracking_link = url('/t/'.Str::uuid());
    $second->save();
    $sale = conversionFixture('CPS');
    $saleClick = conversionClick($sale);
    $expired = conversionClick($f);
    $expired->update(['clicked_at' => now()->subDays(5), 'referral_expires_at' => now()->subDays(4), 'conversion_expires_at' => now()->subDays(2)]);
    echo json_encode(['links' => [$f['assignment']->tracking_link, $second->tracking_link],
        'script' => $f['assignment']->getScriptUrl(), 'token' => $f['token'],
        'publishers' => [$f['publisher']->id, $other->id], 'expired' => $expired->referral_id,
        'sale_token' => $sale['token'], 'sale_referral' => $saleClick->referral_id], JSON_THROW_ON_ERROR);
} elseif ($action === 'state') {
    echo json_encode(['events' => ConversionEvent::orderBy('id')->get()->map(fn ($event) => ['external_id' => $event->external_id, 'publisher_id' => $event->attribution['publisher_id']]),
        'earnings' => PublisherEarning::orderBy('id')->get(['publisher_id', 'amount', 'status']),
        'issues' => app(ReconciliationService::class)->inspect()], JSON_THROW_ON_ERROR);
} elseif ($action === 'snapshot') {
    $issues = app(ReconciliationService::class)->inspect();
    if ($issues !== []) {
        throw new RuntimeException(json_encode($issues));
    }
    $snapshot = [];
    foreach (DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename") as $table) {
        $quoted = '"'.str_replace('"', '""', $table->tablename).'"';
        $rows = array_map(fn ($r) => $r->row, DB::select("SELECT row_to_json(t)::text AS row FROM {$quoted} t"));
        sort($rows);
        $snapshot[$table->tablename] = hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR));
    }
    // Sequences must also survive, or the first post-recovery insert can collide.
    $snapshot['sequences'] = DB::select("SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename");
    echo json_encode($snapshot, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
} elseif ($action === 'review') {
    $earning = PublisherEarning::firstOrFail();
    app(EarningReviewService::class)->approve($earning, $earning->publisher->user_id, 'Restore drill approval');
    try {
        DB::table('financial_transactions')->where('id', $earning->ledger_transaction_id)->update(['kind' => 'tampered']);
        throw new RuntimeException('Restored database lost its append-only protection');
    } catch (QueryException $error) {
        if (! str_contains($error->getMessage(), 'Financial history is append-only')) {
            throw $error;
        }
    }
} else {
    throw new RuntimeException('Unknown fixture operation');
}
