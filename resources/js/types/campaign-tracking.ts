export type TrackingSetup =
    | 'purchase'
    | 'submission'
    | 'action'
    | 'click'
    | 'promotion';

type TrackingStore = {
    id: number;
    name: string;
    platform: string;
    status: string;
};

export type TrackingWorkspace = {
    publisher_view: boolean;
    campaign_name: string;
    stores: TrackingStore[];
    hub_url: string;
    detail_url: string;
    setup_options: TrackingSetup[];
    promotion_status: string | null;
    script_seen: boolean;
    clicked: boolean;
    publishers: { id: number; name: string }[];
    offer: {
        id: number;
        name: string;
        click_cookie_lifetime_hours: number | null;
        conversion_window_hours: number | null;
        preview_url: string | null;
    };
    assignment_id: number | null;
    tracking_link: string | null;
    embed_script: string | null;
    script_token: string | null;
    qr_code: string | null;
    qr_download_url: string | null;
    rates: { type: string | null; value: string | number | null }[];
    currency: string;
    events_url: string | null;
    referrals_url: string | null;
    handoff_url: string | null;
    evidence: {
        copied_at: string | null;
        platform: string | null;
        clicked_at: string | null;
        outcome: { reference: string; at: string; type: string } | null;
        commission: { status: string; amount: string; currency: string } | null;
    } | null;
};

export type TrackingOfferSummary = {
    id: number;
    name: string;
    url: string;
    publishers: number;
    links: number;
    stores: TrackingStore[];
    clicked: boolean;
    confirmed: boolean;
    setup_options: TrackingSetup[];
    promotion_status: string | null;
    script_seen: boolean;
    handoff_platform: string | null;
};
export type TrackingHub = {
    publisher_view: boolean;
    offers: TrackingOfferSummary[];
};
