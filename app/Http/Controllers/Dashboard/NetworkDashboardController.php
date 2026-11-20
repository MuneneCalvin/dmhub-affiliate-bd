<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Network;
use App\Models\Offer;
use App\Models\Publisher;
use App\Services\DashboardRevenueService;
use App\Services\PartnerReportingService;
use App\Support\Tenancy;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NetworkDashboardController extends Controller
{
    public function index(DashboardRevenueService $revenue)
    {
        $user = Auth::user();
        $network = Network::find($user->networkId());

        if (! $network) {
            return redirect()->route('dashboard')->with('error', 'No network found for this user.');
        }
        $stats = [
            'total_publishers' => Publisher::where('network_id', $network->id)->count(),
            'pending_publishers' => Publisher::where('network_id', $network->id)
                ->whereHas('user', fn ($q) => $q->where('status', 'P'))
                ->count(),
            'total_advertisers' => Advertiser::where('network_id', $network->id)->count(),
            'pending_advertisers' => Advertiser::where('network_id', $network->id)
                ->where('status', 'P')
                ->count(),
            'total_campaigns' => Campaign::where('network_id', $network->id)->count(),
            'active_campaigns' => Campaign::where('network_id', $network->id)
                ->where('campaign_status', 'A')
                ->count(),
            'total_offers' => Offer::where('network_id', $network->id)->count(),
            'active_offers' => Offer::where('network_id', $network->id)
                ->where('offer_status', 'A')
                ->count(),
        ];
        $pendingPublishers = Publisher::where('network_id', $network->id)
            ->whereHas('user', fn ($q) => $q->where('status', 'P'))
            ->with('user:id,first_name,last_name,email,created_at')
            ->latest()
            ->take(5)
            ->get();

        $pendingAdvertisers = Advertiser::where('network_id', $network->id)
            ->where('status', 'P')
            ->with('user:id,first_name,last_name,email')
            ->get();

        $recentCampaigns = Campaign::where('network_id', $network->id)
            ->with('advertiser.user:id,first_name,last_name')
            ->latest()
            ->take(5)
            ->get();

        $reporting = app(PartnerReportingService::class);
        $assignments = DB::table('publisher_campaigns')->where('network_id', $network->id);
        $performance = $reporting->performance($assignments);

        $campaignStatusCounts = Campaign::where('network_id', $network->id)
            ->selectRaw('campaign_status, COUNT(*) as total')
            ->groupBy('campaign_status')
            ->pluck('total', 'campaign_status');

        // Budget per currency; amounts in different currencies are never added together.
        $budgets = Campaign::where('network_id', $network->id)
            ->selectRaw('currency, SUM(total_budget) as total, SUM(spent_amount) as spent')
            ->groupBy('currency')
            ->orderBy('currency')
            ->get()
            ->map(fn ($row) => ['currency' => $row->currency, 'total' => (float) $row->total, 'spent' => (float) $row->spent]);

        // Same scope as PublisherApplicationController@index for this network.
        $pending = DB::table('publisher_campaigns')
            ->where('publisher_campaigns.network_id', $network->id)
            ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user))
            ->where('publisher_campaigns.status', 'P');
        $pendingApplications = (clone $pending)
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
            ->select([
                'publisher_campaigns.id',
                'publisher_campaigns.applied_at',
                'publisher_campaigns.created_at',
                'publisher_campaigns.requested_offer_id',
                'users.first_name',
                'users.last_name',
                'users.email',
                'campaigns.name as campaign_name',
                'requested_offers.name as requested_offer_name',
            ])
            ->orderByDesc('publisher_campaigns.created_at')
            ->limit(5)
            ->get();

        return Inertia::render('network_dashboard/dashboard', [
            'network' => $network,
            'stats' => $stats,
            'pendingPublishers' => $pendingPublishers,
            'pendingAdvertisers' => $pendingAdvertisers,
            'recentCampaigns' => $recentCampaigns,
            'performance' => $performance,
            'dailyRevenue' => $reporting->daily($assignments, $network->default_currency ?: 'USD'),
            'dailyClicks' => $reporting->dailyClicks($assignments),
            'campaignStatusCounts' => $campaignStatusCounts,
            'budgets' => $budgets,
            'pendingApplications' => $pendingApplications,
            'pendingApplicationsCount' => (clone $pending)->count(),
        ]);
    }
}
