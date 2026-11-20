export interface Enrollment {
    id: number;
    name: string;
    website: string | null;
    sources: string[];
    status: string;
    terminated_at: string | null;
    offer: string | null;
    requested_offer_id: number | null;
    notes: string | null;
    applied_at: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
    terms_version: string | null;
    terms_accepted_at: string | null;
    terms_current: boolean;
    terms_snapshot: { campaign_terms?: unknown; offer_terms?: unknown } | null;
    approval_blocker: string | null;
    rates: { type: string; value: string }[];
    history: {
        id: number | string;
        action: string;
        at: string;
        reason: string | null;
        terms_version: string | null;
        terms_accepted_at: string | null;
    }[];
}
export interface PublisherWorkspace {
    can_approve: boolean;
    can_reject: boolean;
    capacity: number | null;
    rows: Enrollment[];
}
