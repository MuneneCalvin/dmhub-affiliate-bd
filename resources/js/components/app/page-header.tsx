import * as React from 'react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { type DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';

import { IconTile } from './icon-tile';

export type PageHeaderProps = Omit<React.ComponentProps<'header'>, 'title'> & {
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Trail above the title; the last crumb is the current page. */
    breadcrumbs?: BreadcrumbItem[];
    /** Optional 56px solid tile in the page's domain colour. */
    icon?: React.ReactNode;
    tone?: DomainTone;
    /** Buttons and links on the right; they wrap below the title when narrow. */
    actions?: React.ReactNode;
};

/** Page title block used at the top of every workspace page. */
function PageHeader({
    title,
    description,
    breadcrumbs = [],
    icon,
    tone = 'brand',
    actions,
    className,
    children,
    ...props
}: PageHeaderProps) {
    return (
        <header
            data-slot="page-header"
            className={cn(
                'page-heading flex flex-wrap items-end justify-between gap-5',
                className,
            )}
            {...props}
        >
            <div className="flex min-w-0 items-center gap-4">
                {icon && (
                    <IconTile
                        size={56}
                        tone={tone}
                        variant="solid"
                        className="shadow-card"
                    >
                        {icon}
                    </IconTile>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                    <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.02em] text-ink sm:text-[30px]">
                        {title}
                    </h1>
                    {description && (
                        <p className="max-w-3xl text-ink-muted">
                            {description}
                        </p>
                    )}
                    {children}
                </div>
            </div>
            {actions && (
                <div
                    data-slot="page-header-actions"
                    className="page-heading-actions flex max-w-full flex-wrap items-center gap-2.5"
                >
                    {actions}
                </div>
            )}
        </header>
    );
}

export { PageHeader };
