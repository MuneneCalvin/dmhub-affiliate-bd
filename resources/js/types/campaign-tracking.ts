export type TrackingWorkspace = {
    publisher_view: boolean;
    offers: { id: number; name: string }[];
    publishers: { id: number; name: string }[];
    offer: {
        id: number;
        name: string;
        click_cookie_lifetime_hours: number | null;
        conversion_window_hours: number | null;
        preview_url: string | null;
    } | null;
    assignment_id: number | null;
    tracking_link: string | null;
    embed_script: string | null;
    script_token: string | null;
    qr_code: string | null;
    qr_download_url: string | null;
    rates: { type: string | null; value: string | number | null }[];
    currency: string;
    events_url: string;
    referrals_url: string;
    handoff_url: string | null;
    evidence: {
        copied_at: string | null;
        clicked_at: string | null;
        outcome: { reference: string; at: string; type: string } | null;
        commission: { status: string; amount: string; currency: string } | null;
    } | null;
};
