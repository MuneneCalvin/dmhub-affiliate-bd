<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Services\DashboardRevenueService;
use App\Services\PartnerReportingService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdvertiserDashboardController extends Controller
{
    public function index(DashboardRevenueService $revenue)
    {
        $user = Auth::user();
        $advertiser = Advertiser::where('user_id', $user->id)->first();
        if (! $advertiser) {
            return redirect()->route('dashboard')->with('error', 'Advertiser profile not found.');
        }
        $stats = [
            'total_campaigns' => Campaign::where('advertiser_id', $advertiser->id)->count(),
            'active_campaigns' => Campaign::where('advertiser_id', $advertiser->id)
                ->where('campaign_status', 'A')
                ->count(),
            'pending_campaigns' => Campaign::where('advertiser_id', $advertiser->id)
                ->where('campaign_status', 'P')
                ->count(),
            // Funding net of network fees and returned unused funds, in account currency.
            'net_funded_budget' => DB::table('ledger_entries')
                ->join('financial_transactions', 'financial_transactions.id', '=', 'ledger_entries.transaction_id')
                ->where('ledger_entries.account', 'advertiser')
                ->where('ledger_entries.owner_id', $advertiser->id)
                ->where('ledger_entries.currency', $advertiser->currency)
                ->whereIn('financial_transactions.kind', ['funding', 'funding_refund'])
                ->sum('ledger_entries.amount_minor') / 100,
            'available_budget' => $advertiser->available_budget ?? 0,
            'spent_budget' => Campaign::where('advertiser_id', $advertiser->id)
                ->sum('spent_amount'),
        ];
        $campaigns = Campaign::where('advertiser_id', $advertiser->id)
            ->with([
                'offers' => function ($query) {
                    $query->with('commissions.commissionType');
                },
            ])
            ->latest()
            ->take(10)
            ->get();
        $campaignIds = Campaign::where('advertiser_id', $advertiser->id)->pluck('id');

        $reporting = app(PartnerReportingService::class);
        $assignments = DB::table('publisher_campaigns')->whereIn('campaign_id', $campaignIds);
        $performance = $reporting->performance($assignments);

        $pending = DB::table('publisher_campaigns')
            ->whereIn('publisher_campaigns.campaign_id', $campaignIds)
            ->where('publisher_campaigns.status', 'P');
        $pendingApplications = (clone $pending)
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->select([
                'publisher_campaigns.id',
                'publisher_campaigns.campaign_id',
                'publisher_campaigns.applied_at',
                'publisher_campaigns.applied_notes',
                'users.first_name',
                'users.last_name',
                'users.email',
                'offers.name as offer_name',
                'campaigns.name as campaign_name',
            ])
            ->orderByDesc('publisher_campaigns.created_at')
            ->limit(5)
            ->get();

        $conversionRate = $performance->total_clicks > 0
            ? round(($performance->total_conversions / $performance->total_clicks) * 100, 2)
            : 0;

        return Inertia::render('advertiser_dashboard/dashboard', [
            'advertiser' => $advertiser,
            'stats' => $stats,
            'campaigns' => $campaigns,
            'performance' => $performance,
            'dailyRevenue' => $reporting->daily($assignments, $advertiser->currency ?: 'USD'),
            'pendingApplications' => $pendingApplications,
            'pendingApplicationsCount' => (clone $pending)->count(),
            'conversionRate' => $conversionRate,
        ]);
    }
}
