<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Offer;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Support\TrackingUrl;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CampaignTrackingService
{
    public static function offerUrl(int $campaignId, int $offerId, ?int $assignmentId = null): string
    {
        return $assignmentId
            ? route('publisher.tracking.offer', [$assignmentId, $offerId])
            : route('campaign.tracking.offer', [$campaignId, $offerId]);
    }

    private function offers(Campaign $campaign, ?PublisherCampaigns $ownAssignment)
    {
        return $campaign->offers()->when(! $ownAssignment, fn ($q) => $q->with(['customerPromotion' => fn ($p) => $p
            ->select(['id', 'offer_id', 'status'])->with('stores:id,name,platform,status')]))
            ->when($ownAssignment, fn ($q) => $q->whereKey(
                $ownAssignment->status === 'A' && ! $ownAssignment->terminated_at ? ($ownAssignment->offer_id ?? 0) : 0
            ))->orderBy('id');
    }

    private function promotionStores(Offer $offer, ?PublisherCampaigns $ownAssignment): array
    {
        return $ownAssignment || $offer->customerPromotion?->status !== 'active' ? [] : ($offer->customerPromotion->stores->map->only(['id', 'name', 'platform', 'status'])->all() ?? []);
    }

    private function setupOptions(Offer $offer, array $types): array
    {
        if ($offer->customerPromotion) {
            return ['promotion'];
        }

        $options = [];
        foreach (CommissionService::EVENT_COMMISSION_TYPES as $event => $allowed) {
            if (array_intersect($types, $allowed)) {
                $options[] = $event;
            }
        }
        if (in_array('CPC', $types, true)) {
            $options[] = 'click';
        }

        return $options;
    }

    private function assignments(Campaign $campaign, ?PublisherCampaigns $ownAssignment)
    {
        return PublisherCampaigns::where('publisher_campaigns.campaign_id', $campaign->id)
            ->where('publisher_campaigns.status', 'A')->whereNull('publisher_campaigns.terminated_at')
            ->when($ownAssignment, fn ($q) => $q->whereKey($ownAssignment->id))->orderBy('publisher_campaigns.id');
    }

    public function hub(Campaign $campaign, ?PublisherCampaigns $ownAssignment = null): array
    {
        $offers = $this->offers($campaign, $ownAssignment)->when(! $ownAssignment, fn ($q) => $q->with('commissions.commissionType'))->get(['id', 'name']);
        $assignments = $this->assignments($campaign, $ownAssignment)
            ->whereIn('publisher_campaigns.offer_id', $offers->modelKeys())
            ->select(['publisher_campaigns.id', 'publisher_campaigns.offer_id', 'tracking_link', 'commission_type', 'script_impressions'])
            ->withExists(['clicks as clicked' => fn ($q) => $q->whereColumn('clicks.offer_id', 'publisher_campaigns.offer_id')])
            ->when(! $ownAssignment, fn ($q) => $q
                ->withExists(['conversions as confirmed' => fn ($q) => $q->whereColumn('conversions.offer_id', 'publisher_campaigns.offer_id')->whereNotNull('conversion_event_id')])
                ->addSelect(['handoff_platform' => DB::table('campaign_tracking_handoffs')->select('platform')
                    ->whereColumn('publisher_campaign_id', 'publisher_campaigns.id')->whereColumn('offer_id', 'publisher_campaigns.offer_id')]))
            ->get()->groupBy('offer_id');

        return [
            'publisher_view' => (bool) $ownAssignment,
            'offers' => $offers->map(function (Offer $offer) use ($campaign, $assignments, $ownAssignment) {
                $rows = $assignments->get($offer->id, collect());
                $confirmed = $rows->firstWhere('confirmed', true);
                $clicked = $rows->firstWhere('clicked', true);
                $types = $rows->isEmpty() && ! $ownAssignment ? $offer->commissions->pluck('commissionType.name')->all() : $rows->pluck('commission_type')->all();
                $options = $ownAssignment ? [] : $this->setupOptions($offer, $types);
                $handoff = $rows->firstWhere('handoff_platform');
                $impression = in_array('submission', $options, true)
                    ? $rows->where('commission_type', 'CPL')->firstWhere('script_impressions', '>', 0) : null;
                $links = $rows->filter(fn ($row) => $row->tracking_link && $row->extractTrackingId());
                $guide = self::offerUrl($campaign->id, $offer->id, $ownAssignment?->id);
                $representative = $confirmed ?? $clicked ?? $impression ?? $handoff ?? $links->first();
                if (! $ownAssignment && $rows->count() > 1 && $representative) {
                    $guide .= '?publisher='.$representative->id;
                }

                return [
                    'id' => $offer->id, 'name' => $offer->name, 'url' => $guide,
                    'stores' => $this->promotionStores($offer, $ownAssignment),
                    'publishers' => $rows->count(), 'links' => $links->count(),
                    'clicked' => (bool) $clicked, 'confirmed' => (bool) $confirmed,
                    'script_seen' => (bool) $impression, 'setup_options' => $options,
                    'promotion_status' => $ownAssignment ? null : $offer->customerPromotion?->status,
                    'handoff_platform' => $handoff?->handoff_platform,
                ];
            })->all(),
        ];
    }

    public function detail(Campaign $campaign, Request $request, ?int $offerId, ?PublisherCampaigns $ownAssignment = null): array
    {
        $offerId ??= $request->filled('offer') ? $request->integer('offer') : null;
        $offer = $this->offers($campaign, $ownAssignment)->with('commissions.commissionType')
            ->when($offerId !== null, fn ($q) => $q->whereKey($offerId))->firstOrFail();
        $assignments = $this->assignments($campaign, $ownAssignment)->where('offer_id', $offer->id)->with('publisher.user')->get();
        $assignment = $request->filled('publisher')
            ? $assignments->firstWhere('id', $request->integer('publisher')) : $assignments->first();
        abort_if($request->filled('publisher') && ! $assignment, 404);
        $rates = $assignment ? [['type' => $assignment->commission_type, 'value' => $assignment->commission_value]]
            : $offer->commissions->map(fn ($rate) => ['type' => $rate->commissionType?->name, 'value' => $rate->commission_value])->all();
        $options = $ownAssignment ? [] : $this->setupOptions($offer, array_column($rates, 'type'));
        $manual = (bool) array_intersect($options, ['purchase', 'submission', 'action']);
        $scriptToken = in_array('submission', $options, true) ? $assignment?->script_token : null;
        $link = $assignment?->tracking_link && $assignment->extractTrackingId()
            ? TrackingUrl::to('/t/'.$assignment->extractTrackingId()) : null;
        $evidence = null;
        if (! $ownAssignment && $assignment) {
            $click = $assignment->clicks()->where('offer_id', $offer->id)->latest('clicked_at')->first();
            $conversion = $assignment->conversions()->where('offer_id', $offer->id)
                ->whereNotNull('conversion_event_id')->latest('id')->first();
            $earning = $conversion ? PublisherEarning::where('conversion_id', $conversion->id)
                ->where('publisher_campaign_id', $assignment->id)->first() : null;
            $handoff = DB::table('campaign_tracking_handoffs')->where('publisher_campaign_id', $assignment->id)
                ->where('offer_id', $offer->id)->first(['platform', 'copied_at']);
            $evidence = [
                'copied_at' => $handoff?->copied_at,
                'platform' => $handoff?->platform,
                'clicked_at' => $click?->clicked_at?->toISOString(),
                'outcome' => $conversion ? ['reference' => $conversion->order_code ?: $conversion->transaction_code ?: (string) $conversion->id,
                    'at' => $conversion->conversion_date, 'type' => $conversion->conversion_type] : null,
                'commission' => $earning ? ['status' => $earning->status, 'amount' => $earning->amount, 'currency' => $earning->currency] : null,
            ];
        }

        return [
            'publisher_view' => (bool) $ownAssignment,
            'campaign_name' => $campaign->name,
            'stores' => $this->promotionStores($offer, $ownAssignment),
            'hub_url' => $ownAssignment ? route('publishers.my.campaign.show', ['id' => $ownAssignment->id, 'tab' => 'tracking'])
                : route('advertiser.campaign.show', ['id' => $campaign->id, 'tab' => 'tracking']),
            'detail_url' => self::offerUrl($campaign->id, $offer->id, $ownAssignment?->id),
            'setup_options' => $options,
            'promotion_status' => $ownAssignment ? null : $offer->customerPromotion?->status,
            'script_seen' => $scriptToken && $assignment->script_impressions > 0,
            'clicked' => $ownAssignment ? (bool) $assignment?->clicks()->where('offer_id', $offer->id)->exists() : isset($evidence['clicked_at']),
            'publishers' => $assignments->map(fn ($row) => ['id' => $row->id, 'name' => $row->publisher?->business_name ?: $row->publisher?->user?->name ?: 'Publisher'])->all(),
            'offer' => $offer->only(['id', 'name', 'click_cookie_lifetime_hours', 'conversion_window_hours', 'preview_url']),
            'assignment_id' => $assignment?->id,
            'tracking_link' => $link,
            'embed_script' => $scriptToken ? '<script src="'.TrackingUrl::to('/s/'.$scriptToken.'.js').'" async></script>' : null,
            'script_token' => $scriptToken,
            'qr_download_url' => $link ? ($ownAssignment ? route('publisher.tracking.qr', $assignment) : route('campaign.tracking.qr', [$campaign, $assignment])) : null,
            'qr_code' => $link ? (new QRCode(new QROptions(['outputType' => QRCode::OUTPUT_IMAGE_PNG, 'eccLevel' => QRCode::ECC_M, 'scale' => 5, 'imageBase64' => true])))->render($link) : null,
            'rates' => $rates,
            'currency' => $campaign->currency,
            'events_url' => $manual ? TrackingUrl::to('/api/v1/events') : null,
            'referrals_url' => $manual ? TrackingUrl::to('/api/v1/referrals') : null,
            'evidence' => $evidence,
            'handoff_url' => ($manual || in_array('promotion', $options, true)) && $assignment ? route('campaign.tracking.handoff', [$campaign, $assignment]) : null,
        ];
    }
}
