export type PromotionConfig = {
    name: string;
    type: string;
    value: string;
    currency: string;
    scope: string;
    product_ids: string[];
    category_ids: string[];
    excluded_product_ids: string[];
    exclude_sale_items: boolean;
    minimum_subtotal: string;
    minimum_quantity: number;
    combines_with_other_discounts: boolean;
    starts_at: string;
    ends_at: string | null;
    validity_hours: number | string;
    display: string;
    message: string;
    applied_message: string;
    commission_basis: string;
    usage_limit?: number | string | null;
    background_color?: string;
    text_color?: string;
    message_nl?: string;
    applied_message_nl?: string;
    store_ids?: number[];
};
export type PromotionStore = {
    id: number;
    name: string;
    platform: string;
    domain: string;
    status: string;
    currency: string;
};
export type CustomerPromotion = {
    status: string;
    published_version: number | null;
    draft: PromotionConfig;
    latest_published_version?: { configuration: PromotionConfig } | null;
    stores: PromotionStore[];
};

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
