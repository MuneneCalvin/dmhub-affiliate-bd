import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AnalyticsWorkspace } from '@/types/campaign-analytics';
import { router, usePage, usePoll } from '@inertiajs/react';
import { ChevronDown, Download, Info, LoaderCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-analytics.css';

export function CampaignAnalytics() {
    const {
        props: { analyticsWorkspace: data },
        url,
    } = usePage<{ analyticsWorkspace: AnalyticsWorkspace }>();
    usePoll(60000, { only: ['analyticsWorkspace'] });
    return (
        <AnalyticsContent
            key={JSON.stringify(data.filters)}
            data={data}
            baseUrl={url.split('?')[0]}
        />
    );
}

function AnalyticsContent({
    data,
    baseUrl,
}: {
    data: AnalyticsWorkspace;
    baseUrl: string;
}) {
    const { t, i18n } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [datesOpen, setDatesOpen] = useState(false);
    const [start, setStart] = useState(data.filters.start);
    const [end, setEnd] = useState(data.filters.end);
    const date = (value: string, year = false) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            ...(year ? { year: 'numeric' as const } : {}),
            timeZone: 'UTC',
        }).format(new Date(`${value}T00:00:00Z`));
    const num = (value: number, digits = 0) =>
        new Intl.NumberFormat(i18n.language, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
        }).format(value);
    const money = (value: number, digits = Number.isInteger(value) ? 0 : 2) =>
        `${data.currency} ${num(value, digits)}`;
    const change = (patch: Partial<AnalyticsWorkspace['filters']>) => {
        setError('');
        router.get(
            baseUrl,
            { tab: 'analytics', ...data.filters, ...patch },
            {
                only: ['analyticsWorkspace'],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: () => setDatesOpen(false),
                onError: (errors) => setError(Object.values(errors).join(' ')),
            },
        );
    };
    const preset = (days: number) => {
        const last = new Date().toISOString().slice(0, 10);
        const first = new Date(`${last}T00:00:00Z`);
        first.setUTCDate(first.getUTCDate() - days + 1);
        change({ start: first.toISOString().slice(0, 10), end: last });
    };
    const exportUrl = (format: 'csv' | 'xlsx', dataset = 'breakdown') => {
        const query = new URLSearchParams({ format, dataset });
        Object.entries(data.filters).forEach(([key, value]) => {
            if (value !== null) query.set(key, String(value));
        });
        return `${data.export_url}?${query}`;
    };
    const group = data.filters.group;
    const rows = data.breakdowns[group] ?? [];
    return (
        <section className="campaign-analytics" aria-busy={busy}>
            <div className="analytics-heading">
                <div>
                    <h2>
                        {t(
                            data.publisher_view
                                ? 'Your campaign analytics'
                                : 'Campaign analytics',
                        )}
                    </h2>
                    {data.publisher_view && <p>{t('Your assignment only')}</p>}
                </div>
                <div className="analytics-filters">
                    <Popover open={datesOpen} onOpenChange={setDatesOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className="analytics-date"
                                disabled={busy}
                                aria-label={t('Select date range')}
                            >
                                {date(
                                    data.filters.start,
                                    data.filters.start.slice(0, 4) !==
                                        data.filters.end.slice(0, 4),
                                )}{' '}
                                – {date(data.filters.end, true)} · UTC
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            <form
                                className="grid gap-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (
                                        start > end ||
                                        (Date.parse(end) - Date.parse(start)) /
                                            86400000 >
                                            365
                                    ) {
                                        setError(
                                            t(
                                                'Choose a date range of 1 to 366 days, with the start on or before the end.',
                                            ),
                                        );
                                        return;
                                    }
                                    change({ start, end });
                                }}
                            >
                                <strong>{t('Date range (UTC)')}</strong>
                                <div className="flex flex-wrap gap-2">
                                    {[7, 30, 90].map((days) => (
                                        <Button
                                            key={days}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => preset(days)}
                                        >
                                            {t('Last {{count}} days', {
                                                count: days,
                                            })}
                                        </Button>
                                    ))}
                                </div>
                                <label className="grid gap-1 text-sm">
                                    {t('Start date')}
                                    <input
                                        className="rounded-md border p-2"
                                        aria-label={t('Start date')}
                                        type="date"
                                        required
                                        value={start}
                                        onChange={(event) =>
                                            setStart(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="grid gap-1 text-sm">
                                    {t('End date')}
                                    <input
                                        className="rounded-md border p-2"
                                        aria-label={t('End date')}
                                        type="date"
                                        required
                                        value={end}
                                        min={start}
                                        onChange={(event) =>
                                            setEnd(event.target.value)
                                        }
                                    />
                                </label>
                                <Button disabled={busy} type="submit">
                                    {t('Apply date range')}
                                </Button>
                                {error && (
                                    <p
                                        role="alert"
                                        className="text-sm text-danger-ink"
                                    >
                                        {error}
                                    </p>
                                )}
                            </form>
                        </PopoverContent>
                    </Popover>
                    <Select
                        value={String(data.filters.offer ?? '') || '__none__'}
                        disabled={busy}
                        onValueChange={(value) =>
                            change({
                                offer:
                                    value === '__none__' ? null : Number(value),
                            })
                        }
                    >
                        <SelectTrigger aria-label={t('Filter by offer')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">
                                {t('All offers')}
                            </SelectItem>
                            {data.offers.map((offer) => (
                                <SelectItem
                                    key={offer.id}
                                    value={String(offer.id)}
                                >
                                    {offer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!data.publisher_view && (
                        <Select
                            value={
                                String(data.filters.publisher ?? '') ||
                                '__none__'
                            }
                            disabled={busy}
                            onValueChange={(value) =>
                                change({
                                    publisher:
                                        value === '__none__'
                                            ? null
                                            : Number(value),
                                })
                            }
                        >
                            <SelectTrigger
                                aria-label={t('Filter by publisher')}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">
                                    {t('All publishers')}
                                </SelectItem>
                                {data.publishers.map((publisher) => (
                                    <SelectItem
                                        key={publisher.id}
                                        value={String(publisher.id)}
                                    >
                                        {publisher.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                className="analytics-export"
                                disabled={busy}
                            >
                                <Download size={15} />
                                {t('Export')}
                                <ChevronDown size={14} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64">
                            <div className="grid gap-1 text-sm">
                                <strong className="px-2 py-1">
                                    {t('Export filtered analytics')}
                                </strong>
                                <a
                                    className="rounded px-2 py-2 hover:bg-surface-muted"
                                    href={exportUrl('csv')}
                                >
                                    {t('Current breakdown (.csv)')}
                                </a>
                                <a
                                    className="rounded px-2 py-2 hover:bg-surface-muted"
                                    href={exportUrl('csv', 'daily')}
                                >
                                    {t('Daily performance (.csv)')}
                                </a>
                                <a
                                    className="rounded px-2 py-2 hover:bg-surface-muted"
                                    href={exportUrl('xlsx')}
                                >
                                    {t('Full report (.xlsx)')}
                                </a>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            {error && !datesOpen && (
                <p role="alert" className="text-sm text-danger-ink">
                    {error}
                </p>
            )}
            {busy && (
                <p className="analytics-loading" role="status">
                    <LoaderCircle size={15} className="animate-spin" />
                    {t('Updating analytics…')}
                </p>
            )}
            <div className="analytics-summary">
                <dl className="analytics-kpis">
                    {[
                        ['Clicks', num(data.metrics.clicks)],
                        ['Approved conversions', num(data.metrics.conversions)],
                        ['Net approved sales', money(data.metrics.sales)],
                        [
                            'Net approved commissions',
                            money(data.metrics.commissions),
                        ],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt>{t(label)}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
                <dl className="analytics-ratios">
                    <div>
                        <dt>{t('Conversion rate')}</dt>
                        <dd>{num(data.metrics.conversion_rate, 2)}%</dd>
                    </div>
                    <span aria-hidden="true">·</span>
                    <div>
                        <dt>{t('Earnings per click')}</dt>
                        <dd>{money(data.metrics.earnings_per_click, 4)}</dd>
                    </div>
                </dl>
            </div>
            {data.pending > 0 && (
                <div className="analytics-notice" role="status">
                    <Info size={19} />
                    <span>
                        {t(
                            '{{count}} confirmed outcomes await financial review and are excluded from approved performance.',
                            { count: data.pending },
                        )}
                    </span>
                </div>
            )}
            <section
                className="analytics-chart-panel"
                aria-label={t('Daily approved conversions')}
            >
                <h3>{t('Daily approved conversions')}</h3>
                <AnalyticsChart days={data.days} />
                <p>{t('Refunds restate the original event date.')}</p>
            </section>
            <div
                className="analytics-breakdown-tabs"
                role="group"
                aria-label={t('Performance breakdown')}
            >
                {(
                    [
                        'offer',
                        ...(data.publisher_view ? [] : ['publisher']),
                    ] as ('offer' | 'publisher')[]
                ).map((key) => (
                    <button
                        key={key}
                        aria-pressed={group === key}
                        disabled={busy}
                        onClick={() => change({ group: key })}
                    >
                        {t(key === 'offer' ? 'By offer' : 'By publisher')}
                    </button>
                ))}
            </div>
            <div className="analytics-table-scroll">
                <table data-slot="analytics-table">
                    <caption className="sr-only">
                        {t(
                            group === 'offer'
                                ? 'Performance by offer'
                                : 'Performance by publisher',
                        )}
                    </caption>
                    <thead>
                        <tr>
                            {[
                                group === 'offer' ? 'Offer' : 'Publisher',
                                'Clicks',
                                'Approved conversions',
                                'Net approved sales',
                                'Net approved commissions',
                                'Conversion rate',
                            ].map((label) => (
                                <th scope="col" key={label}>
                                    {t(label)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <th scope="row">{row.name}</th>
                                <td>{num(row.clicks)}</td>
                                <td>{num(row.conversions)}</td>
                                <td>
                                    {row.purchases ? money(row.sales) : '—'}
                                </td>
                                <td>{money(row.commissions)}</td>
                                <td>
                                    {num(
                                        row.conversion_rate,
                                        row.conversion_rate ? 2 : 0,
                                    )}
                                    %
                                </td>
                            </tr>
                        ))}
                        {!rows.length && (
                            <tr>
                                <td colSpan={6} className="analytics-empty">
                                    {t(
                                        'No results for these filters. Try another offer, publisher or date range.',
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {!data.metrics.clicks && !data.metrics.conversions && (
                <p className="analytics-empty">
                    {t(
                        'No approved performance or clicks in this period. Results will appear as traffic is recorded and outcomes are approved.',
                    )}
                </p>
            )}
            <div className="analytics-notice">
                <Info size={19} />
                <span>
                    {t(
                        'Approved performance is not an available cash balance.',
                    )}
                </span>
            </div>
        </section>
    );
}

function AnalyticsChart({ days }: Pick<AnalyticsWorkspace, 'days'>) {
    const { t, i18n } = useTranslation();
    const container = useRef<HTMLDivElement>(null);
    const gradient = useId();
    const [width, setWidth] = useState(800);
    const [selected, setSelected] = useState<number | null>(null);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.max(240, entry.contentRect.width)),
        );
        if (container.current) observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    const date = (value: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
        }).format(new Date(`${value}T00:00:00Z`));
    const max = Math.max(1, ...days.map((day) => day.conversions));
    const raw = max / 5;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = Math.max(
        1,
        [1, 2, 5, 10].map((n) => n * magnitude).find((n) => n >= raw) ?? 1,
    );
    const top = Math.ceil(max / step) * step;
    const left = Math.max(30, String(top).length * 8 + 12);
    const x = (index: number) =>
        days.length === 1
            ? (width + left - 16) / 2
            : left + (index * (width - left - 16)) / (days.length - 1);
    const y = (value: number) => 12 + (1 - value / top) * 144;
    const points = days
        .map((day, i) => `${x(i)},${y(day.conversions)}`)
        .join(' ');
    const labelStep = Math.max(
        1,
        Math.ceil(days.length / Math.max(2, Math.floor(width / 95))),
    );
    return (
        <div ref={container} className="analytics-chart">
            <svg
                width="100%"
                height="190"
                viewBox={`0 0 ${width} 190`}
                role="img"
                aria-label={t(
                    'Daily approved conversions in the selected UTC date range',
                )}
            >
                <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stopColor="var(--primary)"
                            stopOpacity="0.25"
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--primary)"
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>
                {Array.from(
                    { length: Math.round(top / step) + 1 },
                    (_, i) => i * step,
                ).map((tick) => (
                    <g key={tick}>
                        <line
                            x1={left}
                            x2={width - 16}
                            y1={y(tick)}
                            y2={y(tick)}
                            stroke="var(--border)"
                        />
                        <text x={left - 10} y={y(tick) + 4} textAnchor="end">
                            {tick}
                        </text>
                    </g>
                ))}
                <polygon
                    points={`${x(0)},156 ${points} ${x(days.length - 1)},156`}
                    fill={`url(#${gradient})`}
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                />
                {days.length === 1 && (
                    <circle
                        cx={x(0)}
                        cy={y(days[0].conversions)}
                        r="4"
                        fill="var(--primary)"
                    />
                )}
                {days.map(
                    (day, i) =>
                        ((i % labelStep === 0 &&
                            (i === 0 ||
                                days.length - 1 - i >= labelStep / 2)) ||
                            i === days.length - 1) && (
                            <text
                                key={day.date}
                                x={x(i)}
                                y="179"
                                textAnchor={
                                    i === 0
                                        ? 'start'
                                        : i === days.length - 1
                                          ? 'end'
                                          : 'middle'
                                }
                            >
                                {date(day.date)}
                            </text>
                        ),
                )}
                {days.map((day, i) => (
                    <rect
                        key={day.date}
                        x={Math.max(
                            left,
                            x(i) - (width - left - 16) / days.length / 2,
                        )}
                        y="8"
                        width={(width - left - 16) / days.length}
                        height="150"
                        fill="transparent"
                        onMouseEnter={() => setSelected(i)}
                        onMouseLeave={() => setSelected(null)}
                        onClick={() => setSelected(i)}
                    >
                        <title>
                            {date(day.date)} UTC: {day.conversions}
                        </title>
                    </rect>
                ))}
                {selected !== null && days[selected] && (
                    <circle
                        cx={x(selected)}
                        cy={y(days[selected].conversions)}
                        r="4"
                        fill="var(--primary)"
                        pointerEvents="none"
                    />
                )}
            </svg>
            {selected !== null && days[selected] && (
                <div className="analytics-chart-tooltip" role="status">
                    {date(days[selected].date)} UTC ·{' '}
                    {days[selected].conversions} {t('approved conversions')}
                </div>
            )}
            <details className="analytics-chart-data">
                <summary>{t('View chart data')}</summary>
                <div className="analytics-table-scroll">
                    <table data-slot="analytics-table">
                        <thead>
                            <tr>
                                <th scope="col">{t('Date (UTC)')}</th>
                                <th scope="col">{t('Approved conversions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((day) => (
                                <tr key={day.date}>
                                    <th scope="row">{day.date}</th>
                                    <td>{day.conversions}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}
