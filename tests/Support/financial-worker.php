<?php

use App\Models\Advertiser;
use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\Fraud\FraudAssessmentService;
use App\Services\InvoiceService;
use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
    $result = match ($d['action']) {
        'fraud' => app(FraudAssessmentService::class)->process($d['id']),
        'deposit' => app(FundingService::class)->deposit(Advertiser::findOrFail($d['id']), '100.00', 'USD', 'concurrent-deposit', 'receipt', $d['actor']),
        'review' => app(EarningReviewService::class)->approve(PublisherEarning::findOrFail($d['id']), $d['actor'], 'Reviewed'),
        'refund' => app(EarningReviewService::class)->adjust(PublisherEarning::findOrFail($d['id']), 'refund', '50.00', 'concurrent-return', 'Return', $d['actor']),
        'create' => app(InvoiceService::class)->createInvoice(Publisher::findOrFail($d['id'])),
        'approve' => app(InvoiceService::class)->approveInvoice(PublisherInvoice::findOrFail($d['id']), $d['actor']),
        'reject' => app(InvoiceService::class)->rejectInvoice(PublisherInvoice::findOrFail($d['id']), 'Cancel', $d['actor']),
        'pay' => app(InvoiceService::class)->markAsPaid(PublisherInvoice::findOrFail($d['id']), 'concurrent-payment', 'receipt', $d['actor']),
    };
    fwrite(STDOUT, json_encode(['status' => 200, 'created' => $result !== null])."\n");
} catch (HttpExceptionInterface $exception) {
    fwrite(STDOUT, json_encode(['status' => $exception->getStatusCode()])."\n");
}
