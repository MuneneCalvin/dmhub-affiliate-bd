<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Notifications\PublisherApplicationReceived;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
            ->where('network_id', $publisher->network_id ?? 0);
    }

    public function index()
    {
        $publisher = Publisher::where('user_id', Auth::id())->firstOrFail();

        $appliedCampaignIds = DB::table('publisher_campaigns')
            ->where('publisher_id', $publisher->id)
            ->whereIn('status', ['P', 'A'])
            ->pluck('campaign_id')
            ->toArray();

        $campaigns = $this->openCampaigns($publisher)
            ->whereNotIn('id', $appliedCampaignIds)
            ->with('offers')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('publisher_dashboard/dashboard', [
            'campaigns' => $campaigns,
            'publisher_id' => $publisher->id,
        ]);
    }

    public function publisherApplication($id)
    {
        $publisher = Publisher::where('user_id', Auth::id())->firstOrFail();
        $campaign = $this->openCampaigns($publisher)->with(['offers' => function ($query) {
            $query->where('offer_status', 'A');
        }])->findOrFail($id);

        return inertia('publisher_campaign_applications/index', [
            'campaign' => $campaign,
        ]);
    }

    public function sendCampaignApplication(Request $request, $campaignId)
    {
        try {
            $validated = $request->validate([
                'applied_notes' => ['required', 'string'],
            ]);

            $user = Auth::user();
            $publisher = Publisher::where('user_id', $user->id)->firstOrFail();
            $campaign = $this->openCampaigns($publisher)->findOrFail($campaignId);
            $existingApplication = DB::table('publisher_campaigns')
                ->where('publisher_id', $publisher->id)
                ->where('campaign_id', $campaignId)
                ->whereIn('status', ['P', 'A'])
                ->exists();

            if ($existingApplication) {
                return redirect()
                    ->back()
                    ->with('error', 'You have already applied to this campaign');
            }

            $applicationId = DB::table('publisher_campaigns')->insertGetId([
                'publisher_id' => $publisher->id,
                'campaign_id' => $campaignId,
                'offer_id' => null,
                'network_id' => $campaign->network_id,
                'status' => 'P',
                'applied_notes' => $validated['applied_notes'],
                'applied_at' => now(),
                'tracking_link' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $application = PublisherCampaigns::with('campaign')->find($applicationId);

            $networkUsers = User::where('is_network', true)
                ->whereHas('userNetworks', fn ($q) => $q->where('network_id', $campaign->network_id))
                ->get();

            Notification::send($networkUsers, new PublisherApplicationReceived($application));

            return redirect()
                ->route('publisher.dashboard')
                ->with('success', 'Application submitted successfully. The network will review and assign you to an offer.');

        } catch (ModelNotFoundException $e) {
            throw $e;
        } catch (Exception $e) {
            report($e);

            return redirect()
                ->back()
                ->with('error', 'An error occurred while applying to the campaign');
        }
    }
}
