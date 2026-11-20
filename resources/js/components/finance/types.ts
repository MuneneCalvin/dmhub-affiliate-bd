/** Totals by currency, then status: `{ EUR: { approved: { amount, count } } }`. */
export type FinanceSummary = Record<
    string,
    Record<string, { amount: string | number; count: number }>
>;

/** One reviewed earning on an invoice. */
export type InvoiceLine = {
    id: number;
    amount: string;
    /** Amount reserved on the invoice (after earlier reversals). */
    invoice_amount?: string;
    reversed_minor?: number;
    currency?: string | null;
    commission_type?: string | null;
    status?: string;
    created_at?: string;
    publisher_campaign?: {
        campaign?: { name: string } | null;
        offer?: { name: string } | null;
    } | null;
    conversion?: { order_code?: string | null } | null;
};

type PersonName = {
    name?: string;
    first_name?: string | null;
    last_name?: string | null;
};

/** A publisher invoice as the publisher, network and admin pages receive it. */
export type Invoice = {
    id: number;
    invoice_number: string;
    amount: string;
    currency: string;
    status: string;
    created_at: string;
    requested_at?: string | null;
    approved_at?: string | null;
    paid_at?: string | null;
    period_start?: string | null;
    period_end?: string | null;
    payment_method?: string | null;
    payment_reference?: string | null;
    rejection_reason?: string | null;
    notes?: string | null;
    invoice_details?: {
        gross_minor?: number;
        recovery_minor?: number;
        net_minor?: number;
    } | null;
    earnings?: InvoiceLine[];
    approved_by_user?: PersonName | null;
    network?: {
        id: number;
        network_name: string;
        support_email?: string | null;
    } | null;
    publisher?: {
        id: number;
        business_name?: string | null;
        website_url?: string | null;
        user?: (PersonName & { email?: string | null }) | null;
    } | null;
};

/** A payout group: one currency at one liable network. */
export type PayoutGroup = {
    network_id: number;
    network_name?: string | null;
    currency: string;
    available_amount: string;
    threshold: string;
    remaining: string;
    can_request: boolean;
};

export type PayoutRequest = {
    can_request: boolean;
    groups: PayoutGroup[];
};

/** What the viewer may do with an invoice (from the server). */
export type InvoiceAbilities = {
    approve?: boolean;
    reject?: boolean;
    pay?: boolean;
};
