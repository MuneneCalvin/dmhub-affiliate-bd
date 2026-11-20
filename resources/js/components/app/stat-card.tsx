import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import { ProgressBar } from '@/components/app/progress';
import { Sparkline } from '@/components/app/sparkline';
import { TrendChip } from '@/components/app/trend-chip';
import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type StatCardProps = Omit<React.ComponentProps<'div'>, 'title'> & {
    label: React.ReactNode;
    value: React.ReactNode;
    icon?: React.ReactNode;
    tone?: Tone;
    /** Percentage change shown as a trend chip. */
    trend?: number;
    trendInverse?: boolean;
    /** Values for a small sparkline. */
    sparkline?: number[];
    /** 0–100 progress with an accessible label. */
    progress?: { value: number; label: string; caption?: React.ReactNode };
    /** Secondary line under the value. */
    hint?: React.ReactNode;
    /** Small pill in the top-right corner ("2 pending"); used when there is no trend. */
    badge?: React.ReactNode;
    /** `solid` = coloured card (admin dashboard). */
    variant?: 'default' | 'solid';
};

/** Metric card: icon tile, label, big tabular value, optional extras. */
function StatCard({
    label,
    value,
    icon,
    tone = 'brand',
    trend,
    trendInverse,
    sparkline,
    progress,
    hint,
    badge,
    variant = 'default',
    className,
    ...props
}: StatCardProps) {
    const solid = variant === 'solid';

    return (
        <div
            data-slot="stat-card"
            data-variant={variant}
            className={cn(
                'relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-card p-5',
                solid
                    ? cn(toneClasses[tone].strong, 'shadow-card')
                    : 'border border-border bg-surface text-ink shadow-card',
                className,
            )}
            {...props}
        >
            <div className="flex items-start justify-between gap-3">
                {icon && (
                    <IconTile
                        size={44}
                        tone={tone}
                        className={solid ? 'bg-white/20 text-white' : undefined}
                    >
                        {icon}
                    </IconTile>
                )}
                {trend === undefined && badge && (
                    <span
                        data-slot="stat-card-badge"
                        className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                            solid
                                ? 'bg-black/20 text-white'
                                : toneClasses[tone].soft,
                        )}
                    >
                        {badge}
                    </span>
                )}
                {trend !== undefined && (
                    <TrendChip
                        value={trend}
                        inverse={trendInverse}
                        className={solid ? 'bg-black/20 text-white' : undefined}
                    />
                )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
                <span
                    className={cn(
                        'text-[13px] font-semibold',
                        solid ? 'text-white' : 'text-ink-muted',
                    )}
                >
                    {label}
                </span>
                <div className="flex items-end justify-between gap-3">
                    <span className="min-w-0 text-[28px] leading-tight font-extrabold tracking-[-0.01em] [overflow-wrap:anywhere] tabular-nums">
                        {value}
                    </span>
                    {sparkline && (
                        <Sparkline
                            values={sparkline}
                            tone={tone}
                            className={solid ? 'text-white' : undefined}
                        />
                    )}
                </div>
                {hint && (
                    <span
                        className={cn(
                            'text-xs font-medium',
                            solid ? 'text-white' : 'text-ink-muted',
                        )}
                    >
                        {hint}
                    </span>
                )}
            </div>
            {progress && (
                <ProgressBar
                    tone={tone}
                    value={progress.value}
                    label={progress.label}
                    caption={progress.caption}
                    size="sm"
                />
            )}
        </div>
    );
}

export { StatCard, type StatCardProps };
