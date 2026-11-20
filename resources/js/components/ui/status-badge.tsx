import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { StatusTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type StatusEntry = { tone: StatusTone; label: string };

/**
 * The one status → tone map (docs/redesign/tokens.md, "Status tones").
 * Keys are normalised: lower case, spaces and dashes as underscores. Single
 * letter codes from older endpoints are matched case-sensitively first.
 * Labels are English source strings passed through `t()`.
 */
export const STATUS_MAP: Record<string, StatusEntry> = {
    // success
    active: { tone: 'success', label: 'Active' },
    approved: { tone: 'success', label: 'Approved' },
    paid: { tone: 'success', label: 'Paid' },
    installed: { tone: 'success', label: 'Installed' },
    verified: { tone: 'success', label: 'Verified' },
    resolved: { tone: 'success', label: 'Resolved' },
    completed: { tone: 'success', label: 'Completed' },
    fully_converted: { tone: 'success', label: 'Fully Converted' },
    // warning
    pending: { tone: 'warning', label: 'Pending' },
    paused: { tone: 'warning', label: 'Paused' },
    open: { tone: 'warning', label: 'Open' },
    not_seen: { tone: 'warning', label: 'Not seen' },
    flagged: { tone: 'warning', label: 'Flagged' },
    pending_approval: { tone: 'warning', label: 'Pending Approval' },
    pending_inspection: { tone: 'warning', label: 'Pending Inspection' },
    processing: { tone: 'warning', label: 'Processing' },
    // danger
    rejected: { tone: 'danger', label: 'Rejected' },
    overdue: { tone: 'danger', label: 'Overdue' },
    suspended: { tone: 'danger', label: 'Suspended' },
    escalated: { tone: 'danger', label: 'Escalated' },
    failed: { tone: 'danger', label: 'Failed' },
    cancelled: { tone: 'danger', label: 'Cancelled' },
    reversed: { tone: 'danger', label: 'Reversed' },
    deactivated: { tone: 'danger', label: 'Deactivated' },
    // info
    sent: { tone: 'info', label: 'Sent' },
    draft: { tone: 'info', label: 'Draft' },
    scheduled: { tone: 'info', label: 'Scheduled' },
    invoiced: { tone: 'info', label: 'Invoiced' },
    partially_converted: { tone: 'info', label: 'Partially Converted' },
    locked: { tone: 'info', label: 'Locked' },
    payable: { tone: 'info', label: 'Payable' },
    // neutral
    ended: { tone: 'neutral', label: 'Ended' },
    archived: { tone: 'neutral', label: 'Archived' },
    inactive: { tone: 'neutral', label: 'Inactive' },
    expired: { tone: 'neutral', label: 'Expired' },
    // leads
    contacted: { tone: 'info', label: 'Contacted' },
    qualified: { tone: 'warning', label: 'Qualified' },
    converted: { tone: 'success', label: 'Converted' },
    lost: { tone: 'neutral', label: 'Lost' },
    // brand
    not_applied: { tone: 'brand', label: 'Not applied' },
    new: { tone: 'brand', label: 'New' },
    // Commission types, priorities and frequencies (kept from the old badge)
    cpl: { tone: 'brand', label: 'Cost Per Submission' },
    cpa: { tone: 'brand', label: 'Cost Per Action' },
    cps: { tone: 'brand', label: 'Cost Per Sale' },
    revshare: { tone: 'brand', label: 'Revenue Share' },
    flat: { tone: 'brand', label: 'Flat Rate' },
    high: { tone: 'danger', label: 'High' },
    medium: { tone: 'warning', label: 'Medium' },
    low: { tone: 'neutral', label: 'Low' },
    weekly: { tone: 'neutral', label: 'Weekly' },
    biweekly: { tone: 'neutral', label: 'Bi-Weekly' },
    monthly: { tone: 'neutral', label: 'Monthly' },
    quarterly: { tone: 'neutral', label: 'Quarterly' },
    annually: { tone: 'neutral', label: 'Annually' },
};

/** Single-letter codes used by older models. */
const CODE_MAP: Record<string, string> = {
    A: 'active',
    P: 'pending',
    R: 'rejected',
    D: 'deactivated',
    N: 'deactivated',
    I: 'inactive',
    W: 'weekly',
    M: 'monthly',
};
const FIXED: StatusEntry = { tone: 'neutral', label: 'Fixed' };

export function normaliseStatus(status: string): string {
    return status.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Tone and English label for a status; unknown statuses are neutral. */
export function resolveStatus(
    status: string | null | undefined,
): StatusEntry & { known: boolean } {
    const raw = String(status ?? '');
    if (raw === 'F') return { ...FIXED, known: true };
    const key = CODE_MAP[raw] ?? normaliseStatus(raw);
    const entry = STATUS_MAP[key];
    return entry
        ? { ...entry, known: true }
        : { tone: 'neutral', label: raw, known: false };
}

const toneStyles: Record<StatusTone, { badge: string; dot: string }> = {
    success: { badge: 'bg-success-soft text-success-ink', dot: 'bg-success-dot' },
    warning: { badge: 'bg-warning-soft text-warning-ink', dot: 'bg-warning-dot' },
    danger: { badge: 'bg-danger-soft text-danger-ink', dot: 'bg-danger-dot' },
    info: { badge: 'bg-info-soft text-info-ink', dot: 'bg-info-dot' },
    neutral: { badge: 'bg-neutral-soft text-neutral-ink', dot: 'bg-neutral-dot' },
    brand: { badge: 'bg-brand-soft text-brand-ink', dot: 'bg-brand' },
};

type StatusBadgeProps = Omit<React.ComponentProps<'span'>, 'children'> & {
    status?: string | null;
    /** Overrides the mapped label (already translated). */
    label?: React.ReactNode;
    /** Overrides the mapped tone. */
    tone?: StatusTone;
};

/** Pill with a 6px dot and a text label. Status is never colour alone. */
function StatusBadge({
    status,
    label,
    tone,
    className,
    ...props
}: StatusBadgeProps) {
    const { t } = useTranslation();
    const resolved = resolveStatus(status);
    const finalTone = tone ?? resolved.tone;
    const text =
        label ?? (resolved.known ? t(resolved.label) : resolved.label);

    return (
        <span
            data-slot="status-badge"
            data-status={status ?? undefined}
            data-tone={finalTone}
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-tight font-bold whitespace-nowrap',
                toneStyles[finalTone].badge,
                className,
            )}
            {...props}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    toneStyles[finalTone].dot,
                )}
            />
            {text}
        </span>
    );
}

export { StatusBadge, type StatusBadgeProps };
