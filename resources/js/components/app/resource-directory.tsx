import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Eye,
    MoreHorizontal,
    Search,
    Users,
    X,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { type DomainTone, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

import { EmptyState } from './empty-state';
import { IconTile } from './icon-tile';
import { IdentityCell } from './identity-cell';

export type DirectoryColumn<T> = {
    id: string;
    header: React.ReactNode;
    cell: (row: T) => React.ReactNode;
    align?: 'start' | 'end';
    className?: string;
};

export type DirectoryAction<T> = {
    label: string;
    onSelect: (row: T) => void;
    icon?: React.ReactNode;
    tone?: Tone;
    destructive?: boolean;
    /** Hide the action for this row (e.g. "Activate" on an active record). */
    hidden?: (row: T) => boolean;
};

export type DirectoryStatusTile = {
    /** `all` shows every row; other values are compared with `status(row)`. */
    value: string;
    label: string;
    /** Count from the server (across all pages). */
    count?: number | null;
    tone: Tone;
    icon: React.ReactNode;
};

export type DirectoryPagination = {
    page: number;
    pageCount: number;
    total?: number | null;
    from?: number | null;
    to?: number | null;
    onPageChange: (page: number) => void;
};

export type ResourceDirectoryProps<T> = {
    /** Accessible name of the table card, e.g. "Advertiser list". */
    label: string;
    rows: T[];
    rowKey: (row: T) => string | number;
    /** Header of the identity (first) column. */
    nameHeader: string;
    name: (row: T) => string;
    subtitle?: (row: T) => React.ReactNode;
    logoUrl?: (row: T) => string | null | undefined;
    /** Status code or keyword shown as a StatusBadge; also used by the tiles. */
    status?: (row: T) => string | null | undefined;
    /** Overrides the badge label (e.g. "Deactivated" for a raw code). */
    statusLabel?: (row: T) => string | undefined;
    columns?: DirectoryColumn<T>[];
    /** Details page; also makes the row and the name clickable. */
    href?: (row: T) => string | null | undefined;
    actions?: (row: T) => DirectoryAction<T>[];
    statusTiles?: DirectoryStatusTile[];
    /** Active tile from the server (e.g. the `status` query parameter). */
    statusValue?: string;
    /** Called when a tile is chosen; use it to reload the list from the server. */
    onStatusChange?: (value: string) => void;
    /** Buttons on the right of the toolbar (Filters, Export). */
    toolbar?: React.ReactNode;
    /** Title on the left of the toolbar (e.g. an icon tile and an h2). */
    heading?: React.ReactNode;
    searchable?: boolean;
    pagination?: DirectoryPagination;
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
    tone?: DomainTone;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: React.ReactNode;
    className?: string;
};

function searchableText(row: unknown, extra: string[]): string {
    const values =
        row && typeof row === 'object'
            ? Object.values(row as Record<string, unknown>).filter(
                  (v) => typeof v === 'string' || typeof v === 'number',
              )
            : [];
    return [...extra, ...values].join(' ').toLowerCase();
}

/** Page numbers with gaps: 1 … 4 5 6 … 12. */
export function pageWindow(page: number, pageCount: number): (number | null)[] {
    if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const pages = new Set([1, pageCount, page - 1, page, page + 1]);
    const sorted = [...pages]
        .filter((p) => p >= 1 && p <= pageCount)
        .sort((a, b) => a - b);
    const out: (number | null)[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
        out.push(p);
    });
    return out;
}

