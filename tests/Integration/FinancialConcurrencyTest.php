<?php

use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\ReconciliationService;
use App\Services\Fraud\FraudAssessmentService;
use App\Services\Fraud\FraudPolicyService;
use App\Services\InvoiceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\Process\Process;
use Tests\IntegrationTestCase;

uses(IntegrationTestCase::class);

function concurrentFinancialActions(array $payloads): array
{
    $barrier = tempnam(sys_get_temp_dir(), 'dmhub-events-');
    unlink($barrier);
    $connection = config('database.connections.'.config('database.default'));
    $env = ['APP_ENV' => 'testing', 'APP_KEY' => config('app.key'), 'DB_CONNECTION' => 'pgsql',
        'DB_HOST' => $connection['host'], 'DB_PORT' => (string) $connection['port'],
        'DB_DATABASE' => $connection['database'], 'DB_USERNAME' => $connection['username'],
        'DB_PASSWORD' => $connection['password'], 'CACHE_STORE' => 'array', 'SESSION_DRIVER' => 'array',
        'QUEUE_CONNECTION' => 'sync', 'MAIL_MAILER' => 'array', 'DB_URL' => false];
    $workers = [];
    try {
        foreach ($payloads as $payload) {
            $worker = new Process([PHP_BINARY, base_path('tests/Support/financial-worker.php')], base_path(), $env);
            $worker->setTimeout(30);
            $worker->setInput(json_encode(compact('payload', 'barrier'), JSON_THROW_ON_ERROR));
            $worker->start();
            $workers[] = $worker;
        }
        $deadline = microtime(true) + 15;
        foreach ($workers as $worker) {
            while (! str_contains($worker->getOutput(), "ready\n")) {
                if (! $worker->isRunning() || microtime(true) > $deadline) {
                    throw new RuntimeException('Worker did not become ready: '.$worker->getErrorOutput());
                }
                usleep(1000);
            }
        }
        touch($barrier);
        $results = [];
        foreach ($workers as $worker) {
            $worker->wait();
            if (! $worker->isSuccessful()) {
                throw new RuntimeException($worker->getErrorOutput());
            }
            $lines = explode("\n", trim($worker->getOutput()));
            $results[] = json_decode(end($lines), true, flags: JSON_THROW_ON_ERROR);
        }

        return $results;
    } finally {
        foreach ($workers as $worker) {
            if ($worker->isRunning()) {
                $worker->stop();
            }
        }
        if (is_file($barrier)) {
            unlink($barrier);
        }
    }
}

function concurrentFinanceFixture($test): array
{
    $f = conversionFixture('CPS');
    $click = conversionClick($f);
    $test->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click,
        ['event_type' => 'purchase', 'amount' => '100.00']))->assertCreated();
    $f['earning'] = PublisherEarning::firstOrFail();
    $f['actor'] = $f['advertiser']->user_id;

    return $f;
}

