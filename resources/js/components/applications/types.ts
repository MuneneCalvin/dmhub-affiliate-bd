import type { ApplicationData } from '@/types';

/** One row of `applications/index` (PublisherApplicationController@index). */
export type ApplicationRow = ApplicationData & {
    publisher_id: number;
    campaign_id: number;
    requested_offer_id: number | null;
    applied_notes: string | null;
    terms_accepted_at: string | null;
    rejection_reason: string | null;
    business_name: string | null;
    traffic_sources: unknown;
    monthly_visitors: number | null;
    partner_summary: {
        campaigns: number;
        pending: number;
        approval_rate: number | null;
    };
};

/** Application codes: P pending, A approved, R rejected, I inactive (paused). */
export const APPLICATION_STATUS: Record<string, string> = {
    P: 'pending',
    A: 'approved',
    R: 'rejected',
    I: 'inactive',
};

export const applicantName = (row: {
    business_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
}) =>
    row.business_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    row.email ||
    '—';

export const siteLabel = (url: string | null | undefined) =>
    url ? url.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null;
