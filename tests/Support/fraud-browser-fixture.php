<?php

use App\Models\PublisherEarning;
use App\Models\User;
use App\Services\ConversionEventService;
use App\Services\Fraud\FraudAssessmentService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
require __DIR__.'/ConversionFixtures.php';
set_exception_handler(function (Throwable $error): never {
    fwrite(STDERR, $error->getMessage().PHP_EOL);
    exit(1);
});
$directory = getenv('LIFECYCLE_RUN_DIR');
if (! app()->environment('testing') || ! $directory || ! str_starts_with(basename($directory), 'dmhub-fraud-')
    || DB::getDriverName() !== 'sqlite' || DB::connection()->getDatabaseName() !== $directory.'/database.sqlite') {
    throw new RuntimeException('Fraud browser fixtures require an isolated runner database.');
}
if (($argv[1] ?? '') === 'seed') {
    if (User::exists()) {
        throw new RuntimeException('Expected an empty test database.');
    }
    User::factory()->withoutTwoFactor()->create(['email' => 'fraud-operator@example.test', 'password' => 'FraudBrowser2026!', 'is_super_admin' => true, 'locale' => 'en']);
    $f = conversionFixture();
    $click = conversionClick($f);
    $click->update(['ip_address' => '192.0.2.1']);
    $request = Request::create('/api/v1/events', 'POST');
    $request->attributes->set('postback_advertiser_id', $f['advertiser']->id);
    $request->attributes->set('postback_credential_id', $f['credential']->id);
    app(ConversionEventService::class)->confirm(conversionPayload($click, ['spam_checks' => ['honeypot_filled' => true, 'form_duration_ms' => 5000, 'is_spam' => false]]), $request);
    echo json_encode(['network_id' => $f['network']->id, 'campaign_id' => $f['campaign']->id, 'earning_id' => PublisherEarning::first()->id]);
} elseif (($argv[1] ?? '') === 'assess') {
    $earning = PublisherEarning::firstOrFail();
    $service = app(FraudAssessmentService::class);
    $assessment = $service->request($earning, true);
    if ($assessment) {
        $service->process($assessment->id);
    }
    echo json_encode(['status' => $earning->fresh()->status]);
} else {
    throw new RuntimeException('Unknown fixture action.');
}
