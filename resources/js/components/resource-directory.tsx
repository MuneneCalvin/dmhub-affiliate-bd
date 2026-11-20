/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table as DataTable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/dev/statusBadge';
import { Link, router } from '@inertiajs/react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    MoreHorizontal,
    Search,
    Users,
    X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Action = {
    label: string;
    href?: (record: any) => string;
    onSelect: (record: any) => void;
    conditional?: (record: any) => boolean;
};
export function ResourceDirectory({
    table,
    title,
    page,
    pageCount,
    onPageChange,
    isLoading,
    isError,
}: {
    table: Table<any>;
    title?: ReactNode;
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
    isError?: boolean;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const name = (record: any) =>
        record.business_name ||
        record.name ||
        [record.first_name, record.last_name].filter(Boolean).join(' ') ||
        record.user_name ||
        record.user?.user_name ||
        [record.user?.first_name, record.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        record.campaign_name ||
        record.offer_name ||
        record.network_name ||
        record.email ||
        record.title ||
        t('Overview');
    const recordStatus = (record: any) =>
        record.status || record.campaign_status || record.offer_status;
    const statuses = Array.from(
        new Set(
            table
                .getRowModel()
                .rows.map((row) => recordStatus(row.original))
                .filter(Boolean),
        ),
    ) as string[];
    const statusLabels: Record<string, string> = {
        A: 'Active',
        P: 'Pending',
        I: 'Inactive',
        R: 'Rejected',
        S: 'Suspended',
        D: 'Draft',
    };
    const actions = (row: Row<any>): Action[] =>
        table
            .getAllColumns()
            .flatMap(
                (c) =>
                    (c.columnDef.meta as { resourceActions?: Action[] })
                        ?.resourceActions || [],
            )
            .filter((a) => !a.conditional || a.conditional(row.original));
    const cells = (row: Row<any>) =>
        row
            .getVisibleCells()
            .filter(
                (c) =>
                    !(c.column.columnDef.meta as { resourceActions?: Action[] })
                        ?.resourceActions && c.column.id !== 'select',
            );
    const searchedRows = table.getRowModel().rows.filter((row) => {
        const text = Object.values(row.original)
            .filter((v) => typeof v === 'string' || typeof v === 'number')
            .join(' ')
            .toLowerCase();
        return text.includes(query.toLowerCase());
    });
    const rows = searchedRows.filter(
        (row) => status === 'all' || recordStatus(row.original) === status,
    );
    const numericColumns = new Set([
        'total_budget',
        'daily_budget',
        'minimum_payout',
        'total_clicks',
        'total_conversions',
        'amount',
        'commission_value_1',
        'commission_value_2',
        'available_budget',
        'spent_budget',
    ]);
    const headers = table.getFlatHeaders();
    return (
        <div className="directory space-y-4">
            <div className="directory-toolbar">
                {statuses.length > 0 && (
                    <div className="directory-filters" aria-label={t('Status')}>
                        {[
                            ['all', 'All records'],
                            ...statuses.map((value) => [
                                value,
                                statusLabels[value] || value,
                            ]),
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setStatus(value)}
                                aria-pressed={status === value}
                                className={`directory-filter ${status === value ? 'is-selected' : ''}`}
                            >
                                {t(label)}
                                <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                                    {value === 'all'
                                        ? searchedRows.length
                                        : searchedRows.filter(
                                              (row) =>
                                                  recordStatus(row.original) ===
                                                  value,
                                          ).length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <label className="directory-search flex w-full shrink-0 items-center gap-2 rounded-lg border border-input bg-card px-3 py-2.5 sm:w-72">
                    <Search className="size-4 text-muted-foreground" />
                    <input
                        aria-label={t('Search this page')}
                        placeholder={t('Search this page')}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    {query && (
                        <button
                            aria-label={t('Clear')}
                            onClick={() => setQuery('')}
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </label>
            </div>
            {isError ? (
                <div role="alert" className="directory-empty">
                    {t('Unable to load data. Please refresh and try again.')}
                </div>
            ) : isLoading ? (
                <div
                    className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                    role="status"
                >
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-lg bg-muted"
                        />
                    ))}
                    <span className="sr-only">{t('Loading')}</span>
                </div>
            ) : rows.length ? (
                <div className="directory-table">
                    <DataTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Name')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                {cells(rows[0])
                                    .filter(
                                        (cell) =>
                                            ![
                                                'first_name',
                                                'last_name',
                                                'name',
                                                'network_name',
                                                'business_name',
                                                'email',
                                                'owner_email',
                                                'status',
                                                'campaign_status',
                                                'offer_status',
                                            ].includes(cell.column.id),
                                    )
                                    .slice(0, 3)
                                    .map((cell) => {
                                        const header = headers.find(
                                            (h) =>
                                                h.column.id === cell.column.id,
                                        );
                                        return (
                                            <TableHead
                                                key={cell.column.id}
                                                className={
                                                    numericColumns.has(
                                                        cell.column.id,
                                                    )
                                                        ? 'text-right'
                                                        : undefined
                                                }
                                            >
                                                {header &&
                                                    flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                            </TableHead>
                                        );
                                    })}
                                <TableHead className="text-right">
                                    {t('Action(s)')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const rowActions = actions(row);
                                const primaryAction = rowActions.find(
                                    (action) => action.href,
                                );
                                const href = primaryAction?.href?.(
                                    row.original,
                                );
                                const secondaryActions = rowActions.filter(
                                    (action) => action !== primaryAction,
                                );
                                return (
                                    <TableRow
                                        key={row.id}
                                        className={
                                            href ? 'cursor-pointer' : undefined
                                        }
                                        onClick={(event) => {
                                            if (
                                                !href ||
                                                event.defaultPrevented ||
                                                event.metaKey ||
                                                event.ctrlKey ||
                                                event.shiftKey ||
                                                event.altKey
                                            )
                                                return;
                                            if (
                                                !(
                                                    event.target instanceof
                                                    Element
                                                ) ||
                                                !event.currentTarget.contains(
                                                    event.target,
                                                ) ||
                                                event.target.closest(
                                                    'a, button, input, select, textarea, [role="menuitem"]',
                                                )
                                            )
                                                return;
                                            router.visit(href);
                                        }}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="identity-tile"
                                                    aria-hidden="true"
                                                >
                                                    {String(name(row.original))
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    {href ? (
                                                        <Link
                                                            href={href}
                                                            className="block max-w-72 truncate text-left font-semibold hover:text-primary hover:underline"
                                                        >
                                                            {name(row.original)}
                                                        </Link>
                                                    ) : (
                                                        <span className="block max-w-72 truncate font-semibold">
                                                            {name(row.original)}
                                                        </span>
                                                    )}
                                                    <p className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground">
                                                        {row.original.email ||
                                                            row.original
                                                                .owner_email ||
                                                            row.original.user
                                                                ?.email ||
                                                            row.original
                                                                .network_name ||
                                                            row.original
                                                                .description}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {recordStatus(row.original) ? (
                                                <StatusBadge
                                                    status={recordStatus(
                                                        row.original,
                                                    )}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        {cells(row)
                                            .filter(
                                                (cell) =>
                                                    ![
                                                        'first_name',
                                                        'last_name',
                                                        'name',
                                                        'network_name',
                                                        'business_name',
                                                        'email',
                                                        'owner_email',
                                                        'status',
                                                        'campaign_status',
                                                        'offer_status',
                                                    ].includes(cell.column.id),
                                            )
                                            .slice(0, 3)
                                            .map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={
                                                        numericColumns.has(
                                                            cell.column.id,
                                                        )
                                                            ? 'text-right'
                                                            : undefined
                                                    }
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {href && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={href}
                                                            aria-label={`${t('View overview')}: ${name(row.original)}`}
                                                        >
                                                            {t('View')}
                                                            <ArrowUpRight className="size-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                {secondaryActions.length >
                                                    0 && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`${t('Action(s)')}: ${name(row.original)}`}
                                                                onClick={(
                                                                    event,
                                                                ) =>
                                                                    event.stopPropagation()
                                                                }
                                                            >
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            onClick={(event) =>
                                                                event.stopPropagation()
                                                            }
                                                        >
                                                            {secondaryActions.map(
                                                                (
                                                                    action,
                                                                    index,
                                                                ) => (
                                                                    <DropdownMenuItem
                                                                        key={
                                                                            index
                                                                        }
                                                                        onSelect={() =>
                                                                            action.onSelect(
                                                                                row.original,
                                                                            )
                                                                        }
                                                                    >
                                                                        {
                                                                            action.label
                                                                        }
                                                                    </DropdownMenuItem>
                                                                ),
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </DataTable>
                </div>
            ) : (
                <div className="directory-empty">
                    <Users className="mb-4 size-8 text-muted-foreground" />
                    <h3 className="text-xl font-medium">
                        {t('No matches yet')}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        {query || status !== 'all'
                            ? t('Try another search or clear your filters.')
                            : t(
                                  'New records will appear here as your workspace grows.',
                              )}
                    </p>
                    {(query || status !== 'all') && (
                        <Button
                            variant="outline"
                            className="mt-5"
                            onClick={() => {
                                setQuery('');
                                setStatus('all');
                            }}
                        >
                            {t('Clear filters')}
                        </Button>
                    )}
                </div>
            )}
            <p className="text-xs text-muted-foreground" role="status">
                {title} · {t('Showing')} {rows.length} {t('on this page')}
            </p>
            {pageCount > 1 && (
                <div className="flex items-center justify-between border-t pt-5">
                    <Button
                        variant="ghost"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <ArrowLeft />
                        {t('Previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {page} / {pageCount}
                    </span>
                    <Button
                        variant="ghost"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                    >
                        {t('Next')}
                        <ArrowRight />
                    </Button>
                </div>
            )}
        </div>
    );
}
