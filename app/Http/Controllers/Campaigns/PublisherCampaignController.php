<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
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
                'offers.commission_value_1',
                'offers.commission_value_2',
                'offers.minimum_payout',
                'offers.total_clicks',
                'offers.total_conversions',
                'offers.conversion_rate',
                'offers.avg_order_value',
                'offers.earnings_per_click',
                'offers.offer_status',
                'offers.expires_at',

                'campaigns.name as campaign_name',
                'networks.network_name as network_name',
            ]);
        $this->scopeToUser($query, $user);
        $campaigns = $query
            ->where('publisher_campaigns.status', 'A')
            ->orderBy('publisher_campaigns.created_at', 'desc')
            ->paginate(25);

        return inertia('publishercampaigns/index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        $campaignQuery = PublisherCampaigns::query()
            ->where('publisher_campaigns.id', $id)
            ->join('offers', 'offers.id', '=', 'publisher_campaigns.offer_id')
            ->join('publishers', 'publishers.id', '=', 'publisher_campaigns.publisher_id')
            ->join('users', 'users.id', '=', 'publishers.user_id')
            ->join('campaigns', 'campaigns.id', '=', 'publisher_campaigns.campaign_id')
            ->join('networks', 'networks.id', '=', 'publisher_campaigns.network_id')
            ->leftJoin('currencies', 'currencies.currency_code', '=', 'campaigns.currency')
            ->select([
                'publisher_campaigns.*',

                'offers.name as offer_name',
                'offers.offer_status',
                'offers.description as offer_description',
                'offers.commission_type_1',
                'offers.commission_value_1',
                'offers.commission_type_2',
                'offers.commission_value_2',
                'offers.conversion_window_hours',
                'offers.click_cookie_lifetime_hours',
                'offers.minimum_payout',
                'offers.preview_url',

                'campaigns.name as campaign_name',
                'campaigns.start_date',
                'campaigns.end_date',
                'campaigns.campaign_status',
                'campaigns.total_budget',
                'campaigns.daily_budget',
                'campaigns.spent_amount',
                'campaigns.currency',
                'campaigns.target_conversions',
                'campaigns.target_roi',

                'networks.network_name',

                'publishers.website_url as publisher_website',
                'users.user_name as publisher_name',
                'users.email as publisher_email',

                'currencies.currency_code',
                'currencies.currency_name',
            ]);
        $campaign = $this->scopeToUser($campaignQuery, $user)->first();
        abort_if($campaign === null, 404);

        // Get publisher campaign model for assets
        $publisherCampaign = PublisherCampaigns::find($id);
        $assets = $publisherCampaign ? $publisherCampaign->getAllAssets() : null;

        // Generate QR code for tracking link
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

        return inertia('publishercampaigns/show', [
            'campaign' => $campaign,
            'assets' => $assets,
            'qrCode' => $qrCode,
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
