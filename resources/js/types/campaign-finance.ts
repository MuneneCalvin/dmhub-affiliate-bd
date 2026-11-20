export type FinanceRow = {
    id: number;
    order: string;
    publisher: string;
    offer: string;
    currency: string;
    commission_minor: number;
    original_minor: number;
    reversed_minor: number;
    status: string;
    status_label: string;
    ledger_backed: boolean;
};
export type FinanceDetail = FinanceRow & {
    fraud_url?: string | null;
    sale_minor: number;
    refunded_basis_minor: number;
    rate: number;
    commission_type: string;
    confirmed_at: string | null;
    history: { label: string; at: string; note: string | null }[];
    invoice: {
        number: string;
        campaign_minor: number;
        total_minor: number | null;
        recovery_minor: number | null;
        other_campaigns: boolean;
        url: string | null;
        payment_reference: string | null;
        evidence: string | null;
    } | null;
    preview_url: string | null;
    adjust_url: string | null;
    review_url: string | null;
};
export type RefundPreview = {
    reversal_minor: number;
    remaining_minor: number;
    recovery: boolean;
    version: string;
};
export type FinanceWorkspace = {
    currency: string;
    publisher_view: boolean;
    filters: { status: string; search: string };
    summary: {
        pending_minor: number;
        approved_minor: number;
        pending_count: number;
    };
    rows: FinanceRow[];
    pagination: {
        page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    selected: FinanceDetail | null;
    balance_minor: number;
    threshold_minor: number | null;
    payout_url: string | null;
    export_url: string;
};
