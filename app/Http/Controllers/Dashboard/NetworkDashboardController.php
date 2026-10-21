<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Network;
use App\Models\Offer;
use App\Models\Publisher;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NetworkDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $network = Network::where('owner_email', $user->email)->first();

        if ($network) {
        } else {
             $userNetwork = \App\Models\UserNetworks::where('user_id', $user->id)->first();
             if ($userNetwork) {
                 $network = Network::find($userNetwork->network_id);
             }
        }

        if (!$network) {
            return redirect()->route('dashboard')->with('error', 'No network found for this user.');
        }
        $stats = [
            'total_publishers' => Publisher::where('network_id', $network->id)->count(),
            'pending_publishers' => Publisher::where('network_id', $network->id)
                ->whereHas('user', fn($q) => $q->where('status', 'P'))
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
            ->whereHas('user', fn($q) => $q->where('status', 'P'))
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

        $performance = DB::table('publisher_campaigns')
            ->where('network_id', $network->id)
            ->selectRaw('
                COALESCE(SUM(total_clicks), 0) as total_clicks,
                COALESCE(SUM(total_conversions), 0) as total_conversions,
                COALESCE(SUM(total_revenue), 0) as total_revenue,
                COALESCE(SUM(total_commission), 0) as total_commission
            ')
            ->first();

        return Inertia::render('network_dashboard/dashboard', [
            'network' => $network,
            'stats' => $stats,
            'pendingPublishers' => $pendingPublishers,
            'pendingAdvertisers' => $pendingAdvertisers,
            'recentCampaigns' => $recentCampaigns,
            'performance' => $performance,
        ]);
    }
}
