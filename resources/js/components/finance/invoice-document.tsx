import { useTranslation } from 'react-i18next';

import { useDate } from '@/lib/format';
import { initialsFrom } from '@/lib/tones';
import { cn } from '@/lib/utils';

import { invoiceTotals, lineAmount, useFormatMoney } from './money';
import type { Invoice } from './types';

const STRIP = ['bg-brand', 'bg-partners', 'bg-finance', 'bg-admin'];

export function personName(
    person:
        | {
              name?: string;
              first_name?: string | null;
              last_name?: string | null;
          }
        | null
        | undefined,
): string | null {
    if (!person) return null;
    const full = [person.first_name, person.last_name]
        .filter(Boolean)
        .join(' ');
    return full || person.name || null;
}

export function publisherName(
    invoice: Pick<Invoice, 'publisher'>,
): string | null {
    return (
        invoice.publisher?.business_name ||
        personName(invoice.publisher?.user) ||
        null
    );
}

/** "1 Oct 2026 – 31 Oct 2026" or "—". */
function usePeriod() {
    const date = useDate();
    return (start?: string | null, end?: string | null) =>
        start || end ? `${date(start)} – ${date(end)}` : '—';
}

/**
 * The printable invoice card: colour strip, recipient (network) and issuer
 * (publisher), dates, line items and the totals the backend reserved.
 */
export function InvoiceDocument({
    invoice,
    className,
}: {
    invoice: Invoice;
    className?: string;
}) {
    const { t } = useTranslation();
    const money = useFormatMoney();
    const date = useDate();
    const period = usePeriod();
    const totals = invoiceTotals(invoice);
    const lines = invoice.earnings ?? [];
    const networkName = invoice.network?.network_name ?? t('Network');
    const issuer = publisherName(invoice);

    return (
        <article
            aria-label={t('Invoice {{number}}', {
                number: invoice.invoice_number,
            })}
            className={cn(
                'min-w-0 overflow-hidden rounded-[20px] border border-border bg-surface text-ink shadow-card',
                className,
            )}
        >
            <div aria-hidden="true" className="flex h-2">
                {STRIP.map((color) => (
                    <span key={color} className={cn('flex-1', color)} />
                ))}
            </div>
            <div className="flex flex-col gap-7 p-5 sm:p-8">
                <div className="flex flex-wrap justify-between gap-6">
                    <div className="flex items-center gap-3.5">
                        <span
                            aria-hidden="true"
                            className="flex size-[52px] shrink-0 items-center justify-center rounded-[15px] bg-partners-strong font-extrabold text-white"
                        >
                            {initialsFrom(networkName)}
                        </span>
                        <div className="flex min-w-0 flex-col">
                            <span className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                                {t('Bill to')}
                            </span>
                            <strong className="text-[17px]">
                                {networkName}
                            </strong>
                            {invoice.network?.support_email && (
                                <span className="text-[13px] text-ink-muted">
                                    {invoice.network.support_email}
                                </span>
                            )}
                        </div>
                    </div>
                    <dl className="grid grid-cols-[auto_auto] gap-x-[18px] gap-y-1 text-[13px]">
                        <dt className="text-ink-muted">{t('Issued')}</dt>
                        <dd className="font-bold">
                            {date(invoice.requested_at ?? invoice.created_at)}
                        </dd>
                        <dt className="text-ink-muted">{t('Period')}</dt>
                        <dd className="font-bold">
                            {period(invoice.period_start, invoice.period_end)}
                        </dd>
                        {invoice.payment_method && (
                            <>
                                <dt className="text-ink-muted">
                                    {t('Payout method')}
                                </dt>
                                <dd className="font-bold">
                                    {invoice.payment_method}
                                </dd>
                            </>
                        )}
                    </dl>
                </div>

                <div className="flex flex-col gap-0.5 rounded-[14px] bg-canvas px-[18px] py-4">
                    <span className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                        {t('Bill from')}
                    </span>
                    <strong>{issuer ?? '—'}</strong>
                    {(invoice.publisher?.user?.email ||
                        invoice.publisher?.website_url) && (
                        <span className="text-[13px] [overflow-wrap:anywhere] text-ink-muted">
                            {[
                                invoice.publisher?.user?.email,
                                invoice.publisher?.website_url,
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                        <caption className="sr-only">
                            {t('Included Earnings')}
                        </caption>
                        <thead>
                            <tr className="border-b-2 border-ink">
                                <th
                                    scope="col"
                                    className="py-2.5 text-left text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                                >
                                    {t('Campaign')}
                                </th>
                                <th
                                    scope="col"
                                    className="p-2.5 text-left text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                                >
                                    {t('Type')}
                                </th>
                                <th
                                    scope="col"
                                    className="p-2.5 text-left text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                                >
                                    {t('Date')}
                                </th>
                                <th
                                    scope="col"
                                    className="py-2.5 text-right text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase"
                                >
                                    {t('Commission')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="py-4 text-ink-muted"
                                    >
                                        {t(
                                            'No earnings attached to this invoice',
                                        )}
                                    </td>
                                </tr>
                            )}
                            {lines.map((line) => (
                                <tr
                                    key={line.id}
                                    className="border-b border-border"
                                >
                                    <td className="py-3.5">
                                        <strong className="block">
                                            {line.publisher_campaign?.campaign
                                                ?.name ?? '—'}
                                        </strong>
                                        {(line.publisher_campaign?.offer
                                            ?.name ||
                                            line.conversion?.order_code) && (
                                            <span className="block text-xs text-ink-muted">
                                                {[
                                                    line.publisher_campaign
                                                        ?.offer?.name,
                                                    line.conversion?.order_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2.5 text-ink-muted">
                                        {line.commission_type ?? '—'}
                                    </td>
                                    <td className="p-2.5 whitespace-nowrap text-ink-muted">
                                        {date(line.created_at)}
                                    </td>
                                    <td className="py-3.5 text-right font-bold tabular-nums">
                                        {money(
                                            lineAmount(line),
                                            invoice.currency,
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <dl
                    aria-label={t('Invoice totals')}
                    className="ml-auto grid w-[320px] max-w-full grid-cols-[1fr_auto] gap-y-2 text-sm [&>dd]:pl-4"
                >
                    <dt className="text-ink-muted">{t('Subtotal')}</dt>
                    <dd className="text-right tabular-nums">
                        {money(totals.subtotal, invoice.currency)}
                    </dd>
                    {totals.recovery > 0 && (
                        <>
                            <dt className="text-ink-muted">
                                {t('Prior refund recovery deducted')}
                            </dt>
                            <dd className="text-right tabular-nums">
                                −{money(totals.recovery, invoice.currency)}
                            </dd>
                        </>
                    )}
                    <dt className="border-t border-border pt-2.5 font-extrabold">
                        {t('Total')}
                    </dt>
                    <dd className="border-t border-border pt-1.5 text-right text-[22px] font-extrabold text-brand-ink tabular-nums">
                        {money(totals.total, invoice.currency)}
                    </dd>
                </dl>
            </div>
        </article>
    );
}