export function DirectoryPager({
    page,
    pageCount,
    onPageChange,
}: Omit<DirectoryPagination, 'total' | 'from' | 'to'>) {
    const { t } = useTranslation();
    if (pageCount <= 1) return null;
    const pageButton =
        'inline-flex size-10 items-center justify-center rounded-[11px] text-sm font-semibold tabular-nums';
    return (
        <nav aria-label={t('Pagination')} className="flex flex-wrap gap-1.5">
            <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={t('Previous page')}
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                <ChevronLeft />
            </Button>
            {pageWindow(page, pageCount).map((p, i) =>
                p === null ? (
                    <span
                        key={`gap-${i}`}
                        aria-hidden="true"
                        className={cn(pageButton, 'text-ink-muted')}
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        aria-label={t('Page {{page}}', { page: p })}
                        aria-current={p === page ? 'page' : undefined}
                        onClick={() => p !== page && onPageChange(p)}
                        className={cn(
                            pageButton,
                            p === page
                                ? 'bg-brand font-bold text-white'
                                : 'text-ink hover:bg-surface-tint',
                        )}
                    >
                        {p}
                    </button>
                ),
            )}
            <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label={t('Next page')}
                disabled={page >= pageCount}
                onClick={() => onPageChange(page + 1)}
            >
                <ChevronRight />
            </Button>
        </nav>
    );
}

/** Status summary tiles that double as filters (one is always pressed). */
export function StatusTiles({
    tiles,
    value,
    onChange,
    label,
}: {
    tiles: DirectoryStatusTile[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
}) {
    const { t } = useTranslation();
    return (
        <section
            aria-label={label ?? t('Filter by status')}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5"
        >
            {tiles.map((tile) => {
                const pressed = tile.value === value;
                return (
                    <button
                        key={tile.value}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => onChange(tile.value)}
                        className={cn(
                            'flex min-h-[72px] items-center gap-3.5 rounded-2xl border bg-surface p-4 text-left text-ink transition-[border-color,box-shadow]',
                            pressed
                                ? 'border-2 border-brand p-[15px] shadow-[0_0_0_4px_var(--brand-soft)]'
                                : 'border-border hover:border-border-strong',
                        )}
                    >
                        <IconTile size={40} tone={tile.tone}>
                            {tile.icon}
                        </IconTile>
                        <span className="flex min-w-0 flex-col">
                            <span className="text-[13px] text-ink-muted">
                                {tile.label}
                            </span>
                            <strong className="text-[22px] leading-tight font-extrabold tabular-nums">
                                {tile.count ?? '—'}
                            </strong>
                        </span>
                    </button>
                );
            })}
        </section>
    );
}

/**
 * The list-of-records pattern: status tiles, a table card with a toolbar,
 * identity first column, status badges, a Details link + more-actions menu,
 * and a footer with "Showing x–y of n" and pagination.
 *
 * The server paginates (and may filter by status); the search box only
 * filters the rows on this page.
 */
