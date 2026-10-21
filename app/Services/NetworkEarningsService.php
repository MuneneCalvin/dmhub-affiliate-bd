<?php
namespace App\Services;


use App\Models\Advertiser;
use App\Models\NetworkEarning;
use Illuminate\Support\Facades\DB;
use Exception;

class NetworkEarningsService
{
    /**
     * Record a new earning entry.
     * * @param array $data
     * @return NetworkEarning
     * @throws Exception
     */
    const TYPE_PERCENTAGE = 'percentage';
    const TYPE_FIXED = 'fixed';

    public function recordEarning(array $data): NetworkEarning
    {
        return DB::transaction(function () use ($data) {
            $amount_debited = $data['amount_debited'] ?? 0;
            $amount_credited = $data['amount_credited'] ?? 0;
            $total_amount = $amount_debited - $amount_credited;

            return NetworkEarning::create([
                'network_id' => $data['network_id'],
                'advertiser_id' => $data['advertiser_id'] ?? null,
                'campaign_id' => $data['campaign_id'] ?? null,
                'amount_debited' => $amount_debited,
                'amount_credited' => $amount_credited,
                'total_amount' => $total_amount,
                'currency' => $data['currency'] ?? 'USD',
                'status' => 'approved',
            ]);
        });
    }

    public function generateAvailableBudget(int $advertiserId, float $totalBudget): array
    {
        $networkData = Advertiser::where('advertisers.id', $advertiserId)
            ->where('advertisers.status', 'A')
            ->join('networks', 'networks.id', '=', 'advertisers.network_id')
            ->select(
                'networks.id as network_id',
                'networks.default_commission_model',
                'networks.default_commission_value',
                'advertisers.id as advertiser_id'
            )
            ->first();

        if (!$networkData) {
            throw new Exception("Advertiser not found or inactive.");
        }
        $commissionAmt = 0;
        $rate = (float) $networkData->default_commission_value;

        if ($networkData->default_commission_model === self::TYPE_PERCENTAGE) {
            $commissionAmt = ($totalBudget * $rate) / 100;
        } elseif ($networkData->default_commission_model === self::TYPE_FIXED) {
            $commissionAmt = $rate;
        }
        $availableBudget = max(0, $totalBudget - $commissionAmt);
        return [
            'available_budget' => $availableBudget,
            'commission_amount' => $commissionAmt,
            'network_id' => $networkData->network_id,
            'advertiser_id' => $networkData->advertiser_id
        ];
    }

}