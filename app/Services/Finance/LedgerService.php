<?php

namespace App\Services\Finance;

use App\Models\Network;
use App\Support\ConversionMoney as Money;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LedgerService
{
    public const ACCOUNTS = ['cash', 'advertiser', 'publisher_pending', 'publisher_available', 'publisher_locked', 'publisher_payable', 'network_available', 'network_locked', 'network_payable'];

    public function lock(int $networkId): Network
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Financial operations require a transaction.');
        }

        return Network::whereKey($networkId)->lockForUpdate()->firstOrFail();
    }

    public function currency(string $currency): void
    {
        // No implicit FX or silent rounding of zero/three-decimal currencies.
        if (! in_array($currency, config('finance.currencies'), true)) {
            throw ValidationException::withMessages(['currency' => 'Unsupported settlement currency.']);
        }
    }

    public function balance(int $networkId, string $currency, string $account, int $ownerId): int
    {
        return (int) DB::table('ledger_entries')->where('network_id', $networkId)->where('currency', $currency)
            ->where('account', $account)->where('owner_id', $ownerId)->sum('amount_minor');
    }

    /** Signed minor units; positive balances are obligations, cash is their negative counterpart. */
    public function post(int $networkId, string $currency, string $reference, string $kind, string $subjectType, int $subjectId, ?int $actorId, array $details, array $entries): int
    {
        $this->lock($networkId);
        $this->currency($currency);
        if (count($entries) < 2 || array_sum(array_column($entries, 2)) !== 0) {
            throw new \LogicException('A financial transaction must balance to zero.');
        }
        foreach ($entries as [$account, $owner, $amount]) {
            if (! in_array($account, self::ACCOUNTS, true) || ! is_int($amount) || $owner < 0) {
                throw new \LogicException('Invalid ledger entry.');
            }
        }
        $hash = hash('sha256', json_encode([$networkId, $currency, $kind, $subjectType, $subjectId, $details, $entries], JSON_THROW_ON_ERROR));
        $existing = DB::table('financial_transactions')->where('reference', $reference)->first();
        if ($existing) {
            abort_unless(hash_equals($existing->payload_hash, $hash), 409, 'Financial reference already used with different data.');

            return $existing->id;
        }
        $subjectColumn = match ($subjectType) {
            'advertiser' => 'advertiser_id', 'earning' => 'earning_id',
            'publisher_invoice' => 'publisher_invoice_id', 'network_invoice' => 'network_invoice_id',
            default => throw new \LogicException('Unknown financial subject.'),
        };
        try {
            $id = DB::transaction(fn () => DB::table('financial_transactions')->insertGetId([
                'network_id' => $networkId, 'currency' => $currency, 'reference' => $reference, 'kind' => $kind,
                'subject_type' => $subjectType, 'subject_id' => $subjectId, $subjectColumn => $subjectId, 'actor_id' => $actorId,
                'payload_hash' => $hash, 'details' => json_encode($details, JSON_THROW_ON_ERROR), 'created_at' => now(),
            ]));
        } catch (UniqueConstraintViolationException $exception) {
            abort(409, 'Financial reference was concurrently used by another transaction.');
        }
        foreach ($entries as [$account, $owner, $amount]) {
            DB::table('ledger_entries')->insert(['transaction_id' => $id, 'network_id' => $networkId, 'currency' => $currency,
                'account' => $account, 'owner_id' => $owner, 'amount_minor' => $amount]);
        }

        return $id;
    }

    public function move(int $networkId, string $currency, string $reference, string $kind, string $subjectType, int $subjectId, ?int $actorId, array $details, string $from, string $to, int $owner, int $amount): int
    {
        return $this->post($networkId, $currency, $reference, $kind, $subjectType, $subjectId, $actorId, $details,
            [[$from, $owner, -$amount], [$to, $owner, $amount]]);
    }

    public function assertCash(int $networkId, string $currency, int $amount): void
    {
        abort_if(-$this->balance($networkId, $currency, 'cash', 0) < $amount, 422,
            'Insufficient reconciled cash. Recover outstanding debt or record verified funding before payment.');
    }

    public function syncAdvertiser(int $advertiserId, int $networkId, string $currency): void
    {
        $balance = $this->balance($networkId, $currency, 'advertiser', $advertiserId);
        // Negative balances represent commissions owed by postpaid advertisers.
        // Prepayment is enforced at accrual; projections must also support debt
        // repayments and reversals after a network changes its funding policy.
        DB::table('advertisers')->where('id', $advertiserId)->update(['available_budget' => Money::decimal($balance)]);
    }
}
