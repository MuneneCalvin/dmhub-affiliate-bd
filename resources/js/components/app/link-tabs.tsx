import { Link } from '@inertiajs/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export type LinkTab = {
    key: string;
    label: React.ReactNode;
    href: string;
    icon?: React.ReactNode;
    count?: React.ReactNode;
};

/**
 * Page tabs that are links (each tab is its own URL, e.g. `?tab=funding`).
 * Looks like the underline `TabsList`; the current tab has aria-current.
 */
function LinkTabs({
    tabs,
    current,
    label,
    className,
}: {
    tabs: LinkTab[];
    current: string;
    /** Accessible name of the navigation landmark. */
    label: string;
    className?: string;
}) {
    return (
        <nav
            aria-label={label}
            data-slot="link-tabs"
            className={cn(
                'flex max-w-full items-center gap-1 overflow-x-auto border-b border-border',
                className,
            )}
        >
            {tabs.map((tab) => {
                const active = tab.key === current;
                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        preserveScroll
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'inline-flex h-11 shrink-0 items-center gap-2 rounded-t-[10px] px-3.5 text-sm font-semibold whitespace-nowrap text-ink-muted hover:text-ink [&_svg]:size-4 [&_svg]:shrink-0',
                            active &&
                                'font-bold text-brand-ink shadow-[inset_0_-3px_0_var(--brand-base)]',
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count != null && (
                            <span className="rounded-full bg-surface-tint px-2 py-0.5 text-[11px] font-bold tabular-nums">
                                {tab.count}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

export { LinkTabs };
