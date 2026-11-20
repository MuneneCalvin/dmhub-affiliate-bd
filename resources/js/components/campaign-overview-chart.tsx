import type { CampaignOverview } from '@/types/campaign-overview';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function CampaignOverviewChart({
    days,
}: Pick<CampaignOverview, 'days'>) {
    const { t, i18n } = useTranslation();
    const container = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(800);
    const [selected, setSelected] = useState<number | null>(null);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
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
    // Integer, even ticks and a reserved label lane, including on narrow screens.
    const raw = max / 4;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = Math.max(
        1,
        [1, 2, 2.5, 5, 10].map((n) => n * magnitude).find((n) => n >= raw) ?? 1,
    );
    const top = (Math.floor(max / step) + 1) * step;
    const ticks = Array.from(
        { length: Math.round(top / step) + 1 },
        (_, i) => i * step,
    );
    const left = Math.max(34, String(top).length * 8 + 16);
    const right = 16;
    const height = 204;
    const x = (i: number) =>
        left + (i * (width - left - right)) / Math.max(1, days.length - 1);
    const y = (value: number) => 12 + (1 - value / top) * 148;
    const labelStep = width < 450 ? 10 : width < 700 ? 6 : 3;
    return (
        <div ref={container} className="campaign-chart">
            <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={t(
                    'Daily approved conversions, last 30 days in UTC',
                )}
            >
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={left}
                            x2={width - right}
                            y1={y(tick)}
                            y2={y(tick)}
                            stroke="var(--border)"
                        />
                        <text x={left - 10} y={y(tick) + 4} textAnchor="end">
                            {tick}
                        </text>
                    </g>
                ))}
                <polyline
                    points={days
                        .map((day, i) => `${x(i)},${y(day.conversions)}`)
                        .join(' ')}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                {days.map(
                    (day, i) =>
                        (i % labelStep === 0 || i === days.length - 1) && (
                            <g key={day.date}>
                                <text
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
                                <text
                                    x={x(i)}
                                    y="195"
                                    textAnchor={
                                        i === 0
                                            ? 'start'
                                            : i === days.length - 1
                                              ? 'end'
                                              : 'middle'
                                    }
                                >
                                    UTC
                                </text>
                            </g>
                        ),
                )}
                {days.map((day, i) => (
                    <rect
                        key={day.date}
                        x={x(i) - (width - left - right) / days.length / 2}
                        y="8"
                        width={(width - left - right) / days.length}
                        height="154"
                        fill="transparent"
                        onMouseEnter={() => setSelected(i)}
                        onMouseLeave={() => setSelected(null)}
                    >
                        <title>
                            {date(day.date)} UTC: {day.conversions}
                        </title>
                    </rect>
                ))}
                {selected !== null && (
                    <circle
                        cx={x(selected)}
                        cy={y(days[selected].conversions)}
                        r="4"
                        fill="var(--primary)"
                    />
                )}
            </svg>
            {selected !== null && (
                <div className="campaign-chart-tooltip" role="status">
                    {date(days[selected].date)} UTC ·{' '}
                    {days[selected].conversions} {t('approved conversions')}
                </div>
            )}
            <details className="campaign-chart-data">
                <summary>{t('View chart data')}</summary>
                <div className="campaign-data-scroll">
                    <table>
                        <caption>{t('Daily approved conversions')}</caption>
                        <thead>
                            <tr>
                                <th>{t('Date (UTC)')}</th>
                                <th>{t('Approved conversions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {days.map((day) => (
                                <tr key={day.date}>
                                    <td>{date(day.date)}</td>
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
