<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\PublisherCampaigns;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CampaignTrackingController extends Controller
{
    public function qr(Request $request, int $campaign, int $assignment)
    {
        $campaign = Campaign::visibleTo($request->user())->findOrFail($campaign);

        return $this->downloadQr(PublisherCampaigns::where('campaign_id', $campaign->id)->findOrFail($assignment));
    }

    public function publisherQr(Request $request, int $assignment)
    {
        $assignment = PublisherCampaigns::where('publisher_id', $request->user()->publisher?->id ?? 0)->findOrFail($assignment);

        return $this->downloadQr($assignment);
    }

    private function downloadQr(PublisherCampaigns $assignment)
    {
        abort_unless($assignment->status === 'A' && ! $assignment->terminated_at && $assignment->offer?->campaign_id === $assignment->campaign_id
            && $assignment->tracking_link && $assignment->extractTrackingId(), 404);
        $png = (new QRCode(new QROptions(['outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'eccLevel' => QRCode::ECC_M, 'scale' => 5, 'imageBase64' => false])))->render(url('/t/'.$assignment->extractTrackingId()));

        return response($png)->header('Content-Type', 'image/png')
            ->header('Content-Disposition', 'attachment; filename="tracking-'.$assignment->offer_id.'-'.$assignment->id.'.png"')
            ->header('Cache-Control', 'private, no-store');
    }

    public function handoff(Request $request, int $campaign, int $assignment)
    {
        $campaign = Campaign::visibleTo($request->user())->findOrFail($campaign);
        $data = $request->validate(['platform' => 'required|in:custom-website,wordpress,shopify,woocommerce', 'offer_id' => 'required|integer']);
        $assignment = PublisherCampaigns::where('campaign_id', $campaign->id)->where('offer_id', $data['offer_id'])
            ->whereHas('offer', fn ($q) => $q->where('campaign_id', $campaign->id))
            ->where('status', 'A')->whereNull('terminated_at')->findOrFail($assignment);
        DB::table('campaign_tracking_handoffs')->upsert([
            'publisher_campaign_id' => $assignment->id, 'offer_id' => $assignment->offer_id,
            'copied_by' => $request->user()->id, 'platform' => $data['platform'], 'copied_at' => now(),
        ], ['publisher_campaign_id', 'offer_id'], ['copied_by', 'platform', 'copied_at']);

        return back(303);
    }
}
