<?php

namespace App\Services\Finance;

use App\Models\Network;
use App\Models\NetworkEarning;
use App\Models\NetworkInvoice;
use App\Support\ConversionMoney as Money;
use Illuminate\Support\Facades\DB;

class NetworkSettlementService
{
    public function __construct(private LedgerService $ledger) {}

    public function create(Network $network, string $currency, int $actorId): NetworkInvoice
    {
        return DB::transaction(function () use ($network, $currency, $actorId) {
            $network = $this->ledger->lock($network->id);
            $this->ledger->currency($currency);
            $amount = $this->ledger->balance($network->id, $currency, 'network_available', $network->id);
            abort_unless($amount > 0 && $amount >= Money::cents($network->min_payment_threshold ?? '0'), 422, 'No payable network balance above the threshold.');
            $invoice = NetworkInvoice::create(['network_id' => $network->id, 'amount' => Money::decimal($amount),
                'currency' => $currency, 'period_start' => now()->subMonth()->toDateString(), 'period_end' => now()->toDateString(),
                'status' => 'pending', 'ledger_backed' => true]);
            $this->ledger->move($network->id, $currency, 'network-lock:'.$invoice->id, 'network_lock', 'network_invoice', $invoice->id,
                $actorId, [], 'network_available', 'network_locked', $network->id, $amount);

            return $invoice;
        }, 3);
    }

    public function transition(NetworkInvoice $input, string $action, int $actorId, array $details = []): NetworkInvoice
    {
        return DB::transaction(function () use ($input, $action, $actorId, $details) {
            $this->ledger->lock($input->network_id);
            $invoice = NetworkInvoice::whereKey($input->id)->lockForUpdate()->firstOrFail();
            abort_unless($invoice->ledger_backed, 409, 'Legacy invoice requires reconciliation.');
            abort_unless(in_array($action, ['approve', 'reject', 'pay'], true), 422);
            if ($action === 'pay') {
                abort_unless(trim($details['reference'] ?? '') !== '' && trim($details['evidence'] ?? '') !== '', 422, 'Payment reference and evidence are required.');
                if ($invoice->status === 'paid') {
                    abort_unless($invoice->payment_reference === $details['reference'] && $invoice->payment_evidence === $details['evidence'], 409, 'Payment already recorded with different evidence.');

                    return $invoice;
                }
            }
            if ($action === 'reject') {
                abort_unless(trim($details['reason'] ?? '') !== '', 422, 'Cancellation reason is required.');
            }
            $allowed = match ($action) {
                'approve' => ['pending'], 'reject' => ['pending', 'approved'], 'pay' => ['approved']
            };
            abort_unless(in_array($invoice->status, $allowed, true), 409, 'Network invoice transition is no longer allowed.');
            $amount = Money::cents($invoice->amount);
            if ($action === 'pay') {
                $this->ledger->assertCash($invoice->network_id, $invoice->currency, $amount);
            }
            $from = $invoice->status === 'pending' ? 'network_locked' : 'network_payable';
            $to = match ($action) {
                'approve' => 'network_payable', 'reject' => 'network_available', 'pay' => 'cash'
            };
            $key = $action === 'pay' ? 'bank-payment:'.$details['reference'] : 'network-'.$action.':'.$invoice->id;
            $this->ledger->post($invoice->network_id, $invoice->currency, $key, 'network_'.$action, 'network_invoice', $invoice->id,
                $actorId, $details, [[$from, $invoice->network_id, -$amount], [$to, $action === 'pay' ? 0 : $invoice->network_id, $amount]]);
            $invoice->update(match ($action) {
                'approve' => ['status' => 'approved', 'approved_by' => $actorId, 'approved_at' => now()],
                'reject' => ['status' => 'rejected', 'notes' => $details['reason']],
                'pay' => ['status' => 'paid', 'paid_by' => $actorId, 'paid_at' => now(), 'payment_reference' => $details['reference'],
                    'payment_evidence' => $details['evidence'], 'payment_method' => $details['method'] ?? 'bank'],
            });
            if ($action === 'pay') {
                NetworkEarning::create(['network_id' => $invoice->network_id, 'amount_debited' => 0,
                    'amount_credited' => Money::decimal($amount), 'total_amount' => Money::decimal(-$amount),
                    'currency' => $invoice->currency, 'status' => 'approved']);
            }

            return $invoice;
        }, 3);
    }
}
