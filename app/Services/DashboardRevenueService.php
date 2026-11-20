<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;

class DashboardRevenueService
{
    /** Approved sales, grouped by conversion date and currency, including today. */
    public function lastThirtyDays(Builder $conversions, string $defaultCurrency = 'USD'): array
    {
        $end = CarbonImmutable::today();
        $start = $end->subDays(29);
        $rows = (clone $conversions)
            ->where('status', 'A')
            ->whereBetween('conversion_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('conversion_date, currency, SUM(sale_amount) as revenue, SUM(commission_amount) as commission, COUNT(*) as conversions')
            ->groupBy('conversion_date', 'currency')
            ->get();

        $currencies = $rows->pluck('currency')->push($defaultCurrency)->unique()->sort()->values();

        return $currencies->map(function ($currency) use ($rows, $start) {
            $daily = $rows->where('currency', $currency)->keyBy('conversion_date');

            return [
                'currency' => $currency,
                'days' => collect(range(0, 29))->map(function ($offset) use ($daily, $start) {
                    $date = $start->addDays($offset)->toDateString();
                    $row = $daily->get($date);

                    return [
                        'date' => $date,
                        'revenue' => round((float) ($row->revenue ?? 0), 2),
                        'commission' => round((float) ($row->commission ?? 0), 2),
                        'conversions' => (int) ($row->conversions ?? 0),
                    ];
                })->all(),
            ];
        })->all();
    }

    /**
     * Row counts per day for the same window as lastThirtyDays().
     *
     * @return list<array{date: string, count: int}>
     */
    public function lastThirtyDaysCount(Builder $rows, string $column): array
    {
        $end = CarbonImmutable::today();
        $start = $end->subDays(29);
        $counts = (clone $rows)
            ->whereBetween($column, [$start->startOfDay(), $end->endOfDay()])
            ->selectRaw("DATE($column) as day, COUNT(*) as total")
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range(0, 29))->map(function ($offset) use ($counts, $start) {
            $date = $start->addDays($offset)->toDateString();

            return ['date' => $date, 'count' => (int) ($counts[$date] ?? 0)];
        })->all();
    }
}
