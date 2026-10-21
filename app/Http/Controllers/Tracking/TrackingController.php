<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Models\Clicks;
use App\Models\Creative;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    /**
     * Resolve an active publisher campaign from the id in its /t/{id} link.
     * LIKE wildcards in the id are escaped so a crafted id cannot match arbitrary links.
     */
    private function findPublisherCampaign(string $trackingId): ?PublisherCampaigns
    {
        $escaped = addcslashes($trackingId, '\\%_');

        return PublisherCampaigns::where(function ($q) use ($trackingId, $escaped) {
            $q->where('tracking_link', 'LIKE', "%/t/{$escaped}")
                ->orWhere('tracking_link', $trackingId);
        })
            ->where('status', 'A')
            ->first();
    }

    public function track(Request $request, $trackingId)
    {
        $publisherCampaign = $this->findPublisherCampaign($trackingId);
        if (! $publisherCampaign) {
            abort(404, 'Invalid or expired tracking link');
        }
        $offer = Offer::find($publisherCampaign->offer_id);
        if (! $offer) {
            abort(404, 'Offer not found');
        }

        // Check for creative_id in request
        $creativeId = $request->input('creative_id') ?? $request->input('crid');
        $creative = null;

        if ($creativeId) {
            $creative = Creative::where('id', $creativeId)
                ->where('offer_id', $offer->id)
                ->first();
        }

        $click = Clicks::create([
            'publisher_id' => $publisherCampaign->publisher_id,
            'network_id' => $publisherCampaign->network_id,
            'campaign_id' => $publisherCampaign->campaign_id,
            'offer_id' => $publisherCampaign->offer_id,
            'publisher_campaign_id' => $publisherCampaign->id,
            'creative_id' => $creative?->id,
            'ip_address' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 255),
            'referer' => substr($request->header('referer') ?? '', 0, 255),
            'device_type' => $this->detectDeviceType($request->userAgent()),
            'browser' => $this->detectBrowser($request->userAgent()),
            'operating_system' => $this->detectOS($request->userAgent()),
            'clicked_at' => now(),
        ]);

        $publisherCampaign->increment('total_clicks');
        $offer->increment('total_clicks');

        // Increment creative clicks if tracked
        if ($creative) {
            $creative->increment('clicks');
        }

        $destinationUrl = $offer->preview_url ?? $offer->tracking_url_template ?? '/';
        if (strpos($destinationUrl, '?') !== false) {
            $destinationUrl .= "&click_id={$click->id}";
        } else {
            $destinationUrl .= "?click_id={$click->id}";
        }
        if ($publisherCampaign->sub) {
            $destinationUrl .= '&sub='.urlencode($publisherCampaign->sub);
        }
        if ($creative) {
            $destinationUrl .= '&_dlf_code='.urlencode($creative->tracking_code);
        }

        return redirect()->away($destinationUrl);
    }

    public function trackCreative(Request $request, $trackingId, $creativeId)
    {
        $publisherCampaign = $this->findPublisherCampaign($trackingId);

        if (! $publisherCampaign) {
            abort(404, 'Invalid or expired tracking link');
        }

        $offer = Offer::find($publisherCampaign->offer_id);
        if (! $offer) {
            abort(404, 'Offer not found');
        }

        $creative = Creative::where('id', $creativeId)
            ->where('offer_id', $offer->id)
            ->first();

        if (! $creative) {
            abort(404, 'Creative not found');
        }

        $click = Clicks::create([
            'publisher_id' => $publisherCampaign->publisher_id,
            'network_id' => $publisherCampaign->network_id,
            'campaign_id' => $publisherCampaign->campaign_id,
            'offer_id' => $publisherCampaign->offer_id,
            'publisher_campaign_id' => $publisherCampaign->id,
            'creative_id' => $creative->id,
            'ip_address' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 255),
            'referer' => substr($request->header('referer') ?? '', 0, 255),
            'device_type' => $this->detectDeviceType($request->userAgent()),
            'browser' => $this->detectBrowser($request->userAgent()),
            'operating_system' => $this->detectOS($request->userAgent()),
            'clicked_at' => now(),
        ]);

        $publisherCampaign->increment('total_clicks');
        $offer->increment('total_clicks');
        $creative->increment('clicks');
        $destinationUrl = $offer->preview_url ?? $offer->tracking_url_template ?? '/';
        if (strpos($destinationUrl, '?') !== false) {
            $destinationUrl .= "&click_id={$click->id}";
        } else {
            $destinationUrl .= "?click_id={$click->id}";
        }
        if ($publisherCampaign->sub) {
            $destinationUrl .= '&sub='.urlencode($publisherCampaign->sub);
        }
        $destinationUrl .= '&_dlf_code='.urlencode($creative->tracking_code);

        return redirect()->away($destinationUrl);
    }

    public function trackCreativeByCode(Request $request, $trackingCode)
    {
        $creative = Creative::where('tracking_code', $trackingCode)
            ->where('status', 'A')
            ->first();

        if (! $creative) {
            abort(404, 'Creative not found or inactive');
        }

        $offer = $creative->offer;
        if (! $offer) {
            abort(404, 'Offer not found');
        }

        $click = Clicks::create([
            'publisher_id' => 5,
            'network_id' => $offer->network_id ?? null,
            'campaign_id' => $creative->campaign_id,
            'offer_id' => $creative->offer_id,
            'publisher_campaign_id' => null,
            'creative_id' => $creative->id,
            'ip_address' => $request->ip(),
            'user_agent' => substr($request->userAgent() ?? '', 0, 255),
            'referer' => substr($request->header('referer') ?? '', 0, 255),
            'device_type' => $this->detectDeviceType($request->userAgent()),
            'browser' => $this->detectBrowser($request->userAgent()),
            'operating_system' => $this->detectOS($request->userAgent()),
            'clicked_at' => now(),
        ]);

        $offer->increment('total_clicks');
        $creative->increment('clicks');

        $destinationUrl = $creative->preview_url ?? $offer->preview_url ?? $offer->tracking_url_template ?? '/';
        if (strpos($destinationUrl, '?') !== false) {
            $destinationUrl .= "&click_id={$click->id}";
        } else {
            $destinationUrl .= "?click_id={$click->id}";
        }

        // Auto-Popup Trigger
        $destinationUrl .= '&_dlf_code='.urlencode($creative->tracking_code);

        return redirect()->away($destinationUrl);
    }

    public function impression(Request $request, $trackingCode)
    {
        $creative = Creative::where('tracking_code', $trackingCode)->first();

        if (! $creative && is_numeric($trackingCode)) {
            $creative = Creative::find($trackingCode);
        }
        if ($creative) {
            $creative->increment('impressions');
        }
        $pixel = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        return response($pixel, 200)
            ->header('Content-Type', 'image/gif')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    private function detectDeviceType(?string $userAgent): string
    {
        if (! $userAgent) {
            return 'unknown';
        }
        $userAgent = strtolower($userAgent);
        if (preg_match('/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i', $userAgent)) {
            return 'mobile';
        }
        if (preg_match('/tablet|ipad|playbook|silk/i', $userAgent)) {
            return 'tablet';
        }

        return 'desktop';
    }

    private function detectBrowser(?string $userAgent): string
    {
        if (! $userAgent) {
            return 'unknown';
        }

        if (preg_match('/edge|edg/i', $userAgent)) {
            return 'Edge';
        }
        if (preg_match('/chrome/i', $userAgent) && ! preg_match('/edge|edg/i', $userAgent)) {
            return 'Chrome';
        }
        if (preg_match('/firefox/i', $userAgent)) {
            return 'Firefox';
        }
        if (preg_match('/safari/i', $userAgent) && ! preg_match('/chrome/i', $userAgent)) {
            return 'Safari';
        }
        if (preg_match('/opera|opr/i', $userAgent)) {
            return 'Opera';
        }
        if (preg_match('/msie|trident/i', $userAgent)) {
            return 'Internet Explorer';
        }

        return 'Other';
    }

    private function detectOS(?string $userAgent): string
    {
        if (! $userAgent) {
            return 'unknown';
        }
        if (preg_match('/windows/i', $userAgent)) {
            return 'Windows';
        }
        if (preg_match('/macintosh|mac os x/i', $userAgent)) {
            return 'macOS';
        }
        if (preg_match('/linux/i', $userAgent) && ! preg_match('/android/i', $userAgent)) {
            return 'Linux';
        }
        if (preg_match('/android/i', $userAgent)) {
            return 'Android';
        }
        if (preg_match('/iphone|ipad|ipod/i', $userAgent)) {
            return 'iOS';
        }

        return 'Other';
    }
}
