<?php

namespace App\Services;

use App\Models\Clicks;
use App\Models\Lead;
use App\Models\Conversion;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use Illuminate\Support\Facades\DB;

class CommissionService
{
    const TYPE_CPL = 'CPL';
    const TYPE_CPA = 'CPA'; 
    const TYPE_CPS = 'CPS';
    const TYPE_REVSHARE = 'RevShare'; 
    const TYPE_FLAT = 'Flat'; 

    public function calculateLeadCommission(Lead $lead): ?PublisherEarning
    {
        $publisherCampaign = $lead->publisherCampaign;

        if (!$publisherCampaign) {
            return null;
        }

        $offer = $publisherCampaign->offer;
        if (!$offer) {
            return null;
        }

        $cplCommission = $this->getOfferCommission($offer, self::TYPE_CPL);

        if (!$cplCommission) {
            if ($publisherCampaign->commission_type === self::TYPE_CPL && $publisherCampaign->commission_value > 0) {
                $amount = $publisherCampaign->commission_value;
            } else {
                return null;
            }
        } else {
            $amount = $cplCommission->commission_value;
        }

        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_CPL,
            null,
            null,
            $lead
        );
    }

    public function calculateConversionCommission(Conversion $conversion): ?PublisherEarning
    {
        $publisherCampaign = $conversion->publisherCampaign;
        if (!$publisherCampaign) {
            return null;
        }

        $offer = $publisherCampaign->offer;
        if (!$offer) {
            return null;
        }

        $earning = $this->tryCalculateCPA($conversion, $publisherCampaign, $offer);
        if ($earning) return $earning;

        $earning = $this->tryCalculateCPS($conversion, $publisherCampaign, $offer);
        if ($earning) return $earning;

        $earning = $this->tryCalculateRevShare($conversion, $publisherCampaign, $offer);
        if ($earning) return $earning;

        $earning = $this->tryCalculateFlat($conversion, $publisherCampaign, $offer);
        if ($earning) return $earning;

        return null;
    }

    protected function tryCalculateCPA(Conversion $conversion, PublisherCampaigns $publisherCampaign, Offer $offer): ?PublisherEarning
    {
        $commission = $this->getOfferCommission($offer, self::TYPE_CPA);

        if (!$commission && $publisherCampaign->commission_type !== self::TYPE_CPA) {
            return null;
        }

        $amount = $commission ? $commission->commission_value : $publisherCampaign->commission_value;

        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_CPA,
            null,
            null,
            null,
            $conversion
        );
    }

    protected function tryCalculateCPS(Conversion $conversion, PublisherCampaigns $publisherCampaign, Offer $offer): ?PublisherEarning
    {
        $commission = $this->getOfferCommission($offer, self::TYPE_CPS);

        if (!$commission && $publisherCampaign->commission_type !== self::TYPE_CPS) {
            return null;
        }

        $saleAmount = $conversion->sale_amount ?? 0;
        if ($saleAmount <= 0) {
            return null;
        }

        $rate = $commission ? $commission->commission_value : $publisherCampaign->commission_value;
        $amount = $saleAmount * ($rate / 100);

        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_CPS,
            $rate,
            $saleAmount,
            null,
            $conversion
        );
    }

    protected function tryCalculateRevShare(Conversion $conversion, PublisherCampaigns $publisherCampaign, Offer $offer): ?PublisherEarning
    {
        $commission = $this->getOfferCommission($offer, self::TYPE_REVSHARE);

        if (!$commission && $publisherCampaign->commission_type !== self::TYPE_REVSHARE) {
            return null;
        }

        $saleAmount = $conversion->sale_amount ?? 0;
        if ($saleAmount <= 0) {
            return null;
        }

        $rate = $commission ? $commission->commission_value : $publisherCampaign->commission_value;
        $amount = $saleAmount * ($rate / 100);

        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_REVSHARE,
            $rate,
            $saleAmount,
            null,
            $conversion
        );
    }

    protected function tryCalculateFlat(Conversion $conversion, PublisherCampaigns $publisherCampaign, Offer $offer): ?PublisherEarning
    {
        $commission = $this->getOfferCommission($offer, self::TYPE_FLAT);
        if (!$commission && $publisherCampaign->commission_type !== self::TYPE_FLAT) {
            return null;
        }
        $amount = $commission ? $commission->commission_value : $publisherCampaign->commission_value;
        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_FLAT,
            null,
            null,
            null,
            $conversion
        );
    }

    protected function getOfferCommission(Offer $offer, string $type): ?OfferCommission
    {

        return OfferCommission::where('offer_id', $offer->id)
            ->whereHas('commissionType', function ($query) use ($type) {
                $query->where('name', $type);
            })
            ->first();
    }

    protected function createEarning(
        PublisherCampaigns $publisherCampaign,
        float $amount,
        string $commissionType,
        ?float $rate = null,
        ?float $baseValue = null,
        ?Lead $lead = null,
        ?Conversion $conversion = null,
        ?string $notes = null
    ): PublisherEarning {
        return DB::transaction(function () use ($publisherCampaign, $amount, $commissionType, $rate, $baseValue, $lead, $conversion, $notes) {
            $earning = PublisherEarning::create([
                'publisher_id' => $publisherCampaign->publisher_id,
                'network_id' => $publisherCampaign->network_id,
                'publisher_campaign_id' => $publisherCampaign->id,
                'lead_id' => $lead?->id,
                'conversion_id' => $conversion?->id,
                'amount' => $amount,
                'commission_type' => $commissionType,
                'commission_rate' => $rate,
                'base_value' => $baseValue,
                'status' => 'pending',
                'notes' => $notes,
            ]);
            $publisherCampaign->increment('total_commission', $amount);
            $publisherCampaign->publisher->increment('total_earnings', $amount);

            $campaign = $publisherCampaign->campaign;
            if ($campaign) {
                $campaign->increment('spent_amount', $amount);

                $advertiser = $campaign->advertiser;
                if ($advertiser) {
                    $advertiser->decrement('available_budget', $amount);
                }
            }

            return $earning;
        });
    }

    public function getPublisherEarningsSummary(int $publisherId): array
    {
        $earnings = PublisherEarning::where('publisher_id', $publisherId)
            ->selectRaw('status, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');
        return [
            'pending' => [
                'amount' => $earnings->get('pending')?->total ?? 0,
                'count' => $earnings->get('pending')?->count ?? 0,
            ],
            'approved' => [
                'amount' => $earnings->get('approved')?->total ?? 0,
                'count' => $earnings->get('approved')?->count ?? 0,
            ],
            'invoiced' => [
                'amount' => $earnings->get('invoiced')?->total ?? 0,
                'count' => $earnings->get('invoiced')?->count ?? 0,
            ],
            'paid' => [
                'amount' => $earnings->get('paid')?->total ?? 0,
                'count' => $earnings->get('paid')?->count ?? 0,
            ],
            'available_for_invoice' => $this->getAvailableForInvoice($publisherId),
        ];
    }

    public function getAvailableForInvoice(int $publisherId): float
    {
        return PublisherEarning::where('publisher_id', $publisherId)
            ->whereIn('status', ['pending', 'approved'])
            ->whereNull('invoice_id')
            ->sum('amount');
    }

    /**
     * Create a Flat commission earning when a user subscribes via Builda.
     * The publisher who referred the user (via click) receives the Flat amount.
     */
    public function createBuildaSubscriptionEarning(Clicks $click): ?PublisherEarning
    {
        if (!$click->publisher_campaign_id) {
            return null;
        }

        $publisherCampaign = $click->publisherCampaign;
        if (!$publisherCampaign || $publisherCampaign->status !== 'A') {
            return null;
        }

        $offer = $publisherCampaign->offer ?? $click->offer;
        if (!$offer) {
            return null;
        }

        $commission = $this->getOfferCommission($offer, self::TYPE_FLAT);
        if (!$commission && $publisherCampaign->commission_type !== self::TYPE_FLAT) {
            return null;
        }

        $amount = $commission ? $commission->commission_value : $publisherCampaign->commission_value;
        if ($amount <= 0) {
            return null;
        }

        return $this->createEarning(
            $publisherCampaign,
            $amount,
            self::TYPE_FLAT,
            null,
            null,
            null,
            null,
            'Builda subscription'
        );
    }
}
