import { EmptyState, SectionCard } from '@/components/app';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useMoney, useShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface RevenueDay {
    date: string;
    revenue: number;
    commission: number;
    conversions: number;
}
export interface RevenueSeries {
    currency: string;
    days: RevenueDay[];
}

export const PERIODS = [7, 14, 30] as const;
export type Period = (typeof PERIODS)[number];

/** The series for `currency`, or the first one, trimmed to the last `period` days. */
export function seriesFor(
    series: RevenueSeries[],
    currency: string,
    period: number,
): RevenueSeries | undefined {
    const current =
        series.find((item) => item.currency === currency) ?? series[0];
    return current
        ? { currency: current.currency, days: current.days.slice(-period) }
        : undefined;
}

type RevenueChartProps = {
    series: RevenueSeries[];
    defaultCurrency: string;
    /** Controlled period (days). When omitted the card shows its own period switch. */
    period?: Period;
    title?: string;
    footer?: ReactNode;
    className?: string;
};

/**
 * Daily approved commissions as bars, one currency at a time. Each day can be
 * inspected with the pointer or the arrow keys; a visually hidden table holds
 * every value for screen readers.
 */
export function RevenueChart({
    series,
    defaultCurrency,
    period: controlledPeriod,
    title,
    footer,
    className,
}: RevenueChartProps) {
    const { t } = useTranslation();
    const id = useId();
    const [currency, setCurrency] = useState(defaultCurrency);
    const [ownPeriod, setOwnPeriod] = useState<Period>(30);
    const period = controlledPeriod ?? ownPeriod;
    const [active, setActive] = useState<number | null>(null);
    const current = seriesFor(series, currency, period);
    const currencyCode = current?.currency ?? defaultCurrency;
    const days = current?.days ?? [];
    const money = useMoney(currencyCode);
    const shortDate = useShortDate();

    const totals = days.reduce(
        (sum, day) => ({
            revenue: sum.revenue + day.revenue,
            commission: sum.commission + day.commission,
            conversions: sum.conversions + day.conversions,
        }),
        { revenue: 0, commission: 0, conversions: 0 },
    );
    const best = days.reduce<RevenueDay | null>(
        (top, day) =>
            day.commission > 0 && (!top || day.commission > top.commission)
                ? day
                : top,
        null,
    );
    const max = Math.max(0, ...days.map((day) => day.commission));
    const hasActivity = days.some(
        (day) =>
            day.revenue !== 0 || day.commission !== 0 || day.conversions !== 0,
    );
    const activeDay = active !== null ? days[active] : undefined;
    const describe = (day: RevenueDay) =>
        `${shortDate(day.date)} · ${t('Commissions')}: ${money(day.commission)} · ${t('Sales')}: ${money(day.revenue)} · ${t('{{count}} conversions', { count: day.conversions })}`;
    const labelIndexes = [
        ...new Set(
            [0, 0.25, 0.5, 0.75, 1].map((f) =>
                Math.round(f * Math.max(0, days.length - 1)),
            ),
        ),
    ];

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const last = days.length - 1;
        const from = active ?? last;
        const next = {
            ArrowLeft: Math.max(0, from - 1),
            ArrowRight: Math.min(last, from + 1),
            Home: 0,
            End: last,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        setActive(next);
    };

    const switchCurrency = (value: string) => {
        setCurrency(value);
        setActive(null);
    };

    return (
        <SectionCard
            title={title ?? t('Revenue')}
            description={t('Daily approved commissions · last {{count}} days', {
                count: period,
            })}
            icon={<BarChart3 />}
            tone="analytics"
            className={className}
            footer={footer}
            action={
                <>
                    {controlledPeriod === undefined && (
                        <SegmentedControl
                            label={t('Revenue period')}
                            size="sm"
                            value={String(period)}
                            onValueChange={(value) => {
                                setOwnPeriod(Number(value) as Period);
                                setActive(null);
                            }}
                            options={PERIODS.map((length) => ({
                                value: String(length),
                                label: t('{{count}} days', { count: length }),
                            }))}
                        />
                    )}
                    {series.length > 1 && (
                        <SegmentedControl
                            label={t('Revenue currency')}
                            size="sm"
                            value={currencyCode}
                            onValueChange={switchCurrency}
                            options={series.map((item) => ({
                                value: item.currency,
                                label: item.currency,
                            }))}
                        />
                    )}
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <dl className="flex flex-wrap gap-x-7 gap-y-3">
                    <Metric label={t('Sales')} value={money(totals.revenue)} />
                    <Metric
                        label={t('Commissions')}
                        value={money(totals.commission)}
                    />
                    <Metric
                        label={t('Best day')}
                        value={best ? money(best.commission) : '—'}
                        detail={best ? shortDate(best.date) : undefined}
                    />
                </dl>
                {hasActivity ? (
                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <div
                                role="slider"
                                tabIndex={0}
                                aria-label={t('Inspect a day')}
                                aria-describedby={`${id}-hint`}
                                aria-valuemin={1}
                                aria-valuemax={days.length}
                                aria-valuenow={(active ?? days.length - 1) + 1}
                                aria-valuetext={describe(
                                    days[active ?? days.length - 1],
                                )}
                                onKeyDown={onKeyDown}
                                onFocus={() =>
                                    setActive((value) =>
                                        value === null
                                            ? days.length - 1
                                            : value,
                                    )
                                }
                                onBlur={() => setActive(null)}
                                onPointerLeave={() => setActive(null)}
                                data-slot="revenue-bars"
                                className="flex h-[220px] items-end gap-[3px] rounded-lg border-b border-dashed border-border-strong pt-2.5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-surface focus-visible:outline-none sm:gap-1.5"
                            >
                                {days.map((day, index) => {
                                    const height =
                                        max > 0
                                            ? Math.max(
                                                  day.commission > 0 ? 3 : 1,
                                                  (Math.max(0, day.commission) /
                                                      max) *
                                                      100,
                                              )
                                            : 1;
                                    const isActive = index === active;
                                    return (
                                        <div
                                            key={day.date}
                                            aria-hidden="true"
                                            onPointerEnter={() =>
                                                setActive(index)
                                            }
                                            className="flex h-full min-w-[3px] flex-1 items-end"
                                        >
                                            <div
                                                className={cn(
                                                    'w-full rounded-t-md rounded-b-[2px] transition-colors',
                                                    isActive
                                                        ? 'bg-brand'
                                                        : day.commission > 0
                                                          ? 'bg-brand/55'
                                                          : 'bg-surface-tint',
                                                )}
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {activeDay && active !== null && (
                                <div
                                    aria-hidden="true"
                                    data-slot="revenue-tooltip"
                                    className="pointer-events-none absolute top-0 z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl bg-sidebar px-3 py-2 text-xs text-white shadow-card"
                                    style={{
                                        left: `clamp(110px, ${((active + 0.5) / days.length) * 100}%, calc(100% - 110px))`,
                                    }}
                                >
                                    <p className="font-bold">
                                        {shortDate(activeDay.date)}
                                    </p>
                                    <p>
                                        {t('Commissions')}:{' '}
                                        {money(activeDay.commission)}
                                    </p>
                                    <p>
                                        {t('Sales')}: {money(activeDay.revenue)}
                                    </p>
                                    <p>
                                        {t('{{count}} conversions', {
                                            count: activeDay.conversions,
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div
                            aria-hidden="true"
                            className="flex justify-between text-xs text-ink-muted tabular-nums"
                        >
                            {labelIndexes.map((index) => (
                                <span key={index}>
                                    {shortDate(days[index].date)}
                                </span>
                            ))}
                        </div>
                        <p id={`${id}-hint`} className="sr-only">
                            {t(
                                'Use the left and right arrow keys to move between days.',
                            )}
                        </p>
                        <table className="sr-only">
                            <caption>
                                {t('Daily approved results')} · {currencyCode}
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">{t('Date')}</th>
                                    <th scope="col">{t('Commissions')}</th>
                                    <th scope="col">{t('Sales')}</th>
                                    <th scope="col">{t('Conversions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((day) => (
                                    <tr key={day.date}>
                                        <th scope="row">
                                            {shortDate(day.date)}
                                        </th>
                                        <td>{money(day.commission)}</td>
                                        <td>{money(day.revenue)}</td>
                                        <td>{day.conversions}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={<BarChart3 />}
                        tone="analytics"
                        title={t('No approved revenue in this period')}
                        description={t(
                            'Approved sales and commissions will appear here.',
                        )}
                    />
                )}
            </div>
        </SectionCard>
    );
}

function Metric({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail?: string;
}) {
    return (
        <div className="flex flex-col">
            <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
            <dd className="text-xl font-extrabold tabular-nums">
                {value}
                {detail && (
                    <span className="ml-2 text-xs font-semibold text-ink-muted">
                        {detail}
                    </span>
                )}
            </dd>
        </div>
    );
}
