import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/app/empty-state';
import { IconTile } from '@/components/app/icon-tile';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { Coins } from 'lucide-react';

import { summaryCurrencies, useFormatMoney } from './money';
import type { FinanceSummary } from './types';

/** Status order used in every totals card. */
const ORDER = [
    'pending',
    'approved',
    'locked',
    'payable',
    'paid',
    'rejected',
    'reversed',
];

const byOrder = (a: string, b: string) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
};

/**
 * One card per currency listing the amount and count per status. Amounts of
 * different currencies are never added together.
 */
export function CurrencyTotals({
    summary,
    label,
    className,
}: {
    summary: FinanceSummary;
    /** Accessible name of the group, e.g. "Invoice totals by currency". */
    label?: string;
    className?: string;
}) {
    const { t } = useTranslation();
    const money = useFormatMoney();
    const currencies = summaryCurrencies(summary);

    if (!currencies.length) {
        return (
            <section
                aria-label={label ?? t('Totals by currency and status')}
                className={cn(
                    'rounded-card border border-border bg-surface shadow-card',
                    className,
                )}
            >
                <EmptyState
                    icon={<Coins />}
                    tone="finance"
                    title={t('No reviewed financial activity yet.')}
                />
            </section>
        );
    }

    return (
        <section
            aria-label={label ?? t('Totals by currency and status')}
            className={cn(
                'grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-[18px]',
                className,
            )}
        >
            {currencies.map((currency) => {
                const rows = Object.entries(summary[currency]).sort(
                    ([a], [b]) => byOrder(a, b),
                );
                return (
                    <article
                        key={currency}
                        aria-label={t('{{currency}} totals', { currency })}
                        className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
                    >
                        <header className="flex items-center gap-3">
                            <IconTile size={32} tone="finance">
                                <Coins />
                            </IconTile>
                            <h3 className="text-base font-bold">{currency}</h3>
                        </header>
                        <dl className="flex flex-col divide-y divide-border">
                            {rows.map(([status, value]) => (
                                <div
                                    key={status}
                                    className="flex items-center justify-between gap-3 py-2"
                                >
                                    <dt className="flex items-center gap-2">
                                        <StatusBadge status={status} />
                                        <span className="text-xs text-ink-muted tabular-nums">
                                            × {value.count}
                                        </span>
                                    </dt>
                                    <dd className="font-bold tabular-nums">
                                        {money(value.amount, currency)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </article>
                );
            })}
        </section>
    );
}
