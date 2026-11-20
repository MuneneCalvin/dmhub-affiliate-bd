import { useTranslation } from 'react-i18next';

import type { FinanceSummary, Invoice, PayoutGroup } from './types';

/**
 * Formats one amount in one currency. There is deliberately no helper that
 * adds amounts of different currencies: every total on the finance pages is
 * computed and shown per currency.
 */
export function formatMoney(
    value: number | string | null | undefined,
    currency: string,
    locale = 'en',
): string {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

/** `formatMoney` bound to the interface language. */
export function useFormatMoney() {
    const { i18n } = useTranslation();
    return (value: number | string | null | undefined, currency: string) =>
        formatMoney(value, currency, i18n.language);
}

/** Minor units (cents) → major units, without floating point drift. */
export const fromMinor = (minor: number | null | undefined) =>
    Math.round(Number(minor ?? 0)) / 100;

/** Currencies present in a summary, sorted. */
export function summaryCurrencies(summary: FinanceSummary | null | undefined) {
    return Object.keys(summary ?? {}).sort();
}

/**
 * Sum of the given statuses within ONE currency. Statuses of other
 * currencies are never included.
 */
export function summaryTotal(
    summary: FinanceSummary | null | undefined,
    currency: string,
    statuses: string[],
): { amount: number; count: number } {
    const rows = summary?.[currency] ?? {};
    // Work in cents so 0.1 + 0.2 stays 0.30.
    let cents = 0;
    let count = 0;
    statuses.forEach((status) => {
        const row = rows[status];
        if (!row) return;
        cents += Math.round(Number(row.amount) * 100);
        count += Number(row.count ?? 0);
    });
    return { amount: cents / 100, count };
}

/**
 * Available balance of one currency across its liable networks. Each network
 * is still invoiced separately; this is only the headline figure.
 */
export function availableFor(
    groups: PayoutGroup[] | null | undefined,
    currency: string,
): { amount: number; canRequest: boolean; groups: PayoutGroup[] } {
    const matching = (groups ?? []).filter((g) => g.currency === currency);
    const cents = matching.reduce(
        (sum, g) => sum + Math.round(Number(g.available_amount) * 100),
        0,
    );
    return {
        amount: cents / 100,
        canRequest: matching.some((g) => g.can_request),
        groups: matching,
    };
}

/**
 * Invoice totals as the backend reserved them: subtotal (gross), deducted
 * refund recovery and the invoice amount. Older invoices without stored
 * evidence show the amount as both subtotal and total.
 */
export function invoiceTotals(
    invoice: Pick<Invoice, 'amount' | 'invoice_details'>,
) {
    const details = invoice.invoice_details ?? {};
    const total = Number(invoice.amount);
    const subtotal =
        details.gross_minor != null ? fromMinor(details.gross_minor) : total;
    const recovery = details.recovery_minor
        ? fromMinor(details.recovery_minor)
        : 0;
    return { subtotal, recovery, total };
}

/** Net commission of an earning line on an invoice (or after reversals). */
export function lineAmount(line: {
    amount: string;
    invoice_amount?: string;
    reversed_minor?: number;
}) {
    if (line.invoice_amount != null) return Number(line.invoice_amount);
    return (
        Math.round(
            Number(line.amount) * 100 - Number(line.reversed_minor ?? 0),
        ) / 100
    );
}
