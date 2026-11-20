<?php

use App\Models\ConversionEvent;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Services\Finance\FundingService;
use App\Services\Finance\ReconciliationService;
use Symfony\Component\Process\Process;
use Tests\IntegrationTestCase;

uses(IntegrationTestCase::class);

function concurrentConfirmations(string $token, array $payloads): array
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
            $worker = new Process([PHP_BINARY, base_path('tests/Support/confirm-event-worker.php')], base_path(), $env);
            $worker->setTimeout(30);
            $worker->setInput(json_encode(compact('token', 'payload', 'barrier'), JSON_THROW_ON_ERROR));
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

it('deduplicates simultaneous delivery using independent database connections', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $payload = conversionPayload($click);
    $results = concurrentConfirmations($f['token'], [$payload, $payload]);
    expect(array_column($results, 'status'))->toEqualCanonicalizing([201, 200]);
    expect(ConversionEvent::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
    expect($f['advertiser']->fresh()->available_budget)->toBe('990.00');
});

it('prevents simultaneous events from exceeding shared funds and caps', function (string $cap) {
    $f = conversionFixture('Flat');
    $click = conversionClick($f);
    match ($cap) {
        'advertiser' => app(FundingService::class)->refund($f['advertiser'], '990.00', 'USD', 'cap-test', 'Test refund', $f['advertiser']->user_id),
        'campaign' => $f['campaign']->update(['total_budget' => '10.00']),
        'daily' => $f['campaign']->update(['daily_budget' => '10.00']),
    };
    $first = conversionPayload($click, ['event_type' => 'action', 'external_id' => 'action-1']);
    $second = array_merge($first, ['external_id' => 'action-2']);
    $results = concurrentConfirmations($f['token'], [$first, $second]);
    expect(array_column($results, 'status'))->toEqualCanonicalizing([201, 422]);
    expect(PublisherEarning::count())->toBe(1)->and(ConversionEvent::count())->toBe(1);
    expect($f['campaign']->fresh()->spent_amount)->toBe('10.00');
})->with(['advertiser', 'campaign', 'daily']);

it('deduplicates competing publisher claims for the same submission ID', function () {
    $f = conversionFixture();
    $first = conversionClick($f);
    $publisher = Publisher::create([
        'user_id' => User::factory()->create(['is_publisher' => true])->id,
        'network_id' => $f['network']->id, 'website_url' => 'https://other.example',
    ]);
    $assignment = $f['assignment']->replicate(['script_token']);
    $assignment->publisher_id = $publisher->id;
    $assignment->save();
    $second = $first->replicate(['referral_id']);
    $second->publisher_id = $publisher->id;
    $second->publisher_campaign_id = $assignment->id;
    $second->save();
    $payloads = [conversionPayload($first, ['external_id' => 'submission-same']),
        conversionPayload($second, ['external_id' => 'submission-same'])];
    $results = concurrentConfirmations($f['token'], $payloads);
    expect(array_column($results, 'status'))->toEqualCanonicalizing([201, 409]);
    expect(PublisherEarning::count())->toBe(1)->and(ConversionEvent::count())->toBe(1);
});

it('serializes advertiser funds and credit across different campaigns', function (bool $postpaid) {
    $f = conversionFixture('Flat');
    $first = conversionClick($f);
    $campaign = $f['campaign']->replicate();
    $campaign->name = 'Second campaign';
    $campaign->save();
    $offer = $f['offer']->replicate();
    $offer->campaign_id = $campaign->id;
    $offer->save();
    $assignment = $f['assignment']->replicate(['script_token']);
    $assignment->campaign_id = $campaign->id;
    $assignment->offer_id = $offer->id;
    $assignment->save();
    $second = conversionClick(array_merge($f, compact('campaign', 'offer', 'assignment')));
    if ($postpaid) {
        $f['network']->update(['requires_prepaid_funding' => false]);
        $f['advertiser']->update(['credit_limit' => '10.00']);
    }
    app(FundingService::class)->refund($f['advertiser'], $postpaid ? '1000.00' : '990.00', 'USD', 'cap-test', 'Test refund', $f['advertiser']->user_id);
    $payloads = [conversionPayload($first, ['event_type' => 'action', 'external_id' => 'action-first']),
        conversionPayload($second, ['event_type' => 'action', 'external_id' => 'action-second'])];
    $results = concurrentConfirmations($f['token'], $payloads);
    expect(array_column($results, 'status'))->toEqualCanonicalizing([201, 422]);
    expect($f['advertiser']->fresh()->available_budget)->toBe($postpaid ? '-10.00' : '0.00');
    expect(PublisherEarning::count())->toBe(1)->and(ConversionEvent::count())->toBe(1);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
})->with(['prepaid' => false, 'postpaid credit' => true]);

it('deduplicates a burst of submission retries into one liability', function () {
    $f = conversionFixture();
    $click = conversionClick($f);
    $payload = conversionPayload($click);
    $results = concurrentConfirmations($f['token'], [
        $payload,
        $payload, $payload,
    ]);
    expect(array_column($results, 'status'))->each->toBeIn([200, 201]);
    expect(ConversionEvent::count())->toBe(1)->and(PublisherEarning::count())->toBe(1);
    expect($click->fresh()->is_converted)->toBeTrue();
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('exhausts budgets exactly under a burst of independent connections', function (string $cap) {
    $f = conversionFixture('Flat');
    $click = conversionClick($f);
    match ($cap) {
        'advertiser' => app(FundingService::class)->refund($f['advertiser'], '970.00', 'USD', 'burst-cap', 'Test refund', $f['advertiser']->user_id),
        'campaign' => $f['campaign']->update(['total_budget' => '30.00']),
        'daily' => $f['campaign']->update(['daily_budget' => '30.00']),
    };
    $payloads = array_map(fn ($i) => conversionPayload($click, ['event_type' => 'action', 'external_id' => 'burst-'.$i]), range(1, 8));
    $results = concurrentConfirmations($f['token'], $payloads);
    expect(array_count_values(array_column($results, 'status')))->toEqual([201 => 3, 422 => 5]);
    expect(ConversionEvent::count())->toBe(3)->and(PublisherEarning::count())->toBe(3);
    expect($f['campaign']->fresh()->spent_amount)->toBe('30.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
    $accepted = array_search(201, array_column($results, 'status'), true);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payloads[$accepted])->assertOk()->assertJsonPath('duplicate', true);
})->with(['advertiser', 'campaign', 'daily']);
