import * as React from 'react';

import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

type ProgressBarProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    value: number;
    max?: number;
    tone?: Tone;
    /** Accessible name, e.g. "Budget spent". */
    label: string;
    /** Visible caption under the bar ("62% of €10,000"). */
    caption?: React.ReactNode;
    size?: 'sm' | 'md';
};

/** Horizontal bar with `role="progressbar"`. */
function ProgressBar({
    value,
    max = 100,
    tone = 'brand',
    label,
    caption,
    size = 'md',
    className,
    ...props
}: ProgressBarProps) {
    const safe = clamp(value, max);
    const pct = max > 0 ? (safe / max) * 100 : 0;

    return (
        <div
            data-slot="progress-bar"
            className={cn('flex flex-col gap-1.5', className)}
            {...props}
        >
            <div
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={safe}
                className={cn(
                    'w-full overflow-hidden rounded-full bg-surface-tint',
                    size === 'md' ? 'h-2' : 'h-1.5',
                )}
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-300',
                        toneClasses[tone].fill,
                    )}
                    style={{ width: `${pct}%` }}
                />
            </div>
            {caption && (
                <span className="text-xs font-medium text-ink-muted">
                    {caption}
                </span>
            )}
        </div>
    );
}

const ringColour: Record<Tone, string> = {
    brand: 'var(--brand-base)',
    partners: 'var(--partners-base)',
    finance: 'var(--finance-base)',
    admin: 'var(--admin-base)',
    analytics: 'var(--analytics-base)',
    success: 'var(--success-dot)',
    warning: 'var(--warning-dot)',
    danger: 'var(--danger-dot)',
    info: 'var(--info-dot)',
    neutral: 'var(--neutral-dot)',
};

type ProgressRingProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    value: number;
    max?: number;
    tone?: Tone;
    /** Accessible name and the small caption under the value. */
    label: string;
    /** Centre text; defaults to the rounded percentage. */
    display?: React.ReactNode;
    size?: number;
    /** Hide the caption visually (it stays the accessible name). */
    hideLabel?: boolean;
};

/** Conic ring with the value and a label in the centre. */
function ProgressRing({
    value,
    max = 100,
    tone = 'brand',
    label,
    display,
    size = 132,
    hideLabel = false,
    className,
    style,
    ...props
}: ProgressRingProps) {
    const safe = clamp(value, max);
    const pct = max > 0 ? (safe / max) * 100 : 0;

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={safe}
            data-slot="progress-ring"
            className={cn(
                'relative grid shrink-0 place-items-center rounded-full',
                className,
            )}
            style={{
                width: size,
                height: size,
                background: `conic-gradient(${ringColour[tone]} ${pct}%, var(--surface-tint) 0)`,
                ...style,
            }}
            {...props}
        >
            <div
                className="flex flex-col items-center justify-center rounded-full bg-surface text-center"
                style={{ width: size - 24, height: size - 24 }}
            >
                <span className="text-2xl leading-none font-extrabold text-ink tabular-nums">
                    {display ?? `${Math.round(pct)}%`}
                </span>
                {!hideLabel && (
                    <span className="mt-1 max-w-[80%] text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}

export { ProgressBar, ProgressRing };
