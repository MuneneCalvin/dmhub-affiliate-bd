import * as React from 'react';

import { type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

import { IconTile } from './icon-tile';

type StatePanelProps = Omit<React.ComponentProps<'section'>, 'title'> & {
    /** Icon (or short text such as "403") for the 96px tile. */
    icon: React.ReactNode;
    tone?: Tone;
    /** Tile style: soft for information, solid for errors on the navy card. */
    tileVariant?: 'soft' | 'solid';
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Shown above the title, e.g. a StatusBadge. */
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    /** `inverse` = navy card with white text (403). */
    variant?: 'default' | 'inverse';
    headingLevel?: 1 | 2;
};

/**
 * Full-page state card: big icon tile, title, one or two sentences, actions.
 * Used for waiting approval, verify email and 403.
 */
function StatePanel({
    icon,
    tone = 'brand',
    tileVariant = 'soft',
    title,
    description,
    badge,
    actions,
    variant = 'default',
    headingLevel = 1,
    className,
    children,
    ...props
}: StatePanelProps) {
    const titleId = React.useId();
    const Heading = headingLevel === 1 ? 'h1' : 'h2';
    const inverse = variant === 'inverse';

    return (
        <section
            aria-labelledby={titleId}
            data-slot="state-panel"
            data-variant={variant}
            className={cn(
                'relative flex flex-col items-start gap-[22px] overflow-hidden rounded-[24px] p-7 sm:flex-row sm:items-center',
                inverse
                    ? 'bg-sidebar text-white'
                    : 'border border-border bg-surface text-ink shadow-card',
                className,
            )}
            {...props}
        >
            {inverse && (
                <span
                    aria-hidden="true"
                    className="absolute -right-[40px] -bottom-[84px] size-[140px] rounded-full bg-admin opacity-80"
                />
            )}
            <IconTile
                size={96}
                tone={tone}
                variant={tileVariant}
                className="relative"
            >
                {icon}
            </IconTile>
            <div className="relative flex min-w-0 flex-col gap-2">
                {badge && <div className="self-start">{badge}</div>}
                <Heading
                    id={titleId}
                    className="text-[22px] leading-tight font-extrabold"
                >
                    {title}
                </Heading>
                {description && (
                    <div
                        className={
                            inverse ? 'text-sidebar-text' : 'text-ink-muted'
                        }
                    >
                        {description}
                    </div>
                )}
                {children}
                {actions && (
                    <div className="mt-1 flex flex-wrap items-center gap-2.5">
                        {actions}
                    </div>
                )}
            </div>
        </section>
    );
}

export { StatePanel };
