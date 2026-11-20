<?php

namespace App\Services\Fraud;

use App\Jobs\AssessConversionFraud;
use App\Models\FraudAssessment;
use App\Models\FraudFeedback;
use App\Models\PublisherEarning;
use App\Services\CampaignFinanceService;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\LedgerService;
use App\Support\ConversionMoney;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FraudAssessmentService
{
    public function __construct(private FraudPolicyService $policies, private FraudRuleRegistry $rules, private FraudEvidenceService $evidence) {}

    /** The queued row is a durable outbox, created in the same transaction as the commission. */
    public function request(PublisherEarning $earning, bool $reassess = false): ?FraudAssessment
    {
        return DB::transaction(function () use ($earning, $reassess) {
            app(LedgerService::class)->lock($earning->network_id);
            $earning = $earning->fresh();
            if ($earning->status !== 'pending' || ! $earning->ledger_transaction_id || ! $earning->conversion_event_id) {
                return null;
            }
            $latest = $earning->fraudAssessments()->latest('id')->first();
            if ($latest && ! $reassess) {
                return $latest;
            }
            if ($latest && in_array($latest->status, ['queued', 'running', 'error', 'waiting'], true)) {
                $latest->update(['status' => 'superseded']);
            }
            $assessment = FraudAssessment::create(['earning_id' => $earning->id, 'network_id' => $earning->network_id,
                'campaign_id' => $earning->commission_snapshot['campaign_id'], 'currency' => $earning->currency,
                'status' => 'queued', 'next_attempt_at' => now()]);
            // A queue outage must not turn a committed merchant event into an HTTP failure.
            DB::afterCommit(fn () => $this->dispatch($assessment->id));

            return $assessment;
        }, 3);
    }

    public function dispatch(int $id): void
    {
        try {
            // Bound duplicate deliveries during a worker outage. The durable row remains recoverable.
            $claimed = FraudAssessment::whereKey($id)->whereIn('status', ['queued', 'error'])
                ->where('next_attempt_at', '<=', now())
                ->where(fn ($q) => $q->whereNull('dispatched_at')->orWhere('dispatched_at', '<=', now()->subMinutes(5)))
                ->update(['dispatched_at' => now()]);
            if (! $claimed) {
                return;
            }
            AssessConversionFraud::dispatch($id)->onQueue('fraud');
        } catch (\Throwable $exception) {
            report($exception);
            Log::warning('Fraud assessment dispatch failed; recovery will retry.', ['assessment_id' => $id]);
        }
    }

    public function process(int $id): void
    {
        $candidate = FraudAssessment::find($id);
        if (! $candidate) {
            return;
        }
        // Claim under the same lock order used by every financial operation.
        $claim = DB::transaction(function () use ($candidate) {
            app(LedgerService::class)->lock($candidate->network_id);
            $assessment = $candidate->fresh();
            if (! in_array($assessment->status, ['queued', 'error'], true)
                || ($assessment->next_attempt_at && $assessment->next_attempt_at->isFuture()) || $assessment->attempts >= 5) {
                return null;
            }
            $earning = $assessment->earning;
            if ($earning->status !== 'pending' || $earning->fraudAssessments()->max('id') !== $assessment->id) {
                $assessment->update(['status' => 'superseded']);

                return null;
            }
            $snapshot = $this->policies->effective($assessment->network_id, $assessment->campaign_id);
            $assessment->update(['status' => 'running', 'attempts' => $assessment->attempts + 1, 'last_error' => null,
                'policy_snapshot' => $snapshot, 'policy_fingerprint' => $snapshot['fingerprint'],
                'earning_version' => app(CampaignFinanceService::class)->version($earning)]);
            if ($snapshot['configuration']['mode'] === 'disabled') {
                $assessment->update(['status' => 'completed', 'recommendation' => 'manual_review',
                    'reasons' => ['Fraud assessment is disabled by policy.'], 'score' => 0, 'next_attempt_at' => null]);

                return null;
            }

            return $assessment;
        }, 3);
        if (! $claim) {
            return;
        }
        try {
            // Potentially expensive evidence collection never holds a network's financial lock.
            $evidence = $this->evidence->collect($claim->earning, $claim->policy_snapshot['configuration']);
            $result = $this->rules->evaluate($claim->policy_snapshot['configuration']['rules'], $evidence, $claim->policy_snapshot['configuration']['max_score']);
            $this->complete($claim, $evidence, $result);
        } catch (\Throwable $exception) {
            DB::transaction(function () use ($claim, $exception) {
                app(LedgerService::class)->lock($claim->network_id);
                $assessment = $claim->fresh();
                if ($assessment->status === 'running' && $assessment->attempts === $claim->attempts) {
                    $assessment->update(['status' => 'error', 'last_error' => 'Assessment failed; commission remains pending.',
                        'next_attempt_at' => now()->addSeconds(min(3600, 60 * (2 ** $assessment->attempts)))]);
                    Log::error('Fraud assessment failed.', ['assessment_id' => $assessment->id, 'attempt' => $assessment->attempts, 'exception_type' => $exception::class]);
                }
            });
            report($exception);
        }
    }

    private function complete(FraudAssessment $claim, array $evidence, array $result): void
    {
        DB::transaction(function () use ($claim, $evidence, $result) {
            app(LedgerService::class)->lock($claim->network_id);
            $assessment = $claim->fresh();
            $earning = PublisherEarning::whereKey($claim->earning_id)->lockForUpdate()->firstOrFail();
            if ($assessment->status !== 'running' || $assessment->attempts !== $claim->attempts) {
                return;
            }
            $current = $this->policies->effective($assessment->network_id, $assessment->campaign_id);
            $stale = $current['fingerprint'] !== $claim->policy_fingerprint;
            $changed = app(CampaignFinanceService::class)->version($earning) !== $claim->earning_version;
            $assessment->update([...$result, 'evidence' => $evidence, 'status' => 'completed', 'next_attempt_at' => null]);
            if ($earning->status !== 'pending' || $changed || $earning->fraudAssessments()->max('id') !== $assessment->id || $stale) {
                $assessment->update(['status' => 'superseded']);
                if ($stale && $earning->status === 'pending' && ! $changed) {
                    $this->request($earning, true);
                }

                return;
            }
            $config = $current['configuration'];
            $reasons = $result['reasons'];
            if (! in_array($evidence['event_type'], $config['event_types'], true)
                || ($config['assignment_ids'] && ! in_array($earning->publisher_campaign_id, $config['assignment_ids'], true))) {
                $reasons[] = 'Event or publisher assignment is outside the approval policy.';
            }
            if ($earning->reversed_minor > 0 || $earning->refunded_basis_minor > 0) {
                $reasons[] = 'Adjusted earnings require manual review.';
            }
            if (FraudFeedback::where('earning_id', $earning->id)->latest('id')->value('outcome') === 'fraud') {
                $reasons[] = 'An operator classified this conversion as confirmed fraud.';
            }
            $amount = ConversionMoney::cents($earning->amount);
            foreach (['network' => $current['network_limits'], 'campaign' => $config['limits']] as $scope => $limits) {
                $limit = $limits[$earning->currency] ?? null;
                $used = FraudAssessment::where('network_id', $earning->network_id)->where('currency', $earning->currency)
                    ->where('applied_at', '>=', now()->utc()->startOfDay())
                    ->when($scope === 'campaign', fn ($q) => $q->where('campaign_id', $assessment->campaign_id))->sum('approved_minor');
                if (! $limit || $amount > $limit['max_commission_minor'] || $used + $amount > $limit['daily_limit_minor']) {
                    $reasons[] = ucfirst($scope).' approval exposure limit is missing or exceeded.';
                }
            }
            $eligibleAt = $earning->created_at->copy()->addMinutes($config['wait_minutes'][$evidence['event_type']] ?? 0);
            $assessment->update(['reasons' => $reasons, 'recommendation' => $reasons ? 'manual_review' : 'approve', 'eligible_at' => $eligibleAt]);
            if ($reasons || $config['mode'] !== 'automatic') {
                return;
            }
            if ($eligibleAt->isFuture()) {
                // Preserve this assessment and collect fresh evidence when the hold expires.
                $assessment->update(['status' => 'waiting', 'next_attempt_at' => $eligibleAt]);

                return;
            }
            app(EarningReviewService::class)->approveAutomatically($earning, $assessment);
            $assessment->update(['applied_at' => now(), 'approved_minor' => $amount]);
        }, 3);
    }
}
