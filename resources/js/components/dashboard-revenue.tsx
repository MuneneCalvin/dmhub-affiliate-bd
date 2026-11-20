import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RevenueDay {
    date: string;
    revenue: number;
    commission: number;
    conversions: number;
}

export interface RevenueSeries {
    currency: string;
    days: RevenueDay[];
}

export function DashboardRevenue({
    series,
    defaultCurrency = 'USD',
}: {
    series: RevenueSeries[];
    defaultCurrency?: string;
}) {
    const { t, i18n } = useTranslation();
    const id = useId();
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    useEffect(() => {
        const element = chartRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) =>
            setChartWidth(Math.max(240, entry.contentRect.width)),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);
    const plotLeft = 44;
    const plotRight = chartWidth - 12;
    const [currency, setCurrency] = useState(defaultCurrency);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const current =
        series.find((item) => item.currency === currency) ?? series[0];
    const days = current?.days ?? [];
    const money = (value: number) =>
        new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency: current?.currency ?? defaultCurrency,
            maximumFractionDigits: 2,
        }).format(value);
    const dateLabel = (date: string, full = false) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: full ? 'long' : 'short',
            ...(full ? { year: 'numeric' as const } : {}),
        }).format(new Date(`${date}T12:00:00`));
    const total = days.reduce(
        (sum, day) => ({
            revenue: sum.revenue + day.revenue,
            commission: sum.commission + day.commission,
            conversions: sum.conversions + day.conversions,
        }),
        { revenue: 0, commission: 0, conversions: 0 },
    );
    const active = activeIndex === null ? undefined : days[activeIndex];
    const maximum = Math.max(1, ...days.map((day) => day.revenue));
    const minimum = Math.min(0, ...days.map((day) => day.revenue));
    const x = (index: number) =>
        plotLeft +
        (index / Math.max(1, days.length - 1)) * (plotRight - plotLeft);
    const y = (value: number) =>
        218 - ((value - minimum) / (maximum - minimum)) * 190;
    const line = days
        .map(
            (day, index) =>
                `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(day.revenue)}`,
        )
        .join(' ');
    const stats = [
        { label: t('Net approved sales'), value: money(total.revenue) },
        {
            label: t('Net approved commissions'),
            value: money(total.commission),
        },
        {
            label: t('Approved conversions'),
            value: total.conversions.toLocaleString(i18n.language),
        },
    ];

    return (
        <section
            className="revenue-panel min-w-0 overflow-hidden rounded-[22px] border border-border bg-card"
            aria-labelledby={`${id}-title`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                    <h2 id={`${id}-title`} className="text-base font-semibold">
                        {t('Revenue overview')}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('Last 30 days')} · {t('Approved conversions')}
                    </p>
                </div>
                {series.length > 1 ? (
                    <select
                        aria-label={t('Revenue currency')}
                        value={current.currency}
                        onChange={(event) => {
                            setCurrency(event.target.value);
                            setActiveIndex(null);
                        }}
                        className="rounded-md border border-border bg-card px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        {series.map((item) => (
                            <option key={item.currency} value={item.currency}>
                                {item.currency}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {current?.currency ?? defaultCurrency}
                    </span>
                )}
            </div>
            <dl className="revenue-metrics grid grid-cols-3 divide-x divide-border border-b border-border">
                {stats.map((stat) => (
                    <div key={stat.label} className="min-w-0 px-4 py-5">
                        <dt className="text-xs text-muted-foreground">
                            {stat.label}
                        </dt>
                        <dd className="mt-2 text-xl font-medium break-words tabular-nums">
                            {stat.value}
                        </dd>
                    </div>
                ))}
            </dl>
            <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">
                        {t('Daily revenue')}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                        {days.length > 0 &&
                            `${dateLabel(days[0].date)} – ${dateLabel(days[days.length - 1].date)}`}
                    </span>
                </div>
                <div ref={chartRef} className="relative mt-4">
                    <svg
                        viewBox={`0 0 ${chartWidth} 250`}
                        className="block w-full overflow-visible"
                        role="img"
                        aria-labelledby={`${id}-chart-title`}
                    >
                        <title id={`${id}-chart-title`}>
                            {t('Daily revenue for the last 30 days')}
                        </title>
                        {[0, 1, 2, 3].map((tick) => {
                            const value =
                                minimum + ((maximum - minimum) * tick) / 3;
                            return (
                                <g key={tick}>
                                    <line
                                        x1={plotLeft}
                                        x2={plotRight}
                                        y1={y(value)}
                                        y2={y(value)}
                                        stroke="var(--border)"
                                        strokeDasharray={
                                            tick === 0 ? undefined : '3 5'
                                        }
                                    />
                                    <text
                                        x={plotLeft - 8}
                                        y={y(value) + 4}
                                        textAnchor="end"
                                        fill="var(--muted-foreground)"
                                        fontSize="12"
                                    >
                                        {new Intl.NumberFormat(i18n.language, {
                                            notation: 'compact',
                                            maximumFractionDigits: 1,
                                        }).format(value)}
                                    </text>
                                </g>
                            );
                        })}
                        {days.length > 0 && (
                            <>
                                <path
                                    d={`${line} L ${x(days.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
                                    fill="var(--chart-1)"
                                    opacity="0.08"
                                />
                                <path
                                    d={line}
                                    fill="none"
                                    stroke="var(--chart-1)"
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                />
                                {(chartWidth < 420
                                    ? [0, 14, 29]
                                    : [0, 7, 14, 21, 29]
                                )
                                    .filter((index) => index < days.length)
                                    .map((index) => (
                                        <text
                                            key={index}
                                            x={x(index)}
                                            y="244"
                                            textAnchor={
                                                index === 0
                                                    ? 'start'
                                                    : index === 29
                                                      ? 'end'
                                                      : 'middle'
                                            }
                                            fill="var(--muted-foreground)"
                                            fontSize="12"
                                        >
                                            {dateLabel(days[index].date)}
                                        </text>
                                    ))}
                                {active && (
                                    <g>
                                        <line
                                            x1={x(activeIndex!)}
                                            x2={x(activeIndex!)}
                                            y1="20"
                                            y2="218"
                                            stroke="var(--muted-foreground)"
                                            strokeDasharray="3 4"
                                        />
                                        <circle
                                            cx={x(activeIndex!)}
                                            cy={y(active.revenue)}
                                            r="5"
                                            fill="var(--chart-1)"
                                            stroke="var(--card)"
                                            strokeWidth="2"
                                        />
                                    </g>
                                )}
                                {days.map((day, index) => (
                                    <rect
                                        key={day.date}
                                        x={
                                            x(index) -
                                            (plotRight - plotLeft) / 58
                                        }
                                        y="18"
                                        width={(plotRight - plotLeft) / 29}
                                        height="202"
                                        fill="transparent"
                                        onPointerEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        onPointerDown={() =>
                                            setActiveIndex(index)
                                        }
                                    />
                                ))}
                            </>
                        )}
                    </svg>
                    {total.conversions === 0 && (
                        <p className="absolute inset-x-4 top-1/3 text-center text-sm text-muted-foreground">
                            {t('No approved revenue in this period')}
                        </p>
                    )}
                </div>
                {days.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                        <output
                            className="text-xs text-muted-foreground tabular-nums"
                            aria-live="polite"
                        >
                            {active
                                ? `${dateLabel(active.date, true)} · ${money(active.revenue)}`
                                : t('Select a day to view revenue')}
                        </output>
                        <input
                            type="range"
                            min="0"
                            max={days.length - 1}
                            value={activeIndex ?? days.length - 1}
                            onChange={(event) =>
                                setActiveIndex(Number(event.target.value))
                            }
                            aria-label={t('Select revenue day')}
                            aria-valuetext={`${dateLabel(days[activeIndex ?? days.length - 1].date, true)}: ${money(days[activeIndex ?? days.length - 1].revenue)}`}
                            className="h-5 w-28 accent-[var(--chart-1)]"
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
