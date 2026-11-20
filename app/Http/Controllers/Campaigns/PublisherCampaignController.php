<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use App\Services\CampaignAnalyticsService;
use App\Services\CampaignFinanceService;
use App\Services\CampaignOffersService;
use App\Services\CampaignOverviewService;
use App\Services\CampaignPublishersService;
use App\Services\CampaignTrackingService;
use App\Services\PartnerReportingService;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PublisherCampaignController extends Controller
{
    /**
     * Restrict publisher_campaigns (joined with campaigns) to what the user may see.
     * Fails closed for users without a matching role/profile.
     */
    private function scopeToUser($query, $user)
    {
        if ($user->is_super_admin) {
            return $query;
        }

        if ($user->is_network) {
            $networkId = $user->networkId();

            return $networkId === null
                ? $query->whereRaw('1 = 0')
                : $query->where('publisher_campaigns.network_id', $networkId);
        }

        if ($user->is_advertiser) {
            $advertiserId = $user->advertiser?->id;

            return $advertiserId === null
                ? $query->whereRaw('1 = 0')
                : $query->where('campaigns.advertiser_id', $advertiserId);
        }

        if ($user->is_publisher) {
            $publisherId = $user->publisher?->id;

            return $publisherId === null
                ? $query->whereRaw('1 = 0')
                : $query->where('publisher_campaigns.publisher_id', $publisherId);
        }

        return $query->whereRaw('1 = 0');
    }

    public function index(Request $request)
    {
        $user = Auth::user();

        $query = PublisherCampaigns::query()
            ->join('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->join('networks', 'networks.id', '=', 'publisher_campaigns.network_id')
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->select([
                'publisher_campaigns.id as publisher_campaign_id',
                'publisher_campaigns.created_at',
                'publisher_campaigns.status',

                'offers.name',
                'publisher_campaigns.commission_value as commission_value_1',
                'publisher_campaigns.commission_type as commission_type_1',
                'offers.minimum_payout',
                'offers.offer_status',
                'offers.expires_at',

                'campaigns.currency',
                'campaigns.name as campaign_name',
                'networks.network_name as network_name',
            ]);
        $this->scopeToUser($query, $user);
        $campaigns = $query
            ->where('publisher_campaigns.status', 'A')
            ->orderBy('publisher_campaigns.created_at', 'desc')
            ->paginate(25);
        $campaigns->getCollection()->each(fn ($row) => app(PartnerReportingService::class)->assignment($row));

        return inertia('publishercampaigns/index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function show($id, ?int $offerId = null)
    {
        $user = Auth::user();

        $query = PublisherCampaigns::query()
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->where('publisher_campaigns.id', $id)
            ->select('publisher_campaigns.*');
        $assignment = $this->scopeToUser($query, $user)->firstOrFail();

        if ($offerId !== null || (request('tab') === 'tracking' && request()->anyFilled(['offer', 'publisher']))) {
            return inertia('campaigns/offer-tracking', [
                'trackingWorkspace' => fn () => app(CampaignTrackingService::class)->detail($assignment->campaign, request(), $offerId, $assignment),
            ]);
        }

        return inertia('publishercampaigns/show', [
            'overview' => app(CampaignOverviewService::class)->build($assignment->campaign, $user, $assignment),
            'ownEnrollment' => fn () => app(CampaignPublishersService::class)->build($assignment->campaign, $user, $assignment),
            'financeWorkspace' => fn () => request('tab') === 'finance' ? app(CampaignFinanceService::class)->build($assignment->campaign, request(), $assignment) : null,
            'analyticsWorkspace' => fn () => request('tab') === 'analytics' ? app(CampaignAnalyticsService::class)->build($assignment->campaign, request(), $assignment) : null,
            'trackingHub' => fn () => request('tab') === 'tracking' ? app(CampaignTrackingService::class)->hub($assignment->campaign, $assignment) : null,
            'offerWorkspace' => fn () => app(CampaignOffersService::class)->build($assignment->campaign, $user, $assignment),
        ]);
    }

    public function getQrCode($id)
    {
        $user = Auth::user();

        $publisherCampaignQuery = PublisherCampaigns::query()
            ->where('publisher_campaigns.id', $id)
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->join('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->select([
                'publisher_campaigns.*',
                'campaigns.name as campaign_name',
                'offers.name as offer_name',
            ]);
        $publisherCampaign = $this->scopeToUser($publisherCampaignQuery, $user)->first();

        if (! $publisherCampaign) {
            return response()->json(['error' => 'Campaign not found'], 404);
        }

        $model = PublisherCampaigns::find($id);
        $assets = $model?->getAllAssets();

        $qrCode = null;
        if ($assets && ! empty($assets['main_tracking_link'])) {
            $options = new QROptions([
                'outputType' => QRCode::OUTPUT_IMAGE_PNG,
                'eccLevel' => QRCode::ECC_M,
                'scale' => 5,
                'imageBase64' => true,
            ]);
            $qrCode = (new QRCode($options))->render($assets['main_tracking_link']);
        }

        return response()->json([
            'qrCode' => $qrCode,
            'trackingLink' => $assets['main_tracking_link'] ?? null,
            'campaignName' => $publisherCampaign->campaign_name,
            'offerName' => $publisherCampaign->offer_name,
        ]);
    }
}
