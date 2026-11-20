import * as React from 'react';

import { cn } from '@/lib/utils';

type BalanceHeroProps = Omit<React.ComponentProps<'section'>, 'title'> & {
    /** Heading, e.g. "Available to invoice". */
    title: React.ReactNode;
    /** The formatted headline amount. */
    value: React.ReactNode;
    /** Secondary line under the amount. */
    caption?: React.ReactNode;
    /** Buttons and links (white on navy). */
    actions?: React.ReactNode;
    /** Extra facts below the actions (payout method, minimum). */
    footer?: React.ReactNode;
};

/** Navy balance card with decorative shapes (earnings page). */
function BalanceHero({
    title,
    value,
    caption,
    actions,
    footer,
    className,
    ...props
}: BalanceHeroProps) {
    const titleId = React.useId();
    return (
        <section
            aria-labelledby={titleId}
            data-slot="balance-hero"
            className={cn(
                'relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-[22px] bg-sidebar p-[26px] text-white shadow-card dark:border dark:border-border',
                className,
            )}
            {...props}
        >
            <span
                aria-hidden="true"
                className="absolute -top-14 -right-14 size-[120px] rounded-full bg-finance opacity-90 sm:-top-10 sm:-right-10 sm:size-[180px]"
            />
            <span
                aria-hidden="true"
                className="absolute top-[70px] right-[90px] hidden size-[70px] rounded-full bg-admin sm:block"
            />
            <span
                aria-hidden="true"
                className="absolute top-[130px] right-[30px] hidden size-10 rounded-[12px] bg-brand sm:block"
            />
            <div className="relative flex flex-col gap-1">
                <h2
                    id={titleId}
                    className="text-sm font-semibold text-sidebar-text"
                >
                    {title}
                </h2>
                <strong className="text-[34px] leading-tight font-extrabold tracking-[-0.03em] tabular-nums sm:text-[44px]">
                    {value}
                </strong>
                {caption && (
                    <span className="text-[13px] text-sidebar-text">
                        {caption}
                    </span>
                )}
            </div>
            {actions && (
                <div className="relative flex flex-wrap gap-2.5">{actions}</div>
            )}
            {footer && (
                <div className="relative text-[13px] text-sidebar-text">
                    {footer}
                </div>
            )}
        </section>
    );
}

export { BalanceHero };
