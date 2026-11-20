<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CampaignTrackingService
{
    public function build(Campaign $campaign, Request $request, ?PublisherCampaigns $ownAssignment = null): array
    {
        $offers = Offer::where('campaign_id', $campaign->id)
            ->when($ownAssignment, fn ($q) => $q->whereKey(
                $ownAssignment->status === 'A' && ! $ownAssignment->terminated_at ? ($ownAssignment->offer_id ?? 0) : 0
            ))->with('commissions.commissionType')->orderBy('id')->get();
        $offer = $request->filled('offer')
            ? $offers->firstWhere('id', $request->integer('offer')) : $offers->first();
        abort_if($request->filled('offer') && ! $offer, 404);
        $assignments = PublisherCampaigns::where('campaign_id', $campaign->id)
            ->where('offer_id', $offer?->id ?? 0)->where('status', 'A')->whereNull('terminated_at')
            ->when($ownAssignment, fn ($q) => $q->whereKey($ownAssignment->id))
            ->with('publisher.user')->orderBy('id')->get();
        $assignment = $request->filled('publisher')
            ? $assignments->firstWhere('id', $request->integer('publisher')) : $assignments->first();
        abort_if($request->filled('publisher') && ! $assignment, 404);
        $link = $assignment?->tracking_link && $assignment->extractTrackingId()
            ? url('/t/'.$assignment->extractTrackingId()) : null;
        $evidence = null;
        if (! $ownAssignment && $assignment) {
            $click = $assignment->clicks()->where('offer_id', $offer->id)->latest('clicked_at')->first();
            $conversion = $assignment->conversions()->where('offer_id', $offer->id)
                ->whereNotNull('conversion_event_id')->latest('id')->first();
            $earning = $conversion ? PublisherEarning::where('conversion_id', $conversion->id)
                ->where('publisher_campaign_id', $assignment->id)->first() : null;
            $evidence = [
                'copied_at' => DB::table('campaign_tracking_handoffs')->where('publisher_campaign_id', $assignment->id)
                    ->where('offer_id', $offer->id)->value('copied_at'),
                'clicked_at' => $click?->clicked_at?->toISOString(),
                'outcome' => $conversion ? ['reference' => $conversion->order_code ?: $conversion->transaction_code ?: (string) $conversion->id,
                    'at' => $conversion->conversion_date, 'type' => $conversion->conversion_type] : null,
                'commission' => $earning ? ['status' => $earning->status, 'amount' => $earning->amount, 'currency' => $earning->currency] : null,
            ];
        }

        return [
            'publisher_view' => (bool) $ownAssignment,
            'offers' => $offers->map(fn ($row) => $row->only(['id', 'name']))->all(),
            'publishers' => $assignments->map(fn ($row) => ['id' => $row->id, 'name' => $row->publisher?->business_name ?: $row->publisher?->user?->name ?: 'Publisher'])->all(),
            'offer' => $offer ? $offer->only(['id', 'name', 'click_cookie_lifetime_hours', 'conversion_window_hours', 'preview_url']) : null,
            'assignment_id' => $assignment?->id,
            'tracking_link' => $link,
            'embed_script' => $assignment?->script_token ? '<script src="'.url('/s/'.$assignment->script_token.'.js').'" async></script>' : null,
            'script_token' => $assignment?->script_token,
            'qr_download_url' => $link ? ($ownAssignment ? route('publisher.tracking.qr', $assignment) : route('campaign.tracking.qr', [$campaign, $assignment])) : null,
            'qr_code' => $link ? (new QRCode(new QROptions(['outputType' => QRCode::OUTPUT_IMAGE_PNG, 'eccLevel' => QRCode::ECC_M, 'scale' => 5, 'imageBase64' => true])))->render($link) : null,
            'rates' => $assignment ? [['type' => $assignment->commission_type, 'value' => $assignment->commission_value]]
                : ($offer?->commissions->map(fn ($rate) => ['type' => $rate->commissionType?->name, 'value' => $rate->commission_value])->all() ?? []),
            'currency' => $campaign->currency,
            'events_url' => url('/api/v1/events'),
            'referrals_url' => url('/api/v1/referrals'),
            'evidence' => $evidence,
            'handoff_url' => ! $ownAssignment && $assignment ? route('campaign.tracking.handoff', [$campaign, $assignment]) : null,
        ];
    }
}