export function ResourceDirectory<T>({
    label,
    rows,
    rowKey,
    nameHeader,
    name,
    subtitle,
    logoUrl,
    status,
    statusLabel,
    columns = [],
    href,
    actions,
    statusTiles,
    statusValue = 'all',
    onStatusChange,
    toolbar,
    heading,
    searchable = true,
    pagination,
    isLoading,
    isError,
    onRetry,
    tone = 'brand',
    emptyTitle,
    emptyDescription,
    emptyAction,
    className,
}: ResourceDirectoryProps<T>) {
    const { t } = useTranslation();
    const [query, setQuery] = React.useState('');
    const [activeStatus, setActiveStatus] = React.useState(statusValue);
    const [syncedStatus, setSyncedStatus] = React.useState(statusValue);
    if (syncedStatus !== statusValue) {
        // The server answered with another filter (e.g. back navigation).
        setSyncedStatus(statusValue);
        setActiveStatus(statusValue);
    }

    const chooseStatus = (value: string) => {
        setActiveStatus(value);
        onStatusChange?.(value);
    };

    const needle = query.trim().toLowerCase();
    const visible = rows.filter((row) => {
        if (
            status &&
            activeStatus !== 'all' &&
            (status(row) ?? '') !== activeStatus
        ) {
            return false;
        }
        if (!needle) return true;
        const sub = subtitle?.(row);
        return searchableText(row, [
            name(row),
            typeof sub === 'string' ? sub : '',
        ]).includes(needle);
    });
    const filtered = needle !== '' || activeStatus !== 'all';
    const hasActions = Boolean(href || actions);
    const colCount =
        1 + (status ? 1 : 0) + columns.length + (hasActions ? 1 : 0);

    const showing = (() => {
        if (needle) {
            return t('{{count}} matches on this page', {
                count: visible.length,
            });
        }
        if (pagination?.total != null && pagination.from != null) {
            return t('Showing {{from}}–{{to}} of {{total}}', {
                from: pagination.from,
                to: pagination.to ?? pagination.from,
                total: pagination.total,
            });
        }
        return t('Showing {{count}} on this page', { count: visible.length });
    })();

    return (
        <div
            data-slot="resource-directory"
            className={cn('flex flex-col gap-6', className)}
        >
            {statusTiles && statusTiles.length > 0 && (
                <StatusTiles
                    tiles={statusTiles}
                    value={activeStatus}
                    onChange={chooseStatus}
                />
            )}
            <section
                aria-label={label}
                className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
            >
                {(searchable || toolbar || heading) && (
                    <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-[18px] py-4">
                        {heading && (
                            <div
                                data-slot="resource-directory-heading"
                                className="flex min-w-0 items-center gap-2.5"
                            >
                                {heading}
                            </div>
                        )}
                        {searchable && (
                            <label className="flex h-11 max-w-[380px] min-w-0 flex-[1_1_260px] items-center gap-2.5 rounded-control border border-border-strong bg-surface-muted px-3.5 focus-within:border-brand">
                                <Search
                                    className="size-[18px] shrink-0 text-brand"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    aria-label={t('Search this page')}
                                    placeholder={t('Search this page')}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        aria-label={t('Clear search')}
                                        onClick={() => setQuery('')}
                                        className="-mr-2 inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-tint"
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </label>
                        )}
                        <span className="flex-1" />
                        {toolbar}
                    </div>
                )}

                {isError ? (
                    <div role="alert">
                        <EmptyState
                            icon={<AlertTriangle />}
                            tone="danger"
                            title={t('Unable to load data')}
                            description={t('Please refresh and try again.')}
                            action={
                                onRetry && (
                                    <Button
                                        variant="secondary"
                                        onClick={onRetry}
                                    >
                                        {t('Try again')}
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : !isLoading && visible.length === 0 ? (
                    <EmptyState
                        icon={<Users />}
                        tone={tone}
                        title={
                            filtered
                                ? t('No matches')
                                : (emptyTitle ?? t('Nothing here yet'))
                        }
                        description={
                            filtered
                                ? t('Try another search or clear your filters.')
                                : (emptyDescription ??
                                  t(
                                      'New records will appear here as your workspace grows.',
                                  ))
                        }
                        action={
                            filtered ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setQuery('');
                                        if (activeStatus !== 'all') {
                                            chooseStatus('all');
                                        }
                                    }}
                                >
                                    {t('Clear filters')}
                                </Button>
                            ) : (
                                emptyAction
                            )
                        }
                    />
                ) : (
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-[18px]">
                                    {nameHeader}
                                </TableHead>
                                {status && <TableHead>{t('Status')}</TableHead>}
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.id}
                                        className={cn(
                                            column.align === 'end' &&
                                                'text-right',
                                        )}
                                    >
                                        {column.header}
                                    </TableHead>
                                ))}
                                {hasActions && (
                                    <TableHead className="pr-[18px] text-right">
                                        {t('Actions')}
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={colCount}
                                        className="p-0"
                                    >
                                        <div
                                            role="status"
                                            className="flex flex-col gap-3 p-[18px]"
                                        >
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-3"
                                                >
                                                    <Skeleton className="size-10 rounded-[12px]" />
                                                    <Skeleton className="h-4 flex-1" />
                                                </div>
                                            ))}
                                            <span className="sr-only">
                                                {t('Loading')}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visible.map((row) => (
                                    <DirectoryRow
                                        key={rowKey(row)}
                                        row={row}
                                        name={name(row)}
                                        subtitle={subtitle?.(row)}
                                        logoUrl={logoUrl?.(row)}
                                        status={status?.(row)}
                                        hasStatus={Boolean(status)}
                                        statusLabel={statusLabel?.(row)}
                                        columns={columns}
                                        href={href?.(row) ?? undefined}
                                        actions={(actions?.(row) ?? []).filter(
                                            (a) => !a.hidden?.(row),
                                        )}
                                        hasActions={hasActions}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-3.5">
                    <span role="status" className="text-[13px] text-ink-muted">
                        {showing}
                    </span>
                    {pagination && (
                        <DirectoryPager
                            page={pagination.page}
                            pageCount={pagination.pageCount}
                            onPageChange={pagination.onPageChange}
                        />
                    )}
                </div>
            </section>
        </div>
    );
}

