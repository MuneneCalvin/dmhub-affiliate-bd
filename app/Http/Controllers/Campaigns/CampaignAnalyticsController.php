<?php

namespace App\Http\Controllers\Campaigns;

use App\Exports\CampaignAnalyticsExport;
use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use App\Services\CampaignAnalyticsService;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class CampaignAnalyticsController extends Controller
{
    public function export(Request $request, int $campaign)
    {
        return $this->download($request, Campaign::visibleTo($request->user())->findOrFail($campaign));
    }

    public function publisherExport(Request $request, int $assignment)
    {
        $assignment = PublisherCampaigns::where('publisher_id', $request->user()->publisher?->id ?? 0)->findOrFail($assignment);

        return $this->download($request, $assignment->campaign, $assignment);
    }

    private function download(Request $request, Campaign $campaign, ?PublisherCampaigns $assignment = null)
    {
        $options = $request->validate(['format' => 'required|in:csv,xlsx', 'dataset' => 'nullable|in:breakdown,daily']);
        $data = app(CampaignAnalyticsService::class)->build($campaign, $request, $assignment);
        $filters = $data['filters'];
        $headings = ['Clicks', 'Approved conversions', 'Net approved sales', 'Net approved compensation', 'Conversion rate (%)', 'Earnings per click'];
        $values = fn ($row, bool $blankSales = false) => [$row['clicks'], $row['conversions'], $blankSales && ! $row['purchases'] ? null : $row['sales'],
            $row['commissions'], $row['conversion_rate'], $row['earnings_per_click']];
        $metadata = [
            ['Campaign', $campaign->name], ['Currency', $data['currency']],
            ['Start (UTC)', $filters['start']], ['End (UTC)', $filters['end']],
            ['Offer', collect($data['offers'])->firstWhere('id', $filters['offer'])['name'] ?? 'All offers'],
            ['Publisher', $assignment ? 'Your assignment only' : (collect($data['publishers'])->firstWhere('id', $filters['publisher'])['name'] ?? 'All publishers')],
            ['Confirmed outcomes awaiting financial review', $data['pending']],
            ['Refunds restate the original event date. Approved performance is not an available cash balance.'], [],
        ];
        $tables = ['Summary' => [...$metadata, $headings, $values($data['metrics'])]];
        foreach ($data['breakdowns'] as $group => $rows) {
            $tables['By '.$group] = [...$metadata, [ucfirst($group), ...$headings], ...array_map(fn ($row) => [$row['name'], ...$values($row, true)], $rows)];
        }
        $tables['Daily'] = [...$metadata, ['Date (UTC)', ...$headings], ...array_map(fn ($row) => [$row['date'], ...$values($row)], $data['days'])];
        $filename = 'campaign-'.$campaign->id.'-analytics-'.$filters['start'].'-'.$filters['end'];
        if ($options['format'] === 'xlsx') {
            return Excel::download(new CampaignAnalyticsExport($tables), $filename.'.xlsx', \Maatwebsite\Excel\Excel::XLSX, ['Cache-Control' => 'private, no-store']);
        }
        $dataset = $options['dataset'] ?? 'breakdown';
        $rows = $tables[$dataset === 'daily' ? 'Daily' : 'By '.$filters['group']];

        return response()->streamDownload(function () use ($rows) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($stream, array_map(fn ($value) => is_string($value) && preg_match('/^[\s\x00-\x1f]*[=+@-]/u', $value) ? "'".$value : $value, $row), ',', '"', '');
            }
            fclose($stream);
        }, $filename.'-'.$dataset.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }
}
