<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Publisher;
use App\Models\User;
use App\Notifications\PublisherApplicationReceived;
use App\Services\PartnerEnrollmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class PublisherDashBoardController extends Controller
{
    /**
     * Active campaigns of the publisher's own network (nothing when unassigned).
     */
    private function openCampaigns(Publisher $publisher)
    {
        return Campaign::where('campaign_status', 'A')
            ->where('network_id', $publisher->network_id ?? 0)
            ->where('end_date', '>=', now());
    }

    public function index(Request $request)
    {
        $publisher = Publisher::where('user_id', Auth::id())->firstOrFail();
        $filters = $request->validate([
            'campaign_status' => 'nullable|in:A,I', 'application_status' => 'nullable|in:P,A,R,I,none',
            'start_date' => 'nullable|date', 'applied_start_date' => 'nullable|date',
        ]);
        $applications = DB::table('publisher_campaigns')->where('publisher_id', $publisher->id);
        $query = Campaign::where('network_id', $publisher->network_id ?? 0)
            ->where('campaign_status', $filters['campaign_status'] ?? 'A')
            ->with(['offers' => fn ($q) => $q->where('offer_status', 'A')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))->with('commissions.commissionType')]);
        if (($filters['application_status'] ?? null) === 'none') {
            $query->whereNotIn('id', (clone $applications)->select('campaign_id'));
        } elseif (! empty($filters['application_status'])) {
            $query->whereIn('id', (clone $applications)->where('status', $filters['application_status'])->select('campaign_id'));
        }
        if (! empty($filters['start_date'])) {
            $query->whereDate('start_date', '>=', $filters['start_date']);
        }
        if (! empty($filters['applied_start_date'])) {
            $query->whereIn('id', (clone $applications)->whereDate('applied_at', '>=', $filters['applied_start_date'])->select('campaign_id'));
        }
        $campaigns = $query->latest()->paginate(12)->withQueryString();
        $enrollments = $applications->whereIn('campaign_id', $campaigns->pluck('id'))->get()->keyBy('campaign_id');
        $campaigns->getCollection()->each(function ($campaign) use ($enrollments) {
            $enrollment = $enrollments->get($campaign->id);
            $campaign->enrollment = $enrollment ? (array) $enrollment : null;
        });

        return Inertia::render('publisher_dashboard/dashboard', [
            'campaigns' => $campaigns, 'filters' => $filters, 'publisher_id' => $publisher->id,
        ]);
    }

    public function publisherApplication($id)
    {
        $publisher = Publisher::where('user_id', Auth::id())->firstOrFail();
        $campaign = $this->openCampaigns($publisher)->with(['offers' => function ($query) {
            $query->where('offer_status', 'A')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))->with('commissions.commissionType');
        }])->findOrFail($id);

        $enrollment = app(PartnerEnrollmentService::class);
        $campaign->offers->each(function ($offer) use ($campaign, $enrollment) {
            $offer->enrollment_contract = $enrollment->contract($campaign, $offer);
            $offer->terms_version = $enrollment->version($offer->enrollment_contract);
        });

        return inertia('publisher_campaign_applications/index', [
            'campaign' => $campaign,
            'enrollment' => $publisher->campaigns()->where('campaign_id', $campaign->id)->first(['id', 'status', 'requested_offer_id', 'applied_notes', 'terms_version', 'rejection_reason']),
        ]);
    }

    public function sendCampaignApplication(Request $request, $campaignId)
    {
        $validated = $request->validate([
            'applied_notes' => ['required', 'string', 'max:5000'],
            'offer_id' => ['required', 'integer'],
            'terms_accepted' => ['accepted'],
            'terms_version' => ['required', 'string', 'size:64'],
        ]);
        $publisher = Publisher::where('user_id', Auth::id())->firstOrFail();
        $application = app(PartnerEnrollmentService::class)->apply($publisher, (int) $campaignId, $validated);
        $networkUsers = User::where('is_network', true)
            ->whereHas('userNetworks', fn ($q) => $q->where('network_id', $application->network_id))->get();
        Notification::send($networkUsers, new PublisherApplicationReceived($application));

        return redirect()->route('publisher.dashboard')->with('success', 'Application submitted for review.');
    }
}
