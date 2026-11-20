<?php

namespace App\Console\Commands;

use App\Models\FraudAssessment;
use App\Services\Finance\LedgerService;
use App\Services\Fraud\FraudAssessmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecoverFraudAssessments extends Command
{
    protected $signature = 'fraud:recover';

    protected $description = 'Recover missed fraud jobs, expired holds and abandoned workers';

    public function handle(FraudAssessmentService $service): int
    {
        FraudAssessment::where('status', 'running')->where('updated_at', '<', now()->subMinutes(10))->eachById(function ($candidate) {
            DB::transaction(function () use ($candidate) {
                app(LedgerService::class)->lock($candidate->network_id);
                $assessment = $candidate->fresh();
                if ($assessment->status === 'running' && $assessment->updated_at->lt(now()->subMinutes(10))) {
                    $assessment->update(['status' => 'error', 'next_attempt_at' => now(), 'last_error' => 'Worker stopped before completing the assessment.']);
                }
            });
        });
        FraudAssessment::whereIn('status', ['queued', 'error', 'waiting'])->where('next_attempt_at', '<=', now())
            ->where('attempts', '<', 5)->eachById(function ($assessment) use ($service) {
                if ($assessment->status === 'waiting') {
                    $service->request($assessment->earning, true);
                } else {
                    $service->dispatch($assessment->id);
                }
            });
        $failed = FraudAssessment::where('status', 'error')->where('attempts', '>=', 5)->count();
        $stalled = FraudAssessment::where('status', 'queued')->where('created_at', '<', now()->subMinutes(15))->count();
        if ($failed || $stalled) {
            Log::warning('Fraud engine requires operator attention.', ['exhausted_assessments' => $failed, 'stalled_assessments' => $stalled]);
        }
        $this->info('Fraud recovery completed. Exhausted: '.$failed.'. Stalled: '.$stalled.'.');

        return self::SUCCESS;
    }
}
