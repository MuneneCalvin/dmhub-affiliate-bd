import type {
    CustomerPromotion,
    PromotionStore,
} from '@/components/customer-promotions';
export type OfferRate = {
    id: number | null;
    type: string;
    value: string | null;
};
export type CampaignMaterial = {
    id: number;
    name: string;
    type: string;
    width: number | null;
    height: number | null;
    file_url: string;
    preview_url: string | null;
    html_code: string | null;
    alt_text: string | null;
    status: string;
    clicks: number;
    impressions: number | null;
    tracking_url: string | null;
    download_url: string;
};
export type WorkspaceOffer = {
    customer_promotion?: CustomerPromotion | null;
    id: number;
    campaign_id: number;
    name: string;
    description: string | null;
    offer_status: string;
    preview_url: string | null;
    thumbnail_url: string | null;
    conversion_window_hours: number | null;
    click_cookie_lifetime_hours: number | null;
    minimum_payout: string | number;
    terms: { terms?: string[] } | null;
    bonus: { bonuses?: string[] } | null;
    allowed_traffic_sources: { sources?: string[] } | null;
    prohibited_traffic_sources: { sources?: string[] } | null;
    rates: OfferRate[];
    publishers_count: number | null;
    tracking_guide_url: string | null;
    materials: CampaignMaterial[];
};
export type OffersWorkspace = {
    stores?: PromotionStore[];
    store_webhooks?: { id: number; topic: string; status: string }[];
    promotion_orders?: {
        id: number;
        external_id: string;
        status: string;
        review_reason: string | null;
    }[];
    promotion_adjustments?: {
        id: number;
        order_external_id: string;
        status: string;
        payload: { type: string; amount: string; currency: string };
    }[];
    can_create: boolean;
    can_edit: boolean;
    can_upload: boolean;
    can_edit_materials: boolean;
    commission_types: { id: number; name: string; nice_name: string }[];
    offers: WorkspaceOffer[];
};
