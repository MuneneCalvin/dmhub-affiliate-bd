import * as React from 'react';

import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type MetricTileProps = Omit<React.ComponentProps<'div'>, 'title'> & {
    label: React.ReactNode;
    value: React.ReactNode;
    tone?: Tone;
};

/** Compact tinted tile (label + value) used inside cards. */
function MetricTile({
    label,
    value,
    tone = 'brand',
    className,
    ...props
}: MetricTileProps) {
    return (
        <div
            data-slot="metric-tile"
            data-tone={tone}
            className={cn(
                'flex min-w-0 flex-col gap-1 rounded-[14px] px-4 py-3',
                toneClasses[tone].soft,
                className,
            )}
            {...props}
        >
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase">
                {label}
            </span>
            <span className="text-lg leading-tight font-extrabold [overflow-wrap:anywhere] tabular-nums">
                {value}
            </span>
        </div>
    );
}

export { MetricTile };
