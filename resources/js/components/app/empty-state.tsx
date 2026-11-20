import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type EmptyStateProps = Omit<React.ComponentProps<'div'>, 'title'> & {
    icon: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** One action (usually a soft Button). */
    action?: React.ReactNode;
    tone?: Tone;
    headingLevel?: 2 | 3 | 4;
};

/** 56px tile, a title, one sentence and one action. */
function EmptyState({
    icon,
    title,
    description,
    action,
    tone = 'brand',
    headingLevel = 3,
    className,
    ...props
}: EmptyStateProps) {
    const Heading = `h${headingLevel}` as 'h3';
    return (
        <div
            data-slot="empty-state"
            className={cn(
                'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
                className,
            )}
            {...props}
        >
            <IconTile size={56} tone={tone}>
                {icon}
            </IconTile>
            <Heading className="text-base font-bold text-ink">{title}</Heading>
            {description && (
                <p className="max-w-[320px] text-[13px] text-ink-muted">
                    {description}
                </p>
            )}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}

export { EmptyState };
