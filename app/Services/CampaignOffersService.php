<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CommissionType;
use App\Models\Offer;
use App\Models\PromotionAdjustment;
use App\Models\PromotionOrder;
use App\Models\PublisherCampaigns;
use App\Models\StoreConnection;
use App\Models\StoreWebhookDelivery;
use App\Models\User;

class CampaignOffersService
{
    public function build(Campaign $campaign, User $user, ?PublisherCampaigns $assignment = null): array
    {
        $permissions = $user->permissionNames();
        $can = fn (string $permission) => ! $assignment && ($user->is_super_admin || $permissions->contains($permission));
        $offers = Offer::where('campaign_id', $campaign->id)
            ->when($assignment, fn ($q) => $q->whereKey($assignment->offer_id ?? 0))
            ->with(['customerPromotion.stores', 'commissions.commissionType', 'creatives' => function ($q) use ($assignment) {
                $q->when($assignment, fn ($q) => $q->where('status', 'A'))->orderBy('id');
                if ($assignment) {
                    $q->withCount(['clickRecords as assignment_clicks' => fn ($q) => $q->where('publisher_campaign_id', $assignment->id)]);
                }
            }])->orderBy('id')->get();
        $counts = $assignment ? collect() : PublisherCampaigns::where('campaign_id', $campaign->id)
            ->where('status', 'A')->whereNull('terminated_at')->selectRaw('offer_id, COUNT(DISTINCT publisher_id) as aggregate')->groupBy('offer_id')->pluck('aggregate', 'offer_id');

        return [
            'stores' => $assignment ? [] : StoreConnection::where('advertiser_id', $campaign->advertiser_id)->where('network_id', $campaign->network_id)->get(['id', 'public_id', 'name', 'platform', 'domain', 'currency', 'status', 'last_seen_at']),
            'store_webhooks' => $assignment ? [] : StoreWebhookDelivery::whereIn('store_connection_id', StoreConnection::where('advertiser_id', $campaign->advertiser_id)->select('id'))->where('status', '!=', 'processed')->latest()->limit(20)->get(['id', 'topic', 'status']),
            'promotion_orders' => $assignment ? [] : PromotionOrder::whereHas('grant.click', fn ($q) => $q->where('campaign_id', $campaign->id))->latest()->limit(20)->get(['id', 'external_id', 'status', 'review_reason', 'conversion_event_id', 'created_at']),
            'promotion_adjustments' => $assignment ? [] : PromotionAdjustment::whereIn('store_connection_id', StoreConnection::where('advertiser_id', $campaign->advertiser_id)->select('id'))->latest()->limit(20)->get(['id', 'order_external_id', 'status', 'payload']),
            'can_create' => $can('create_offers'),
            'can_edit' => $can('manage_offers'),
            'can_upload' => $can('upload_creatives'),
            'can_edit_materials' => $can('manage_creatives'),
            'commission_types' => $assignment ? [] : CommissionType::all(['id', 'name', 'nice_name']),
            'offers' => $offers->map(function (Offer $offer) use ($assignment, $counts) {
                $data = $offer->only(['id', 'campaign_id', 'name', 'description', 'terms', 'bonus', 'offer_status',
                    'conversion_window_hours', 'click_cookie_lifetime_hours', 'minimum_payout',
                    'allowed_traffic_sources', 'prohibited_traffic_sources', 'preview_url', 'thumbnail_url']);
                $data['customer_promotion'] = ! $assignment ? $offer->customerPromotion : null;
                $data['tracking_guide_url'] = ! $assignment || ($assignment->status === 'A' && ! $assignment->terminated_at)
                    ? ($assignment ? route('publishers.my.campaign.show', ['id' => $assignment->id, 'tab' => 'tracking', 'offer' => $offer->id])
                        : route('advertiser.campaign.show', ['id' => $offer->campaign_id, 'tab' => 'tracking', 'offer' => $offer->id])) : null;
                $data['rates'] = $assignment
                    ? ($assignment->commission_type !== null ? [['id' => null, 'type' => $assignment->commission_type, 'value' => $assignment->commission_value]] : [])
                    : $offer->commissions->map(fn ($rate) => ['id' => $rate->commission_type_id, 'type' => $rate->commissionType?->name, 'value' => $rate->commission_value === null ? null : (string) $rate->commission_value])->all();
                $data['publishers_count'] = $assignment ? null : (int) ($counts[$offer->id] ?? 0);
                $data['materials'] = $offer->creatives->map(function ($creative) use ($assignment) {
                    return [
                        ...$creative->only(['id', 'name', 'type', 'width', 'height', 'file_url', 'preview_url', 'html_code', 'alt_text', 'status']),
                        'clicks' => (int) ($assignment ? $creative->assignment_clicks : $creative->clicks),
                        'impressions' => $assignment ? null : (int) $creative->impressions,
                        'tracking_url' => $assignment && $assignment->status === 'A' && ! $assignment->terminated_at && $assignment->tracking_link ? $assignment->getCreativeTrackingUrl($creative) : null,
                        'download_url' => route('campaign.materials.download', ['creative' => $creative->id, ...($assignment ? ['assignment' => $assignment->id] : [])]),
                    ];
                })->all();

                return $data;
            })->all(),
        ];
    }
}
