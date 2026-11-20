<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Models\PublisherCampaigns;
use App\Support\PublisherAttribution;
use App\Support\ReferralScript;
use Illuminate\Http\Request;

class PublisherScriptController extends Controller
{
    public function serve(Request $request, string $token)
    {
        $token = str_replace('.js', '', $token);

        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->first();

        if (! $publisherCampaign) {
            return response('// Invalid or inactive campaign', 404)
                ->header('Content-Type', 'application/javascript');
        }

        PublisherAttribution::assertActive($publisherCampaign);
        $publisherCampaign->increment('script_impressions');

        $script = $this->generateScript($publisherCampaign);

        return response($script)
            ->header('Content-Type', 'application/javascript')
            ->header('Cache-Control', 'no-store, max-age=0');
    }

    public function impression(Request $request, string $token)
    {
        $publisherCampaign = PublisherCampaigns::where('script_token', $token)
            ->where('status', 'A')
            ->first();

        if ($publisherCampaign) {
            PublisherAttribution::assertActive($publisherCampaign);
            $publisherCampaign->increment('script_impressions');
        }

        $pixel = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        return response($pixel, 200)
            ->header('Content-Type', 'image/gif')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    protected function generateScript(PublisherCampaigns $pc): string
    {
        $scriptToken = $pc->script_token;
        $referralScript = ReferralScript::forOffer($pc->campaign_id, $pc->offer_id);

        $configJson = json_encode([
            'token' => $scriptToken,
            'publisherCampaignId' => $pc->id,
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

        return <<<JAVASCRIPT
(function() {
    'use strict';

    const CONFIG = {$configJson};
    window.DMHub = window.DMHub || { initialized: true, version: 2 };
    window.DMHub.version = 2;
    window.DMHub.instances = window.DMHub.instances || {};
    if (window.DMHub.instances[CONFIG.token]?.getReferral) return;
    const instance = { config: CONFIG };
    window.DMHub.instances[CONFIG.token] = instance;
    {$referralScript}

    // Attribution only: the website sends successful events from its backend.
    // No form listeners, field collection, or browser commission endpoint.
    instance.getReferral = getReferral;
    if (!window.DMHub.getReferral) {
        window.DMHub.config = CONFIG;
        window.DMHub.getReferral = instance.getReferral;
    }
})();
JAVASCRIPT;
    }

    protected function extractTrackingId(PublisherCampaigns $pc): ?string
    {
        if (preg_match('/\/t\/([^\/\?]+)/', $pc->tracking_link, $matches)) {
            return $matches[1];
        }
        if (preg_match('/^[a-zA-Z0-9]+$/', $pc->tracking_link)) {
            return $pc->tracking_link;
        }

        return null;
    }
}
