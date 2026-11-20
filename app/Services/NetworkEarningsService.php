<?php

namespace App\Services;

use App\Services\Finance\LedgerService;
use App\Support\ConversionMoney;

class NetworkEarningsService
{
    public function balance(int $networkId, string $currency): string
    {
        return ConversionMoney::decimal(app(LedgerService::class)->balance($networkId, $currency, 'network_available', $networkId));
    }

    // Unbacked entries and budget-field funding were removed. Use FundingService
    // and NetworkSettlementService so every accrual/payout has balanced evidence.
}
