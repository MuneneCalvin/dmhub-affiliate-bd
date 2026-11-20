<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CampaignAnalyticsService
{
    /** The caller must authorize the campaign or publisher assignment first. */
    public function build(Campaign $campaign, Request $request, ?PublisherCampaigns $assignment = null): array
    {
        $input = $request->validate([
            'start' => 'nullable|date_format:Y-m-d', 'end' => 'nullable|date_format:Y-m-d',
            'offer' => 'nullable|integer|min:1', 'publisher' => 'nullable|integer|min:1',
            'group' => $assignment ? 'nullable|in:offer' : 'nullable|in:offer,publisher',
        ]);
        $end = CarbonImmutable::parse($input['end'] ?? CarbonImmutable::now('UTC')->toDateString(), 'UTC')->startOfDay();
        $start = CarbonImmutable::parse($input['start'] ?? $end->subDays(29)->toDateString(), 'UTC')->startOfDay();
        if ($start->gt($end) || $start->diffInDays($end) > 365) {
            throw ValidationException::withMessages(['start' => 'Choose a date range of 1 to 366 days, with the start on or before the end.']);
        }
        $scope = DB::table('publisher_campaigns')->where('publisher_campaigns.campaign_id', $campaign->id)
            ->when($assignment, fn ($q) => $q->where('publisher_campaigns.id', $assignment->id));
        $ids = (clone $scope)->select('publisher_campaigns.id');
        $offers = $campaign->offers()->when($assignment, fn ($q) => $q->where(function ($q) use ($assignment, $ids) {
            // Keep historical attribution visible if an assignment's offer changes.
            $q->where('id', $assignment->offer_id ?? 0)
                ->orWhereIn('id', DB::table('clicks')->whereIn('publisher_campaign_id', $ids)->select('offer_id'))
                ->orWhereIn('id', DB::table('conversions')->whereIn('publisher_campaign_id', $ids)->select('offer_id'));
        }))->orderBy('name')->get(['id', 'name']);
        $publishers = DB::table('publishers as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->whereIn('p.id', (clone $scope)->select('publisher_campaigns.publisher_id'))
            ->get(['p.id', 'p.business_name', 'u.first_name', 'u.last_name'])
            ->map(fn ($row) => (object) ['id' => $row->id, 'name' => $row->business_name ?: trim($row->first_name.' '.$row->last_name) ?: 'Publisher'])
            ->sortBy('name')->values();
        $offer = isset($input['offer']) ? (int) $input['offer'] : null;
        $publisher = isset($input['publisher']) ? (int) $input['publisher'] : null;
        abort_if($offer && ! $offers->contains('id', $offer), 404);
        abort_if($publisher && ! $publishers->contains('id', $publisher), 404);

        $facts = app(PartnerReportingService::class)->facts($scope)
            ->addSelect('c.offer_id', 'c.publisher_id', 'c.conversion_type');
        $facts = DB::query()->fromSub($facts, 'facts')->where('currency', $campaign->currency)
            ->whereBetween('conversion_date', [$start->toDateString(), $end->toDateString()])
            ->when($offer, fn ($q) => $q->where('offer_id', $offer))
            ->when($publisher, fn ($q) => $q->where('publisher_id', $publisher));
        $clicks = DB::table('clicks')->whereIn('publisher_campaign_id', $ids)
            ->whereBetween('clicked_at', [$start, $end->endOfDay()])
            ->when($offer, fn ($q) => $q->where('offer_id', $offer))
            ->when($publisher, fn ($q) => $q->where('publisher_id', $publisher));
        $pending = DB::table('conversions as c')->join('publisher_earnings as e', 'e.conversion_id', '=', 'c.id')
            ->whereIn('c.publisher_campaign_id', $ids)->where('e.status', 'pending')->whereNotNull('c.conversion_event_id')
            ->where('c.currency', $campaign->currency)->whereBetween('c.conversion_date', [$start->toDateString(), $end->toDateString()])
            ->when($offer, fn ($q) => $q->where('c.offer_id', $offer))
            ->when($publisher, fn ($q) => $q->where('c.publisher_id', $publisher))->count();
        $totals = $this->aggregate(clone $facts)->first();
        $metrics = $this->metrics($totals, (clone $clicks)->count());
        $daily = $this->aggregate(clone $facts)->addSelect('conversion_date')->groupBy('conversion_date')->get()->keyBy('conversion_date');
        $dailyClicks = (clone $clicks)->selectRaw('DATE(clicked_at) as day, COUNT(*) as clicks')->groupByRaw('DATE(clicked_at)')->pluck('clicks', 'day');
        $days = [];
        for ($date = $start; $date->lte($end); $date = $date->addDay()) {
            $key = $date->toDateString();
            $days[] = ['date' => $key, ...$this->metrics($daily->get($key), (int) ($dailyClicks[$key] ?? 0))];
        }
        $breakdowns = [];
        foreach ($assignment ? ['offer'] : ['offer', 'publisher'] as $group) {
            $field = $group.'_id';
            $values = $this->aggregate(clone $facts)->addSelect($field)->groupBy($field)->get()->keyBy($field);
            $counts = (clone $clicks)->selectRaw($field.', COUNT(*) as clicks')->groupBy($field)->pluck('clicks', $field);
            $entities = ($group === 'offer' ? $offers : $publishers)->filter(fn ($entity) => ! ($group === 'offer' ? $offer : $publisher) || $entity->id === ($group === 'offer' ? $offer : $publisher));
            $breakdowns[$group] = $entities->map(fn ($entity) => ['id' => $entity->id, 'name' => $entity->name,
                ...$this->metrics($values->get($entity->id), (int) ($counts[$entity->id] ?? 0))])->values()->all();
        }

        return [
            'publisher_view' => $assignment !== null, 'currency' => $campaign->currency,
            'filters' => ['start' => $start->toDateString(), 'end' => $end->toDateString(), 'offer' => $offer, 'publisher' => $publisher, 'group' => $input['group'] ?? 'offer'],
            'offers' => $offers->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name])->all(),
            'publishers' => $assignment ? [] : $publishers->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name])->all(),
            'metrics' => $metrics, 'pending' => $pending, 'days' => $days, 'breakdowns' => $breakdowns,
            'export_url' => $assignment ? route('publisher.analytics.export', $assignment->id) : route('campaign.analytics.export', $campaign->id),
        ];
    }

    private function aggregate(Builder $query): Builder
    {
        return $query->selectRaw("COUNT(*) as conversions, COALESCE(SUM(sale_amount), 0) as sales,
            COALESCE(SUM(commission_amount), 0) as commissions,
            SUM(CASE WHEN conversion_type = 'purchase' THEN 1 ELSE 0 END) as purchases");
    }

    private function metrics(?object $total, int $clicks): array
    {
        $conversions = (int) ($total->conversions ?? 0);
        $commissions = round((float) ($total->commissions ?? 0), 2);

        return ['clicks' => $clicks, 'conversions' => $conversions, 'sales' => round((float) ($total->sales ?? 0), 2),
            'commissions' => $commissions, 'purchases' => (int) ($total->purchases ?? 0),
            'conversion_rate' => $clicks ? round(100 * $conversions / $clicks, 2) : 0,
            'earnings_per_click' => $clicks ? round($commissions / $clicks, 4) : 0];
    }
}
