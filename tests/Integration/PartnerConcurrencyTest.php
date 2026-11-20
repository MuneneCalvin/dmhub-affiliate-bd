<?php

use App\Models\CommissionType;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Services\PartnerEnrollmentService;
use Symfony\Component\Process\Process;
use Tests\IntegrationTestCase;

uses(IntegrationTestCase::class);

function concurrentEnrollments(array $payloads): array
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
            $worker = new Process([PHP_BINARY, base_path('tests/Support/enrollment-worker.php')], base_path(), $env);
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

it('serializes competing publisher approvals at the campaign capacity limit', function () {
    $f = conversionFixture();
    $f['campaign']->update(['max_publishers' => 1]);
    $f['assignment']->update(['status' => 'R', 'offer_id' => null]);
    $type = CommissionType::firstOrCreate(['name' => 'CPL'], ['nice_name' => 'Cost Per Submission']);
    OfferCommission::create(['offer_id' => $f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => 10]);
    $other = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true])->id, 'network_id' => $f['network']->id]);
    $service = app(PartnerEnrollmentService::class);
    $input = ['offer_id' => $f['offer']->id, 'applied_notes' => 'Synthetic application', 'terms_accepted' => true,
        'terms_version' => $service->version($service->contract($f['campaign'], $f['offer']))];
    $first = $service->apply($f['publisher'], $f['campaign']->id, $input);
    $second = $service->apply($other, $f['campaign']->id, $input);
    $actions = array_map(fn ($app) => ['id' => $app->id, 'actor' => $f['advertiser']->user_id, 'offer' => $f['offer']->id], [$first, $second]);
    expect(array_column(concurrentEnrollments($actions), 'status'))->toEqualCanonicalizing([200, 422]);
    expect(PublisherCampaigns::where('status', 'A')->count())->toBe(1);
});
