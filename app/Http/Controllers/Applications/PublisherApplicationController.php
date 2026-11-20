<?php

namespace App\Http\Controllers\Applications;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Services\PartnerEnrollmentService;
use App\Support\Tenancy;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PublisherApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        $status = $request->input('status', 'P');

        $applications = PublisherCampaigns::query()
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
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
                'requested_offers.name as requested_offer_name',
            ])
            ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user))
            ->when(! $user->is_super_admin, fn ($q) => $q->where('publisher_campaigns.network_id', $user->networkId()))
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

        $application = PublisherCampaigns::query()
            ->where('publisher_campaigns.id', $id)
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->leftJoin('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->leftJoin('offers as requested_offers', 'requested_offers.id', '=', 'publisher_campaigns.requested_offer_id')
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
                'campaigns.currency',
                'offers.name as offer_name',
                'requested_offers.name as requested_offer_name',
                'publisher_campaigns.commission_value as commission_value_1',
                'publisher_campaigns.commission_type as commission_type_1',
                'networks.network_name',
            ])
            ->whereIn('publisher_campaigns.campaign_id', Tenancy::campaignIds($user))
            ->when(! $user->is_super_admin, fn ($q) => $q->where('publisher_campaigns.network_id', $user->networkId()))
            ->first();
        abort_if($application === null, 404);
        $campaignOffers = Offer::where('campaign_id', $application->campaign_id)
            ->where('offer_status', 'A')
            ->with('commissions.commissionType')
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

            $application = PublisherCampaigns::whereIn('campaign_id', Tenancy::campaignIds($user))
                ->when(! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()))
                ->findOrFail($id);
            $application = app(PartnerEnrollmentService::class)->review($application, $user, (int) $validated['offer_id']);
            $offer = $application->offer;

            return redirect()->route('applications.index')->with('success', "Application approved and assigned to offer: {$offer->name}");
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
        } catch (Exception $e) {
            return redirect()->back()->with('error', "Failed to approve application: {$e->getMessage()}");
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'rejection_reason' => 'required|string|max:500',
            ]);
            $application = PublisherCampaigns::whereIn('campaign_id', Tenancy::campaignIds($user))
                ->when(! $user->is_super_admin, fn ($q) => $q->where('network_id', $user->networkId()))
                ->findOrFail($id);
            app(PartnerEnrollmentService::class)->review($application, $user, null, $validated['rejection_reason']);

            return redirect()->route('applications.index')->with('success', 'Application rejected');
        } catch (HttpExceptionInterface|ModelNotFoundException|ValidationException $e) {
            throw $e;
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
