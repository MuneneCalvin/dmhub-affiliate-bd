<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Network;
use App\Models\Offer;
use App\Models\Publisher;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_networks' => Network::count(),
            'active_networks' => Network::where('status', 'A')->count(),
            'pending_networks' => Network::where('status', 'P')->count(),

            'total_users' => User::count(),
            'total_publishers' => User::where('is_publisher', true)->count(),
            'total_advertisers' => User::where('is_advertiser', true)->count(),
            'total_network_owners' => User::where('is_network', true)->count(),

            'total_campaigns' => Campaign::count(),
            'active_campaigns' => Campaign::where('campaign_status', 'A')->count(),
            'total_offers' => Offer::count(),
            'active_offers' => Offer::where('offer_status', 'A')->count(),

            'pending_publishers' => User::where('is_publisher', true)->where('status', 'P')->count(),
            'pending_advertisers' => User::where('is_advertiser', true)->where('status', 'P')->count(),
        ];

        $recentNetworks = Network::latest()
            ->take(5)
            ->get(['id', 'network_name', 'status', 'owner_email', 'created_at']);
        $pendingNetworks = Network::where('status', 'P')
            ->latest()
            ->take(5)
            ->get(['id', 'network_name', 'owner_email', 'created_at']);
            
        $pendingUsers = User::where('status', 'P')
            ->where(function ($query) {
                $query->where('is_publisher', true)
                    ->orWhere('is_advertiser', true);
            })
            // ->latest()
            ->take(10)
            ->get(['id', 'first_name', 'last_name', 'email', 'is_publisher', 'is_advertiser']);

        $performance = DB::table('publisher_campaigns')
            ->selectRaw('
                COALESCE(SUM(total_clicks), 0) as total_clicks,
                COALESCE(SUM(total_conversions), 0) as total_conversions,
                COALESCE(SUM(total_revenue), 0) as total_revenue,
                COALESCE(SUM(total_commission), 0) as total_commission
            ')
            ->first();

        $networkBreakdown = Network::withCount(['publishers', 'advertisers', 'campaigns'])
            ->where('status', 'A')
            ->orderByDesc('campaigns_count')
            ->take(5)
            ->get(['id', 'network_name', 'publishers_count', 'advertisers_count', 'campaigns_count']);

        $recentDisputes = DB::table('disputes')
            ->latest()
            ->take(5)
            ->get();

        return Inertia::render('admin_dashboard/dashboard', [
            'stats' => $stats,
            'recentNetworks' => $recentNetworks,
            'pendingNetworks' => $pendingNetworks,
            'pendingUsers' => $pendingUsers,
            'performance' => $performance,
            'networkBreakdown' => $networkBreakdown,
            'recentDisputes' => $recentDisputes,
        ]);
    }
}