function DirectoryRow<T>({
    row,
    name,
    subtitle,
    logoUrl,
    status,
    hasStatus,
    statusLabel,
    columns,
    href,
    actions,
    hasActions,
}: {
    row: T;
    name: string;
    subtitle?: React.ReactNode;
    logoUrl?: string | null;
    status?: string | null;
    hasStatus: boolean;
    statusLabel?: string;
    columns: DirectoryColumn<T>[];
    href?: string;
    actions: DirectoryAction<T>[];
    hasActions: boolean;
}) {
    const { t } = useTranslation();
    return (
        <TableRow
            className={href ? 'cursor-pointer' : undefined}
            onClick={(event) => {
                if (
                    !href ||
                    event.defaultPrevented ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    !(event.target instanceof Element) ||
                    event.target.closest(
                        'a, button, input, select, textarea, [role="menuitem"]',
                    )
                ) {
                    return;
                }
                router.visit(href);
            }}
        >
            <TableCell className="pl-[18px]">
                <IdentityCell
                    name={name}
                    subtitle={subtitle}
                    logoUrl={logoUrl}
                    renderName={
                        href
                            ? (label) => (
                                  <Link
                                      href={href}
                                      className="hover:text-brand-ink hover:underline"
                                  >
                                      {label}
                                  </Link>
                              )
                            : undefined
                    }
                />
            </TableCell>
            {hasStatus && (
                <TableCell>
                    {status ? (
                        <StatusBadge status={status} label={statusLabel} />
                    ) : (
                        <span className="text-ink-muted">—</span>
                    )}
                </TableCell>
            )}
            {columns.map((column) => (
                <TableCell
                    key={column.id}
                    className={cn(
                        column.align === 'end' && 'text-right tabular-nums',
                        column.className,
                    )}
                >
                    {column.cell(row)}
                </TableCell>
            ))}
            {hasActions && (
                <TableCell className="pr-[18px] text-right">
                    <div className="inline-flex items-center gap-1.5">
                        {href && (
                            <Button
                                variant="soft"
                                size="sm"
                                asChild
                                className="h-10 px-3 text-[13px]"
                            >
                                <Link
                                    href={href}
                                    aria-label={t('Details for {{name}}', {
                                        name,
                                    })}
                                >
                                    <Eye aria-hidden="true" />
                                    {t('Details')}
                                </Link>
                            </Button>
                        )}
                        {actions.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="secondary"
                                        size="icon-sm"
                                        aria-label={t(
                                            'More actions for {{name}}',
                                            { name },
                                        )}
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {actions.map((action) => (
                                        <DropdownMenuItem
                                            key={action.label}
                                            icon={action.icon}
                                            tone={action.tone}
                                            variant={
                                                action.destructive
                                                    ? 'destructive'
                                                    : undefined
                                            }
                                            onSelect={() =>
                                                action.onSelect(row)
                                            }
                                        >
                                            {action.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}

/** A small text cell: muted, tabular. */
export function MutedCell({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-ink-muted tabular-nums">{children ?? '—'}</span>
    );
}

/** Icon tile + h2 for the `heading` slot of a ResourceDirectory. */
export function DirectoryHeading({
    icon,
    tone = 'brand',
    title,
    description,
}: {
    icon: React.ReactNode;
    tone?: Tone;
    title: React.ReactNode;
    description?: React.ReactNode;
}) {
    return (
        <>
            <IconTile size={32} tone={tone}>
                {icon}
            </IconTile>
            <span className="flex min-w-0 flex-col">
                <h2 className="text-base font-bold text-ink">{title}</h2>
                {description && (
                    <span className="text-[13px] text-ink-muted">
                        {description}
                    </span>
                )}
            </span>
        </>
    );
}
