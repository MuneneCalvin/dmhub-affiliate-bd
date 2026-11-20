<?php

namespace App\Services;

use App\Models\Publisher;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Services\Finance\LedgerService;
use App\Support\ConversionMoney as Money;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function __construct(private LedgerService $ledger) {}

    private function eligible(int $publisherId)
    {
        return PublisherEarning::where('publisher_id', $publisherId)->where('status', 'approved')
            ->whereNotNull('ledger_transaction_id')->whereNull('invoice_id');
    }

    public function createInvoice(Publisher $publisher, ?string $startDate = null, ?string $endDate = null, ?string $currency = null, ?int $networkId = null): ?PublisherInvoice
    {
        $endDate ??= now()->format('Y-m-d');
        $startDate ??= '1970-01-01';
        $groups = $this->eligible($publisher->id)->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])
            ->when($currency, fn ($q) => $q->where('currency', $currency))
            ->when($networkId, fn ($q) => $q->where('network_id', $networkId))
            ->select('network_id', 'currency')->distinct()->get();
        if ($groups->isEmpty()) {
            return null;
        }
        abort_unless($groups->count() === 1, 422, 'Select one earning currency and liable network.');
        $group = $groups->first();

        return DB::transaction(function () use ($publisher, $startDate, $endDate, $group) {
            $this->ledger->lock($group->network_id);
            $publisher = Publisher::whereKey($publisher->id)->lockForUpdate()->firstOrFail();
            $earnings = $this->eligible($publisher->id)->where('network_id', $group->network_id)->where('currency', $group->currency)
                ->whereBetween('created_at', [$startDate.' 00:00:00', $endDate.' 23:59:59'])->orderBy('id')->lockForUpdate()->get();
            if ($earnings->isEmpty()) {
                return null;
            }
            $gross = $earnings->sum(fn ($e) => Money::cents($e->amount) - $e->reversed_minor);
            $allApproved = $this->eligible($publisher->id)->where('network_id', $group->network_id)->where('currency', $group->currency)
                ->get()->sum(fn ($e) => Money::cents($e->amount) - $e->reversed_minor);
            $available = $this->ledger->balance($group->network_id, $group->currency, 'publisher_available', $publisher->id);
            $recovery = max(0, $allApproved - $available);
            $net = $gross - $recovery;
            if ($net <= 0 || $net < Money::cents($publisher->payout_threshold ?? '0')) {
                return null;
            }
            $invoice = PublisherInvoice::create([
                'publisher_id' => $publisher->id, 'network_id' => $group->network_id,
                'amount' => Money::decimal($net), 'currency' => $group->currency, 'ledger_backed' => true,
                'period_start' => $earnings->min('created_at')->toDateString(), 'period_end' => $endDate, 'status' => 'pending',
                'payment_method' => $publisher->payout_method, 'requested_at' => now(),
                'invoice_details' => ['gross_minor' => $gross, 'recovery_minor' => $recovery, 'net_minor' => $net,
                    'lines' => $earnings->map(fn ($e) => ['earning_id' => $e->id, 'amount_minor' => Money::cents($e->amount) - $e->reversed_minor])->all()],
            ]);
            $this->ledger->move($group->network_id, $group->currency, 'invoice-lock:'.$invoice->id, 'invoice_lock', 'publisher_invoice', $invoice->id,
                $publisher->user_id, ['earning_ids' => $earnings->modelKeys(), 'recovery_minor' => $recovery],
                'publisher_available', 'publisher_locked', $publisher->id, $net);
            PublisherEarning::whereIn('id', $earnings->modelKeys())->update(['status' => 'locked', 'invoice_id' => $invoice->id]);

            return $invoice;
        }, 3);
    }

    public function approveInvoice(PublisherInvoice $invoice, int $userId): bool
    {
        return $this->transition($invoice, 'approve', $userId);
    }

    public function rejectInvoice(PublisherInvoice $invoice, string $reason, int $userId): bool
    {
        abort_unless(trim($reason) !== '', 422, 'A cancellation reason is required.');

        return $this->transition($invoice, 'reject', $userId, ['reason' => $reason]);
    }

    public function markAsPaid(PublisherInvoice $invoice, ?string $paymentReference = null, ?string $evidence = null, ?int $userId = null): bool
    {
        abort_unless($userId && trim($paymentReference ?? '') !== '' && trim($evidence ?? '') !== '', 422, 'Payment reference, evidence and recording user are required.');

        return $this->transition($invoice, 'pay', $userId, ['reference' => $paymentReference, 'evidence' => $evidence]);
    }

    private function transition(PublisherInvoice $input, string $action, int $actorId, array $details = []): bool
    {
        return DB::transaction(function () use ($input, $action, $actorId, $details) {
            $this->ledger->lock($input->network_id);
            $invoice = PublisherInvoice::whereKey($input->id)->lockForUpdate()->firstOrFail();
            abort_unless($invoice->ledger_backed, 409, 'Legacy invoice requires reconciliation before settlement.');
            $earnings = $invoice->earnings()->orderBy('id')->lockForUpdate()->get();
            if ($action === 'pay' && $invoice->status === 'paid') {
                abort_unless($invoice->payment_reference === $details['reference'] && $invoice->payment_evidence === $details['evidence'], 409, 'Payment was already recorded with different evidence.');

                return true;
            }
            $expected = $action === 'approve' ? ['pending'] : ($action === 'reject' ? ['pending', 'approved'] : ['approved']);
            abort_unless(in_array($invoice->status, $expected, true), 409, 'Invoice transition is no longer allowed.');
            $earningStatus = $invoice->status === 'pending' ? 'locked' : 'payable';
            abort_unless($earnings->isNotEmpty() && $earnings->every(fn ($e) => $e->ledger_transaction_id && $e->status === $earningStatus
                && $e->currency === $invoice->currency && $e->network_id === $invoice->network_id && $e->publisher_id === $invoice->publisher_id),
                409, 'Invoice earnings require reconciliation.');
            $minor = Money::cents($invoice->amount);
            abort_unless($minor === ($invoice->invoice_details['net_minor'] ?? null), 409, 'Invoice total does not match its reserved evidence.');
            if ($action === 'pay') {
                $this->ledger->assertCash($invoice->network_id, $invoice->currency, $minor);
                abort_if($this->ledger->balance($invoice->network_id, $invoice->currency, 'publisher_available', $invoice->publisher_id) < 0,
                    409, 'A refund recovery is outstanding. Cancel and recreate the invoice to offset it.');
            }
            $from = $earningStatus === 'locked' ? 'publisher_locked' : 'publisher_payable';
            $to = match ($action) {
                'approve' => 'publisher_payable', 'reject' => 'publisher_available', 'pay' => 'cash'
            };
            $key = $action === 'pay' ? 'bank-payment:'.$details['reference'] : 'invoice-'.$action.':'.$invoice->id;
            $this->ledger->post($invoice->network_id, $invoice->currency, $key, 'invoice_'.$action, 'publisher_invoice', $invoice->id,
                $actorId, $details, [[$from, $invoice->publisher_id, -$minor], [$to, $action === 'pay' ? 0 : $invoice->publisher_id, $minor]]);
            $invoice->update(match ($action) {
                'approve' => ['status' => 'approved', 'approved_by' => $actorId, 'approved_at' => now()],
                'reject' => ['status' => 'rejected', 'rejection_reason' => $details['reason'], 'approved_by' => $actorId, 'approved_at' => now()],
                'pay' => ['status' => 'paid', 'paid_by' => $actorId, 'paid_at' => now(), 'payment_reference' => $details['reference'], 'payment_evidence' => $details['evidence']],
            });
            $invoice->earnings()->update(match ($action) {
                'approve' => ['status' => 'payable'], 'reject' => ['status' => 'approved', 'invoice_id' => null], 'pay' => ['status' => 'paid'],
            });

            return true;
        }, 3);
    }

    public function getPublisherInvoiceSummary(int $publisherId): array
    {
        return PublisherInvoice::where('publisher_id', $publisherId)->selectRaw('currency, status, SUM(amount) as amount, COUNT(*) as count')
            ->groupBy('currency', 'status')->get()->groupBy('currency')->map(fn ($rows) => $rows->keyBy('status'))->all();
    }

    public function canRequestInvoice(Publisher $publisher): array
    {
        $groups = $this->eligible($publisher->id)->select('network_id', 'currency')->distinct()->get()->map(function ($group) use ($publisher) {
            $minor = max(0, $this->ledger->balance($group->network_id, $group->currency, 'publisher_available', $publisher->id));
            $threshold = Money::cents($publisher->payout_threshold ?? '0');

            return ['network_id' => $group->network_id, 'currency' => $group->currency, 'available_amount' => Money::decimal($minor),
                'threshold' => Money::decimal($threshold), 'remaining' => Money::decimal(max(0, $threshold - $minor)),
                'can_request' => $minor > 0 && $minor >= $threshold];
        });

        return ['can_request' => $groups->contains('can_request', true), 'groups' => $groups->all()];
    }
}
