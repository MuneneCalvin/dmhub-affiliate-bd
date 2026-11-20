<?php

namespace App\Services\Finance;

use App\Models\Advertiser;
use App\Models\NetworkEarning;
use App\Support\ConversionMoney as Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FundingService
{
    public function __construct(private LedgerService $ledger) {}

    public function deposit(Advertiser $advertiser, string $amount, string $currency, string $reference, string $evidence, int $actorId): int
    {
        return DB::transaction(function () use ($advertiser, $amount, $currency, $reference, $evidence, $actorId) {
            $network = $this->ledger->lock($advertiser->network_id);
            $advertiser = Advertiser::whereKey($advertiser->id)->lockForUpdate()->firstOrFail();
            abort_unless($advertiser->network_id === $network->id && $advertiser->currency === $currency, 422, 'Funding ownership/currency mismatch.');
            $this->ledger->currency($currency);
            $gross = Money::cents($amount);
            abort_unless($gross > 0 && trim($reference) !== '' && trim($evidence) !== '', 422, 'Amount, bank reference and evidence are required.');
            abort_if(Money::signedCents($advertiser->available_budget) > 0
                && ! DB::table('ledger_entries')->where('account', 'advertiser')->where('owner_id', $advertiser->id)->exists(),
                409, 'Legacy advertiser balance requires reconciliation before funding.');
            $key = 'funding:'.$reference;
            $existing = DB::table('financial_transactions')->where('reference', $key)->first();
            if ($existing) {
                $details = json_decode($existing->details, true);
                abort_unless($existing->subject_id === $advertiser->id && $existing->currency === $currency
                    && $details['gross_minor'] === $gross && $details['evidence'] === $evidence, 409, 'Deposit reference already used.');

                return $existing->id;
            }
            $rate = Money::cents($network->default_commission_value ?? '0');
            abort_if(in_array($network->default_commission_model, ['F', 'fixed'], true) && $rate > 0 && $network->default_currency !== $currency, 422, 'A fixed funding fee requires the network fee currency.');
            $fee = match ($network->default_commission_model) {
                'P', 'percentage' => intdiv($gross * $rate + 5000, 10000),
                'F', 'fixed' => $rate,
                // The original networks schema uses '0' for an unconfigured fee.
                '0' => $rate === 0 ? 0 : throw ValidationException::withMessages(['fee' => 'Select a network fee model before charging a funding fee.']),
                null, '' => 0,
                default => throw ValidationException::withMessages(['fee' => 'Unsupported network fee model.']),
            };
            abort_if($fee < 0 || $fee >= $gross || (in_array($network->default_commission_model, ['P', 'percentage']) && $rate > 10000), 422, 'Funding fee must be less than the deposit.');
            $id = $this->ledger->post($network->id, $currency, $key, 'funding', 'advertiser', $advertiser->id, $actorId,
                ['gross_minor' => $gross, 'fee_minor' => $fee, 'fee_model' => $network->default_commission_model,
                    'fee_rate' => $network->default_commission_value, 'platform_fee_minor' => 0, 'evidence' => $evidence],
                [['cash', 0, -$gross], ['advertiser', $advertiser->id, $gross - $fee], ['network_available', $network->id, $fee]]);
            if ($fee > 0) {
                NetworkEarning::create(['network_id' => $network->id, 'advertiser_id' => $advertiser->id,
                    'amount_debited' => Money::decimal($fee), 'amount_credited' => 0, 'total_amount' => Money::decimal($fee),
                    'currency' => $currency, 'status' => 'approved']);
            }
            $this->ledger->syncAdvertiser($advertiser->id, $network->id, $currency);

            return $id;
        }, 3);
    }

    /** Return unused spendable funds. The separately disclosed funding fee stays earned. */
    public function refund(Advertiser $advertiser, string $amount, string $currency, string $reference, string $evidence, int $actorId): int
    {
        return DB::transaction(function () use ($advertiser, $amount, $currency, $reference, $evidence, $actorId) {
            $this->ledger->lock($advertiser->network_id);
            $advertiser = Advertiser::whereKey($advertiser->id)->lockForUpdate()->firstOrFail();
            abort_unless($advertiser->currency === $currency, 422, 'Currency mismatch.');
            $minor = Money::cents($amount);
            abort_unless($minor > 0 && trim($reference) !== '' && trim($evidence) !== '', 422, 'Amount, reference and evidence are required.');
            $key = 'funding-refund:'.$reference;
            if (! DB::table('financial_transactions')->where('reference', $key)->exists()) {
                abort_if($minor > $this->ledger->balance($advertiser->network_id, $currency, 'advertiser', $advertiser->id), 422, 'Insufficient unreserved funds.');
                $this->ledger->assertCash($advertiser->network_id, $currency, $minor);
            }
            $id = $this->ledger->post($advertiser->network_id, $currency, $key, 'funding_refund', 'advertiser', $advertiser->id, $actorId,
                ['amount_minor' => $minor, 'evidence' => $evidence], [['advertiser', $advertiser->id, -$minor], ['cash', 0, $minor]]);
            $this->ledger->syncAdvertiser($advertiser->id, $advertiser->network_id, $currency);

            return $id;
        }, 3);
    }
}
