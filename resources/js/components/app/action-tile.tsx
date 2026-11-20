import { Link } from '@inertiajs/react';
import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type ActionTileProps = {
    href: string;
    title: string;
    description?: React.ReactNode;
    icon: React.ReactNode;
    tone?: Tone;
    /** Small count pill on the right (only rendered when > 0). */
    count?: number;
    /** Accessible text for the count, e.g. "12 waiting". */
    countLabel?: string;
    className?: string;
};

/** Link card with a solid icon tile: the dashboard's quick actions. */
function ActionTile({
    href,
    title,
    description,
    icon,
    tone = 'brand',
    count,
    countLabel,
    className,
}: ActionTileProps) {
    return (
        <Link
            href={href}
            data-slot="action-tile"
            className={cn(
                'flex min-h-11 items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-ink shadow-card transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                className,
            )}
        >
            <IconTile size={40} tone={tone} variant="solid">
                {icon}
            </IconTile>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{title}</span>
                {description && (
                    <span className="text-xs text-ink-muted">
                        {description}
                    </span>
                )}
            </span>
            {count !== undefined && count > 0 && (
                <span
                    className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                        toneClasses[tone].soft,
                    )}
                >
                    <span aria-hidden="true">{count}</span>
                    <span className="sr-only">{countLabel ?? count}</span>
                </span>
            )}
        </Link>
    );
}

export { ActionTile };
