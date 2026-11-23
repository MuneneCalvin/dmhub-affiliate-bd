<?php

namespace App\Http\Controllers\Campaigns;

use App\Exports\CampaignAnalyticsExport;
use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use App\Services\CampaignFinanceService;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class CampaignFinanceController extends Controller
{
    public function __construct(private CampaignFinanceService $finance) {}

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
        $options = $request->validate(['format' => 'required|in:csv,xlsx']);
        $filters = $this->finance->filters($request);
        $query = $this->finance->filtered($this->finance->query($campaign, $assignment), $filters)->with(['conversion.offer', 'publisher.user'])->orderBy('id');
        $headings = ['Order', $assignment ? 'Offer' : 'Publisher', 'Currency', 'Original compensation', 'Compensation reversed', 'Net compensation', 'Financial status', 'Ledger backed'];
        $values = function ($earning) use ($assignment) {
            $row = $this->finance->row($earning);

            return [$row['order'], $row[$assignment ? 'offer' : 'publisher'], $row['currency'], $row['original_minor'] / 100,
                $row['reversed_minor'] / 100, $row['commission_minor'] / 100, $row['status_label'], $row['ledger_backed'] ? 'Yes' : 'No'];
        };
        $metadata = [['Campaign', $campaign->name], ['Scope', $assignment ? 'Your assignment only' : 'Campaign earnings'],
            ['Currency', $campaign->currency], ['Status', $filters['status']], ['Order search', $filters['search']],
            ['Performance totals are not payout balances. All matching rows are included.'], []];
        $filename = 'campaign-'.$campaign->id.'-finance';
        if ($options['format'] === 'xlsx') {
            return Excel::download(new CampaignAnalyticsExport(['Earnings' => [...$metadata, $headings, ...$query->get()->map($values)->all()]]),
                $filename.'.xlsx', \Maatwebsite\Excel\Excel::XLSX, ['Cache-Control' => 'private, no-store']);
        }

        return response()->streamDownload(function () use ($query, $metadata, $headings, $values) {
            $stream = fopen('php://output', 'w');
            fwrite($stream, "\xEF\xBB\xBF");
            $write = function ($row) use ($stream) {
                fputcsv($stream, array_map(fn ($value) => is_string($value) && preg_match('/^[\s\x00-\x1f]*[=+@-]/u', $value) ? "'".$value : $value, $row), ',', '"', '');
            };
            foreach ([...$metadata, $headings] as $row) {
                $write($row);
            }
            foreach ($query->lazy(500) as $earning) {
                $write($values($earning));
            }
            fclose($stream);
        }, $filename.'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store']);
    }

    private function earning(Request $request, int $campaign, int $earning)
    {
        $campaign = Campaign::visibleTo($request->user())->findOrFail($campaign);

        return $this->finance->query($campaign)->findOrFail($earning);
    }

    public function preview(Request $request, int $campaign, int $earning)
    {
        $earning = $this->earning($request, $campaign, $earning);
        $data = $request->validate(['amount' => ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D']]);

        return response()->json($this->finance->preview($earning, (string) $data['amount']))->header('Cache-Control', 'private, no-store');
    }

    public function adjust(Request $request, int $campaign, int $earning, EarningReviewService $reviews)
    {
        $earning = $this->earning($request, $campaign, $earning);
        abort_unless($this->finance->canOperate($request->user(), 'adjust_commissions'), 403);
        $data = $request->validate(['amount' => ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'],
            'reference' => 'required|string|max:120', 'reason' => 'required|string|max:500', 'version' => 'required|string|size:64']);
        DB::transaction(function () use ($earning, $data, $request, $reviews) {
            app(LedgerService::class)->lock($earning->network_id);
            $earning->refresh();
            // An identical retry is safe even after the first request changed the earning.
            $existing = DB::table('financial_transactions')->where('reference', 'adjustment:'.$earning->id.':'.$data['reference'])->exists();
            abort_unless($existing || hash_equals($this->finance->version($earning), $data['version']), 409, 'The earning changed. Preview the adjustment again.');
            $reviews->adjust($earning, 'refund', (string) $data['amount'], $data['reference'], $data['reason'], $request->user()->id);
        });

        return back()->with('success', 'Compensation adjustment recorded.');
    }

    public function review(Request $request, int $campaign, int $earning, EarningReviewService $reviews)
    {
        $earning = $this->earning($request, $campaign, $earning);
        abort_unless($this->finance->canOperate($request->user(), 'review_commissions'), 403);
        $data = $request->validate(['decision' => 'required|in:approve,reject', 'reason' => 'required|string|max:500']);
        if ($data['decision'] === 'approve') {
            $reviews->approve($earning, $request->user()->id, $data['reason']);
        } else {
            $reviews->adjust($earning, 'rejection', null, 'review-rejection', $data['reason'], $request->user()->id);
        }

        return back()->with('success', 'Compensation review recorded.');
    }
}
