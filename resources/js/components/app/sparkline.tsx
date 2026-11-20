import * as React from 'react';

import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type SparklineProps = Omit<React.ComponentProps<'svg'>, 'values'> & {
    values: number[];
    tone?: Tone;
    width?: number;
    height?: number;
};

/** Small decorative trend line. Pair it with the real value as text. */
function Sparkline({
    values,
    tone = 'brand',
    width = 96,
    height = 32,
    className,
    ...props
}: SparklineProps) {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = width / (values.length - 1);
    const points = values
        .map((v, i) => {
            const x = i * step;
            const y = height - 2 - ((v - min) / span) * (height - 4);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg
            data-slot="sparkline"
            aria-hidden="true"
            focusable="false"
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            preserveAspectRatio="none"
            className={cn(
                'shrink-0 overflow-visible',
                toneClasses[tone].text,
                className,
            )}
            {...props}
        >
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export { Sparkline };
