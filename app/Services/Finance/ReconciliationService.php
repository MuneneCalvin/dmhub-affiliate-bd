<?php

namespace App\Services\Finance;

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\NetworkInvoice;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Support\ConversionMoney as Money;
use Illuminate\Support\Facades\DB;

class ReconciliationService
{
    public function __construct(private LedgerService $ledger) {}

    public function inspect(): array
    {
        $issues = [];
        foreach (Network::orderBy('id')->pluck('id') as $networkId) {
            $issues = array_merge($issues, DB::transaction(fn () => $this->network($networkId)));
        }

        return $issues;
    }

    private function network(int $networkId): array
    {
        $this->ledger->lock($networkId);
        $issues = [];
        $check = function (bool $ok, string $message) use (&$issues, $networkId) {
            if (! $ok) {
                $issues[] = 'Network '.$networkId.': '.$message;
            }
        };
        foreach (DB::table('financial_transactions')->where('network_id', $networkId)->get() as $tx) {
            $lines = DB::table('ledger_entries')->where('transaction_id', $tx->id)->get();
            $check($lines->count() >= 2 && (int) $lines->sum('amount_minor') === 0, 'Unbalanced transaction '.$tx->id);
            $check($lines->every(fn ($e) => $e->currency === $tx->currency && $e->network_id === $tx->network_id), 'Transaction dimension mismatch '.$tx->id);
            $entries = $lines->sortBy('id')->map(fn ($e) => [$e->account, (int) $e->owner_id, (int) $e->amount_minor])->values()->all();
            $hash = hash('sha256', json_encode([$tx->network_id, $tx->currency, $tx->kind, $tx->subject_type, $tx->subject_id,
                json_decode($tx->details, true), $entries], JSON_THROW_ON_ERROR));
            $check(hash_equals($tx->payload_hash, $hash), 'Transaction evidence mismatch '.$tx->id);
        }
        foreach (Advertiser::where('network_id', $networkId)->get() as $advertiser) {
            $balance = $this->ledger->balance($networkId, $advertiser->currency, 'advertiser', $advertiser->id);
            $check(Money::signedCents($advertiser->available_budget) === $balance, 'Advertiser balance mismatch '.$advertiser->id);
        }
        foreach (DB::table('ledger_entries')->where('network_id', $networkId)->where('account', 'cash')
            ->selectRaw('currency, SUM(amount_minor) as balance')->groupBy('currency')->get() as $cash) {
            $check((int) $cash->balance <= 0, 'Cash overdrawn '.$cash->currency);
        }
        foreach (DB::table('network_earnings')->where('network_id', $networkId)->selectRaw('currency, CAST(SUM(total_amount) AS VARCHAR) as total')->groupBy('currency')->get() as $legacy) {
            $projected = $this->ledger->balance($networkId, $legacy->currency, 'network_available', $networkId)
                + $this->ledger->balance($networkId, $legacy->currency, 'network_locked', $networkId)
                + $this->ledger->balance($networkId, $legacy->currency, 'network_payable', $networkId);
            // Legacy projections are four-decimal fields; reject sub-cent drift.
            $text = (string) $legacy->total;
            $negative = str_starts_with($text, '-');
            [$whole, $fraction] = array_pad(explode('.', ltrim($text, '-')), 2, '');
            $fraction = str_pad($fraction, 4, '0');
            $legacyMinor = ((int) $whole * 100 + (int) substr($fraction, 0, 2)) * ($negative ? -1 : 1);
            $check(preg_match('/^-?\d+(?:\.\d{1,4})?$/D', $text) === 1 && substr($fraction, 2) === '00' && $projected === $legacyMinor,
                'Network earning projection requires reconciliation '.$legacy->currency);
        }
        $expected = [];
        $add = function (string $currency, string $account, int $owner, int $minor) use (&$expected) {
            $key = $currency.':'.$account.':'.$owner;
            $expected[$key] = ($expected[$key] ?? 0) + $minor;
        };
        foreach (PublisherEarning::where('network_id', $networkId)->get() as $earning) {
            if (! $earning->ledger_transaction_id) {
                $check(false, 'Legacy earning requires reconciliation '.$earning->id);

                continue;
            }
            $original = Money::cents($earning->amount);
            $net = $original - $earning->reversed_minor;
            $check($net >= 0 && $earning->currency === ($earning->commission_snapshot['currency'] ?? null), 'Invalid earning snapshot '.$earning->id);
            $transaction = DB::table('financial_transactions')->find($earning->ledger_transaction_id);
            $check($transaction && $transaction->kind === 'commission' && $transaction->subject_id === $earning->id
                && json_decode($transaction->details, true)['snapshot'] === $earning->commission_snapshot, 'Earning evidence mismatch '.$earning->id);
            $reserved = (int) DB::table('ledger_entries')->where('transaction_id', $earning->ledger_transaction_id)->where('account', 'publisher_pending')->sum('amount_minor');
            $check($reserved === $original, 'Earning original amount mismatch '.$earning->id);
            if (in_array($earning->status, ['pending', 'approved'], true)) {
                $add($earning->currency, $earning->status === 'pending' ? 'publisher_pending' : 'publisher_available', $earning->publisher_id, $net);
            }
            if ($earning->invoice?->status === 'paid') {
                // Only adjustments made AFTER payment create debt. Partial
                // pre-payment refunds are already deducted in invoice lines.
                $line = collect($earning->invoice->invoice_details['lines'] ?? [])->firstWhere('earning_id', $earning->id);
                $paidBasis = $line['amount_minor'] ?? $original;
                $add($earning->currency, 'publisher_available', $earning->publisher_id, -max(0, $paidBasis - $net));
            }
        }
        foreach (PublisherInvoice::where('network_id', $networkId)->get() as $invoice) {
            if (! $invoice->ledger_backed) {
                $check(false, 'Legacy publisher invoice requires reconciliation '.$invoice->id);

                continue;
            }
            if ($invoice->status !== 'rejected') {
                $add($invoice->currency, 'publisher_available', $invoice->publisher_id, $invoice->invoice_details['recovery_minor'] ?? 0);
            }
            if (in_array($invoice->status, ['pending', 'approved'], true)) {
                $add($invoice->currency, $invoice->status === 'pending' ? 'publisher_locked' : 'publisher_payable', $invoice->publisher_id, Money::cents($invoice->amount));
            }
            $check($invoice->status !== 'paid' || ($invoice->paid_by && $invoice->payment_reference && $invoice->payment_evidence), 'Missing publisher payment evidence '.$invoice->id);
        }
        foreach (DB::table('financial_transactions')->where('network_id', $networkId)->where('kind', 'funding')->get() as $funding) {
            $add($funding->currency, 'network_available', $networkId, json_decode($funding->details, true)['fee_minor']);
        }
        foreach (NetworkInvoice::where('network_id', $networkId)->get() as $invoice) {
            if (! $invoice->ledger_backed) {
                $check(false, 'Legacy network invoice requires reconciliation '.$invoice->id);

                continue;
            }
            if ($invoice->status !== 'rejected') {
                $add($invoice->currency, 'network_available', $networkId, -Money::cents($invoice->amount));
            }
            if (in_array($invoice->status, ['pending', 'approved'], true)) {
                $add($invoice->currency, $invoice->status === 'pending' ? 'network_locked' : 'network_payable', $networkId, Money::cents($invoice->amount));
            }
            $check($invoice->status !== 'paid' || ($invoice->paid_by && $invoice->payment_reference && $invoice->payment_evidence), 'Missing network payment evidence '.$invoice->id);
        }
        $balances = DB::table('ledger_entries')->where('network_id', $networkId)->whereNotIn('account', ['cash', 'advertiser'])
            ->selectRaw('currency, account, owner_id, SUM(amount_minor) as balance')->groupBy('currency', 'account', 'owner_id')->get();
        foreach ($balances as $balance) {
            $key = $balance->currency.':'.$balance->account.':'.$balance->owner_id;
            $check((int) $balance->balance === ($expected[$key] ?? 0), 'Liability mismatch '.$key);
            unset($expected[$key]);
        }
        foreach ($expected as $key => $amount) {
            $check($amount === 0, 'Missing liability '.$key);
        }

        return $issues;
    }
}
