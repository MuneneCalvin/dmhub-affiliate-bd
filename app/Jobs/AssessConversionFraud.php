<?php

namespace App\Jobs;

use App\Services\Fraud\FraudAssessmentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AssessConversionFraud implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(public int $assessmentId) {}

    public function handle(FraudAssessmentService $service): void
    {
        $service->process($this->assessmentId);
    }
}
