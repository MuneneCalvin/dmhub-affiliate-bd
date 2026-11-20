import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type ActivityItem = {
    id: string | number;
    message: React.ReactNode;
    /** Secondary line: category and relative time. */
    meta?: React.ReactNode;
    icon: React.ReactNode;
    tone?: Tone;
};

type ActivityTimelineProps = Omit<React.ComponentProps<'ol'>, 'children'> & {
    items: ActivityItem[];
};

/** Ordered list of recent events with a round soft icon per row. */
function ActivityTimeline({
    items,
    className,
    ...props
}: ActivityTimelineProps) {
    return (
        <ol
            data-slot="activity-timeline"
            className={cn('flex flex-col', className)}
            {...props}
        >
            {items.map((item) => (
                <li key={item.id} className="flex gap-3.5 py-2.5">
                    <IconTile
                        size={32}
                        tone={item.tone ?? 'brand'}
                        className="rounded-full"
                    >
                        {item.icon}
                    </IconTile>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm [overflow-wrap:anywhere]">
                            {item.message}
                        </span>
                        {item.meta && (
                            <span className="text-xs text-ink-muted">
                                {item.meta}
                            </span>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}

export { ActivityTimeline };
