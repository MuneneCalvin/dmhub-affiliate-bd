<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Offer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdvertiserDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $advertiser = Advertiser::where('user_id', $user->id)->first();
        if (!$advertiser) {
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
            'total_budget' => $advertiser->total_budget ?? 0,
            'available_budget' => $advertiser->available_budget ?? 0,
            'spent_budget' => Campaign::where('advertiser_id', $advertiser->id)
                ->sum('spent_amount'),
        ];
        $campaigns = Campaign::where('advertiser_id', $advertiser->id)
            ->with([
                'offers' => function ($query) {
                    $query->select('id', 'campaign_id', 'name', 'offer_status', 'commission_value_1');
                }
            ])
            ->latest()
            ->take(10)
            ->get();
        $campaignIds = Campaign::where('advertiser_id', $advertiser->id)->pluck('id');

        $performance = DB::table('publisher_campaigns')
            ->whereIn('campaign_id', $campaignIds)
            ->selectRaw('
                COALESCE(SUM(total_clicks), 0) as total_clicks,
                COALESCE(SUM(total_conversions), 0) as total_conversions,
                COALESCE(SUM(total_revenue), 0) as total_revenue,
                COALESCE(SUM(total_commission), 0) as total_commission
            ')
            ->first();

        $pendingApplications = DB::table('publisher_campaigns')
            ->whereIn('publisher_campaigns.campaign_id', $campaignIds)
            ->where('publisher_campaigns.status', 'P')
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->select([
                'publisher_campaigns.id',
                'publisher_campaigns.applied_at',
                'publisher_campaigns.applied_notes',
                'users.first_name',
                'users.last_name',
                'users.email',
                'offers.name as offer_name',
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
            'pendingApplications' => $pendingApplications,
            'conversionRate' => $conversionRate,
        ]);
    }
}
