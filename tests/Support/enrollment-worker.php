<?php

use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Services\PartnerEnrollmentService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Validation\ValidationException;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
fwrite(STDOUT, "ready\n");
$deadline = microtime(true) + 15;
while (! is_file($input['barrier'])) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Concurrency barrier timed out.');
    }
    usleep(1000);
}
$d = $input['payload'];
try {
    app(PartnerEnrollmentService::class)->review(
        PublisherCampaigns::findOrFail($d['id']), User::findOrFail($d['actor']), $d['offer']);
    fwrite(STDOUT, json_encode(['status' => 200])."\n");
} catch (ValidationException $exception) {
    fwrite(STDOUT, json_encode(['status' => 422])."\n");
}
