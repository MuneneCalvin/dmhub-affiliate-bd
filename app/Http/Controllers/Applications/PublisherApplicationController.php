<?php

namespace App\Http\Controllers\Applications;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\OfferCommission;
use App\Models\PublisherCampaigns;
use App\Models\UserNetworks;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PublisherApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $networkId = UserNetworks::where('user_id', $user->id)
            ->value('network_id');

        $status = $request->input('status', 'P');

        $applications = PublisherCampaigns::query()
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->select([
                'publisher_campaigns.id',
                'publisher_campaigns.status',
                'publisher_campaigns.offer_id',
                'publisher_campaigns.applied_notes',
                'publisher_campaigns.applied_at',
                'publisher_campaigns.created_at',
                'publishers.website_url',
                'users.first_name',
                'users.last_name',
                'users.email',
                'campaigns.name as campaign_name',
                'offers.name as offer_name',
            ])
            ->when($user->is_network && $networkId, function ($q) use ($networkId) {
                $q->where('publisher_campaigns.network_id', $networkId);
            })
            ->when($status !== 'all', function ($q) use ($status) {
                $q->where('publisher_campaigns.status', $status);
            })
            ->orderByDesc('publisher_campaigns.created_at')
            ->paginate(10)
            ->withQueryString();

        return inertia('applications/index', [
            'applications' => $applications,
            'currentStatus' => $status,
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();
        $userNetwork = UserNetworks::where('user_id', $user->id)->first();

        $application = PublisherCampaigns::query()
            ->where('publisher_campaigns.id', $id)
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->join('networks', 'networks.id', '=', 'publisher_campaigns.network_id')
            ->select([
                'publisher_campaigns.*',
                'publishers.website_url',
                'publishers.traffic_sources',
                'users.first_name',
                'users.last_name',
                'users.email',
                'campaigns.id as campaign_id',
                'campaigns.name as campaign_name',
                'campaigns.description as campaign_description',
                'offers.name as offer_name',
                'offers.commission_value_1',
                'offers.commission_value_2',
                'networks.network_name',
            ])
            ->when($user->is_network && $userNetwork, function ($q) use ($userNetwork) {
                $q->where('publisher_campaigns.network_id', $userNetwork->network_id);
            })
            ->first();
        abort_if($application === null, 404);
        $campaignOffers = Offer::where('campaign_id', $application->campaign_id)
            ->where('offer_status', 'A')
            ->select(['id', 'name', 'description', 'commission_value_1', 'commission_value_2'])
            ->get();

        return inertia('applications/show', [
            'application' => $application,
            'campaignOffers' => $campaignOffers,
        ]);
    }

    public function approve(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'offer_id' => 'required|exists:offers,id',
            ]);

            $user = Auth::user();
            $userNetwork = UserNetworks::where('user_id', $user->id)->first();

            $application = PublisherCampaigns::findOrFail($id);
            if ($user->is_network && $userNetwork) {
                if ($application->network_id !== $userNetwork->network_id) {
                    abort(403, 'Unauthorized');
                }
            }
            $offer = Offer::where('id', $validated['offer_id'])
                ->where('campaign_id', $application->campaign_id)
                ->firstOrFail();
            $trackingId = $this->generateTrackingId($application, $offer->id);
            $trackingLink = url("/t/{$trackingId}");

            // Get commission from offer_commissions table
            $offerCommission = OfferCommission::where('offer_id', $offer->id)
                ->with('commissionType')
                ->first();

            $commissionType = $offerCommission?->commissionType?->name;
            $commissionValue = $offerCommission?->commission_value;

            $application->update([
                'status' => 'A',
                'offer_id' => $offer->id,
                'commission_type' => $commissionType,
                'commission_value' => $commissionValue,
                'approved_by' => $user->id,
                'approved_at' => now(),
                'tracking_link' => $trackingLink,
            ]);

            return redirect()->route('applications.index')->with('success', "Application approved and assigned to offer: {$offer->name}");
        } catch (Exception $e) {
            return redirect()->back()->with('error', "Failed to approve application: {$e->getMessage()}");
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $userNetwork = UserNetworks::where('user_id', $user->id)->first();
            $validated = $request->validate([
                'rejection_reason' => 'required|string|max:500',
            ]);
            $application = PublisherCampaigns::findOrFail($id);
            if ($user->is_network && $userNetwork) {
                if ($application->network_id !== $userNetwork->network_id) {
                    abort(403, 'Unauthorized');
                }
            }
            $application->update([
                'status' => 'R',
                'rejection_reason' => $validated['rejection_reason'],
            ]);

            return redirect()->route('applications.index')->with('success', 'Application rejected');
        } catch (Exception $e) {
            return redirect()->back()->with('error', 'Failed to reject application: '.$e->getMessage());
        }
    }

    private function generateTrackingId(PublisherCampaigns $application, int $offerId): string
    {
        $shortUuid = Str::lower(Str::random(8));

        return "{$shortUuid}_{$application->publisher_id}_{$offerId}";
    }
}
