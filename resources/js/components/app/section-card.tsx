import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

type SectionCardProps = Omit<React.ComponentProps<'section'>, 'title'> & {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    tone?: Tone;
    /** Buttons or links on the right of the header. */
    action?: React.ReactNode;
    footer?: React.ReactNode;
    /** Heading level for the title (default h2). */
    headingLevel?: 2 | 3 | 4;
    /** Remove body padding (tables that run edge to edge). */
    flush?: boolean;
    bodyClassName?: string;
};

/** Card with an icon-tile header, a body and an optional footer. */
function SectionCard({
    title,
    description,
    icon,
    tone = 'brand',
    action,
    footer,
    headingLevel = 2,
    flush = false,
    bodyClassName,
    className,
    children,
    ...props
}: SectionCardProps) {
    const Heading = `h${headingLevel}` as 'h2';
    const titleId = React.useId();

    return (
        <section
            aria-labelledby={titleId}
            data-slot="section-card"
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface text-ink shadow-card',
                className,
            )}
            {...props}
        >
            <header className="flex flex-wrap items-center gap-3.5 px-[22px] pt-5 pb-4">
                {icon && (
                    <IconTile size={44} tone={tone}>
                        {icon}
                    </IconTile>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Heading
                        id={titleId}
                        className="text-base leading-snug font-bold text-ink"
                    >
                        {title}
                    </Heading>
                    {description && (
                        <p className="text-[13px] text-ink-muted">
                            {description}
                        </p>
                    )}
                </div>
                {action && (
                    <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">
                        {action}
                    </div>
                )}
            </header>
            <div
                data-slot="section-card-body"
                className={cn(
                    'min-w-0 flex-1',
                    !flush && 'px-[22px] pb-[22px]',
                    bodyClassName,
                )}
            >
                {children}
            </div>
            {footer && (
                <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-muted px-[22px] py-3.5">
                    {footer}
                </footer>
            )}
        </section>
    );
}

export { SectionCard, type SectionCardProps };