it('records simultaneous deposits and refunds exactly once', function () {
    $f = concurrentFinanceFixture($this);
    $deposit = ['action' => 'deposit', 'id' => $f['advertiser']->id, 'actor' => $f['actor']];
    expect(array_column(concurrentFinancialActions([$deposit, $deposit]), 'status'))->toBe([200, 200]);
    expect($f['advertiser']->fresh()->available_budget)->toBe('1090.00');
    $refund = ['action' => 'refund', 'id' => $f['earning']->id, 'actor' => $f['actor']];
    expect(array_column(concurrentFinancialActions([$refund, $refund]), 'status'))->toBe([200, 200]);
    expect($f['earning']->fresh()->reversed_minor)->toBe(500);
    expect($f['advertiser']->fresh()->available_budget)->toBe('1095.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('reserves each earning once across concurrent invoice requests', function () {
    $f = concurrentFinanceFixture($this);
    app(EarningReviewService::class)->approve($f['earning'], $f['actor'], 'Verified');
    $request = ['action' => 'create', 'id' => $f['publisher']->id, 'actor' => $f['actor']];
    $results = concurrentFinancialActions([$request, $request]);
    expect(array_column($results, 'created'))->toEqualCanonicalizing([true, false]);
    expect(PublisherInvoice::count())->toBe(1)->and($f['earning']->fresh()->status)->toBe('locked');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('serializes approval cancellation and payment races', function (string $first, string $second) {
    $f = concurrentFinanceFixture($this);
    app(EarningReviewService::class)->approve($f['earning'], $f['actor'], 'Verified');
    $invoice = app(InvoiceService::class)->createInvoice($f['publisher']);
    if ($first === 'pay') {
        app(InvoiceService::class)->approveInvoice($invoice, $f['actor']);
    }
    $results = concurrentFinancialActions([
        ['action' => $first, 'id' => $invoice->id, 'actor' => $f['actor']],
        ['action' => $second, 'id' => $invoice->id, 'actor' => $f['actor']],
    ]);
    expect(array_column($results, 'status'))->each->toBeIn([200, 409]);
    if ($second === 'pay') {
        expect($invoice->fresh()->status)->toBe('paid');
        expect(DB::table('financial_transactions')->where('kind', 'invoice_pay')->count())->toBe(1);
    }
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
})->with([['approve', 'reject'], ['pay', 'reject'], ['pay', 'pay']]);

function concurrentFraudPolicy(array $f, int $dailyLimit = 100000): void
{
    Queue::fake();
    $policies = app(FraudPolicyService::class);
    $configuration = $policies->defaults();
    $configuration['mode'] = 'automatic';
    $configuration['wait_minutes'] = ['submission' => 0, 'purchase' => 0, 'action' => 0];
    $configuration['limits'] = ['USD' => ['max_commission_minor' => 10000, 'daily_limit_minor' => $dailyLimit]];
    foreach ($configuration['rules'] as &$rule) {
        $rule['mode'] = 'off';
    }
    unset($rule);
    $configuration['rules']['commission_amount']['mode'] = 'enforce';
    $policies->save($f['network']->id, null, $configuration, $f['actor'], 'Concurrency pilot', null);
}

it('applies concurrent fraud jobs exactly once through the ledger', function () {
    $f = concurrentFinanceFixture($this);
    concurrentFraudPolicy($f);
    $assessment = app(FraudAssessmentService::class)->request($f['earning'], true);
    $job = ['action' => 'fraud', 'id' => $assessment->id];
    expect(array_column(concurrentFinancialActions([$job, $job]), 'status'))->toBe([200, 200]);
    expect($f['earning']->fresh()->status)->toBe('approved');
    expect(DB::table('financial_transactions')->where('kind', 'approval')->count())->toBe(1);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('serializes fraud approval with human review and refunds', function (string $action) {
    $f = concurrentFinanceFixture($this);
    concurrentFraudPolicy($f);
    $assessment = app(FraudAssessmentService::class)->request($f['earning'], true);
    $results = concurrentFinancialActions([
        ['action' => 'fraud', 'id' => $assessment->id],
        ['action' => $action, 'id' => $f['earning']->id, 'actor' => $f['actor']],
    ]);
    expect(array_column($results, 'status'))->each->toBeIn([200, 409]);
    expect(DB::table('financial_transactions')->where('kind', 'approval')->count())->toBeLessThanOrEqual(1);
    if ($action === 'review') {
        expect($f['earning']->fresh()->status)->toBe('approved');
    } else {
        expect($f['earning']->fresh()->reversed_minor)->toBe(500);
    }
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
})->with(['review', 'refund']);

it('does not exceed daily automatic approval exposure across simultaneous jobs', function () {
    $f = concurrentFinanceFixture($this);
    concurrentFraudPolicy($f, 1000);
    $first = app(FraudAssessmentService::class)->request($f['earning'], true);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload(conversionClick($f),
        ['event_type' => 'purchase', 'amount' => '100.00', 'external_id' => 'second-order']))->assertCreated();
    $second = PublisherEarning::latest('id')->first()->latestFraudAssessment;
    expect(array_column(concurrentFinancialActions([
        ['action' => 'fraud', 'id' => $first->id], ['action' => 'fraud', 'id' => $second->id],
    ]), 'status'))->toBe([200, 200]);
    expect(PublisherEarning::where('status', 'approved')->count())->toBe(1)
        ->and(PublisherEarning::where('status', 'pending')->count())->toBe(1);
    expect((int) DB::table('fraud_assessments')->sum('approved_minor'))->toBe(1000);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});
