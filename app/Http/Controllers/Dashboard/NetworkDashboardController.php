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

        return Inertia::render('network_dashboard/dashboard', [
            'network' => $network,
            'stats' => $stats,
            'pendingPublishers' => $pendingPublishers,
            'pendingAdvertisers' => $pendingAdvertisers,
            'recentCampaigns' => $recentCampaigns,
            'performance' => $performance,
            'dailyRevenue' => $reporting->daily($assignments, $network->default_currency ?: 'USD'),
        ]);
    }
}
