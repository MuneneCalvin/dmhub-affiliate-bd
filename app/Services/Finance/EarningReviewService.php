<?php

namespace App\Services\Finance;

use App\Models\Campaign;
use App\Models\FraudAssessment;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Support\ConversionMoney as Money;
use Illuminate\Support\Facades\DB;

class EarningReviewService
{
    public function __construct(private LedgerService $ledger) {}

    public function approve(PublisherEarning $earning, int $actorId, string $reason): PublisherEarning
    {
        return $this->recordApproval($earning, $actorId, $reason);
    }

    /** Called inside the fraud engine's locked, validated application transaction. */
    public function approveAutomatically(PublisherEarning $earning, FraudAssessment $assessment): PublisherEarning
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Automated approval requires the fraud application transaction.');
        }
        $assessment = $assessment->fresh();
        abort_unless($assessment->earning_id === $earning->id && $assessment->recommendation === 'approve'
            && $assessment->status === 'completed' && $assessment->eligible_at && ! $assessment->eligible_at->isFuture()
            && $assessment->policy_snapshot['configuration']['mode'] === 'automatic', 409);

        return $this->recordApproval($earning, null, 'Automatically approved by fraud assessment #'.$assessment->id,
            ['actor_type' => 'fraud_engine', 'assessment_id' => $assessment->id, 'policy_fingerprint' => $assessment->policy_fingerprint,
                'network_version_id' => $assessment->policy_snapshot['network_version_id'], 'campaign_version_id' => $assessment->policy_snapshot['campaign_version_id']]);
    }

    private function recordApproval(PublisherEarning $earning, ?int $actorId, string $reason, array $evidence = []): PublisherEarning
    {
        return DB::transaction(function () use ($earning, $actorId, $reason, $evidence) {
            $this->ledger->lock($earning->network_id);
            $earning = PublisherEarning::whereKey($earning->id)->lockForUpdate()->firstOrFail();
            abort_unless($earning->ledger_transaction_id, 409, 'Legacy earning requires reconciliation.');
            if ($earning->status === 'approved') {
                abort_unless($earning->review_reason === $reason, 409, 'Approval was already recorded with different evidence.');

                return $earning;
            }
            abort_unless($earning->status === 'pending' && trim($reason) !== '', 409, 'Only pending earnings may be reviewed.');
            $net = Money::cents($earning->amount) - $earning->reversed_minor;
            $this->ledger->move($earning->network_id, $earning->currency, 'review:'.$earning->id, 'approval', 'earning', $earning->id,
                $actorId, ['reason' => $reason, ...$evidence], 'publisher_pending', 'publisher_available', $earning->publisher_id, $net);
            $earning->update(['status' => 'approved', 'reviewed_by' => $actorId, 'reviewed_at' => now(), 'review_reason' => $reason]);
            $earning->conversion?->update(['status' => 'A', 'approved_at' => now(), 'reviewed_by' => $actorId === null ? 'system:fraud' : (string) $actorId, 'reviewed_at' => now(), 'review_notes' => $reason]);

            return $earning;
        }, 3);
    }

    /** Refund amount is incremental sale basis; reversal/chargeback/rejection cancels the remainder. */
    public function adjust(PublisherEarning $earning, string $kind, ?string $amount, string $reference, string $reason, int $actorId): PublisherEarning
    {
        return DB::transaction(function () use ($earning, $kind, $amount, $reference, $reason, $actorId) {
            $this->ledger->lock($earning->network_id);
            $earning = PublisherEarning::whereKey($earning->id)->lockForUpdate()->firstOrFail();
            abort_unless($earning->ledger_transaction_id, 409, 'Legacy earning requires reconciliation.');
            abort_unless(in_array($kind, ['refund', 'reversal', 'chargeback', 'rejection'], true)
                && trim($reference) !== '' && trim($reason) !== '', 422, 'Adjustment type, reference and reason are required.');
            $basisDelta = $amount === null ? null : Money::cents($amount);
            $details = ['kind' => $kind, 'basis_minor' => $basisDelta, 'reason' => $reason];
            $key = 'adjustment:'.$earning->id.':'.$reference;
            $existing = DB::table('financial_transactions')->where('reference', $key)->first();
            if ($existing) {
                abort_unless(json_decode($existing->details, true) === $details, 409, 'Adjustment reference already used with different data.');

                return $earning;
            }
            abort_if(in_array($earning->status, ['locked', 'payable'], true), 409, 'Cancel the unpaid invoice before adjusting its earnings.');
            abort_if(in_array($earning->status, ['rejected', 'reversed'], true), 409, 'Earning already fully reversed.');
            abort_if($kind === 'rejection' && $earning->status !== 'pending', 409, 'Only pending earnings may be rejected.');
            $original = Money::cents($earning->amount);
            $basis = Money::cents($earning->base_value ?? '0');
            $refunded = $earning->refunded_basis_minor;
            if ($kind === 'refund') {
                abort_unless($basis > 0 && $basisDelta > 0 && $refunded + $basisDelta <= $basis, 422, 'Refund exceeds the unrefunded sale basis.');
                $refunded += $basisDelta;
                // Cumulative rounding ensures many partial refunds equal one full refund.
                $target = Money::proportion($original, $refunded, $basis);
            } else {
                abort_unless($amount === null, 422, 'Full reversals do not accept a partial amount.');
                $target = $original;
                $refunded = $basis;
            }
            $delta = $target - $earning->reversed_minor;
            $advertiserId = $earning->commission_snapshot['advertiser_id'];
            $account = $earning->status === 'pending' ? 'publisher_pending' : 'publisher_available';
            // A paid refund creates a negative available balance (publisher recovery),
            // which future invoices must offset before any new money leaves the platform.
            $this->ledger->post($earning->network_id, $earning->currency, $key, $kind, 'earning', $earning->id, $actorId, $details,
                [[$account, $earning->publisher_id, -$delta], ['advertiser', $advertiserId, $delta]]);
            $earning->update(['reversed_minor' => $target, 'refunded_basis_minor' => $refunded,
                'status' => $target === $original ? ($kind === 'rejection' ? 'rejected' : 'reversed') : $earning->status,
                'reviewed_by' => $actorId, 'reviewed_at' => now(), 'review_reason' => $reason]);
            $this->ledger->syncAdvertiser($advertiserId, $earning->network_id, $earning->currency);
            $decimal = Money::decimal($delta);
            PublisherCampaigns::whereKey($earning->publisher_campaign_id)->decrement('total_commission', $decimal);
            DB::table('publishers')->where('id', $earning->publisher_id)->decrement('total_earnings', $decimal);
            Campaign::whereKey($earning->commission_snapshot['campaign_id'] ?? $earning->publisherCampaign->campaign_id)->decrement('spent_amount', $decimal);
            if ($target === $original) {
                $earning->conversion?->update(['status' => 'R', 'rejected_at' => now(), 'reviewed_by' => (string) $actorId, 'reviewed_at' => now(), 'review_notes' => $reason]);
            }

            return $earning;
        }, 3);
    }
}
