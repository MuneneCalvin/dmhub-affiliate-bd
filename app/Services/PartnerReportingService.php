<?php

namespace App\Services;

use App\Models\Campaign;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PartnerReportingService
{
    /** Reviewed, ledger-backed conversions; refunds restate the original event date. */
    public function facts(Builder $assignments): Builder
    {
        return DB::table('conversions as c')
            ->join('publisher_earnings as e', 'e.conversion_id', '=', 'c.id')
            ->whereIn('c.publisher_campaign_id', (clone $assignments)->select('publisher_campaigns.id'))
            ->whereNotNull('e.ledger_transaction_id')->where('c.status', 'A')
            ->whereIn('e.status', ['approved', 'locked', 'payable', 'paid'])
            ->selectRaw("c.publisher_campaign_id, c.conversion_date, c.currency, c.status,
                CASE WHEN c.conversion_type = 'purchase' THEN c.sale_amount - e.refunded_basis_minor / 100.0 ELSE 0 END as sale_amount,
                e.amount - e.reversed_minor / 100.0 as commission_amount");
    }

    public function performance(Builder $assignments): object
    {
        $clicks = DB::table('clicks')->whereIn('publisher_campaign_id', (clone $assignments)->select('publisher_campaigns.id'))->count();
        $facts = DB::query()->fromSub($this->facts($assignments), 'facts');
        $money = (clone $facts)->selectRaw('currency, SUM(sale_amount) as revenue, SUM(commission_amount) as commission, COUNT(*) as conversions')
            ->groupBy('currency')->orderBy('currency')->get();

        return (object) [
            'total_clicks' => $clicks,
            'total_conversions' => (int) $money->sum('conversions'),
            'by_currency' => $money,
        ];
    }

    public function assignment($assignment): void
    {
        $id = $assignment->publisher_campaign_id ?? $assignment->id;
        $performance = $this->performance(DB::table('publisher_campaigns')->where('id', $id));
        $money = $performance->by_currency->firstWhere('currency', $assignment->currency);
        $assignment->total_clicks = $performance->total_clicks;
        $assignment->total_conversions = $performance->total_conversions;
        $assignment->total_revenue = (float) ($money->revenue ?? 0);
        $assignment->total_commission = (float) ($money->commission ?? 0);
        $assignment->conversion_rate = $performance->total_clicks ? round(100 * $performance->total_conversions / $performance->total_clicks, 2) : 0;
        $assignment->earnings_per_click = $performance->total_clicks ? round($assignment->total_commission / $performance->total_clicks, 2) : 0;
    }

    public function daily(Builder $assignments, string $currency = 'USD'): array
    {
        return app(DashboardRevenueService::class)->lastThirtyDays(DB::query()->fromSub($this->facts($assignments), 'facts'), $currency);
    }

    /** Click counts for the same thirty days as daily(), oldest first. */
    public function dailyClicks(Builder $assignments): array
    {
        return app(DashboardRevenueService::class)->lastThirtyDaysCount(
            DB::table('clicks')->whereIn('publisher_campaign_id', (clone $assignments)->select('publisher_campaigns.id')),
            'clicked_at',
        );
    }

    /**
     * Network-wide earnings per click for each campaign, in the campaign's own currency.
     *
     * @param  Collection<int, Campaign>  $campaigns
     * @return array<int, float|null> campaign id => EPC (null when there are no clicks yet)
     */
    public function campaignEpc($campaigns): array
    {
        $ids = $campaigns->pluck('id');
        if ($ids->isEmpty()) {
            return [];
        }
        $clicks = DB::table('clicks')->whereIn('campaign_id', $ids)
            ->selectRaw('campaign_id, COUNT(*) as total')->groupBy('campaign_id')->pluck('total', 'campaign_id');
        $commission = DB::query()
            ->fromSub($this->facts(DB::table('publisher_campaigns')->whereIn('campaign_id', $ids)), 'facts')
            ->join('publisher_campaigns as pc', 'pc.id', '=', 'facts.publisher_campaign_id')
            ->selectRaw('pc.campaign_id, facts.currency, SUM(facts.commission_amount) as total')
            ->groupBy('pc.campaign_id', 'facts.currency')
            ->get();

        return $campaigns->mapWithKeys(function ($campaign) use ($clicks, $commission) {
            $count = (int) ($clicks[$campaign->id] ?? 0);
            $earned = (float) ($commission->first(fn ($row) => (int) $row->campaign_id === $campaign->id && $row->currency === $campaign->currency)->total ?? 0);

            return [$campaign->id => $count > 0 ? round($earned / $count, 2) : null];
        })->all();
    }
}
