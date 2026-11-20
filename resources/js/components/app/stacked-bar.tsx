import * as React from 'react';

import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type StackedBarSegment = {
    key: string;
    label: string;
    value: number;
    tone: Tone;
};

type StackedBarProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    segments: StackedBarSegment[];
    /** Accessible name prefix, e.g. "Campaigns by status". */
    label: string;
    /** Render the legend below the bar (default true). */
    legend?: boolean;
    /** `dark` for navy cards: translucent track and legend rows. */
    variant?: 'default' | 'dark';
    /** Legend in one column (narrow cards). */
    stacked?: boolean;
};

/**
 * Proportional bar of parts of a whole with a legend. The bar itself is an
 * image whose name lists every part, so the colours are never the only cue.
 */
function StackedBar({
    segments,
    label,
    legend = true,
    variant = 'default',
    stacked = false,
    className,
    ...props
}: StackedBarProps) {
    const visible = segments.filter((segment) => segment.value > 0);
    const description = segments
        .map((segment) => `${segment.value} ${segment.label}`)
        .join(', ');

    return (
        <div
            data-slot="stacked-bar"
            className={cn('flex flex-col gap-4', className)}
            {...props}
        >
            <div
                role="img"
                aria-label={`${label}: ${description}`}
                className={cn(
                    'flex h-3.5 gap-[3px] overflow-hidden rounded-full',
                    variant === 'dark' ? 'bg-white/10' : 'bg-surface-tint',
                )}
            >
                {visible.map((segment) => (
                    <div
                        key={segment.key}
                        className={cn('h-full', toneClasses[segment.tone].fill)}
                        style={{ flexGrow: segment.value, flexBasis: 0 }}
                    />
                ))}
            </div>
            {legend && (
                <ul
                    className={cn(
                        'grid grid-cols-1 gap-2.5',
                        !stacked && 'min-[420px]:grid-cols-2',
                    )}
                >
                    {segments.map((segment) => (
                        <li
                            key={segment.key}
                            className={cn(
                                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm',
                                variant === 'dark'
                                    ? 'bg-white/5 text-white'
                                    : 'bg-canvas',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'size-2.5 shrink-0 rounded-[3px]',
                                    toneClasses[segment.tone].fill,
                                )}
                            />
                            <span className="min-w-0 flex-1 truncate">
                                {segment.label}
                            </span>
                            <strong className="tabular-nums">
                                {segment.value}
                            </strong>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export { StackedBar };
