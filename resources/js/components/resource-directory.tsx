/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ResourceDirectory as Directory,
    type DirectoryAction,
    type DirectoryColumn,
} from '@/components/app/resource-directory';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type LegacyAction = {
    label: string;
    href?: (record: any) => string;
    onSelect: (record: any) => void;
    conditional?: (record: any) => boolean;
};

const IDENTITY_COLUMNS = [
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
];
const NUMERIC_COLUMNS = new Set([
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

/**
 * Adapter for pages that still describe their list with tanstack columns
 * (`CustomBaseTable presentation="cards"`). It renders the shared
 * ResourceDirectory: the first visible data columns, the action column's
 * `href` action as Details and the rest in the more-actions menu.
 * New pages should use `@/components/app/resource-directory` directly.
 */
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
    const name = (record: any): string =>
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

    const legacyActions = (record: any): LegacyAction[] =>
        table
            .getAllColumns()
            .flatMap(
                (c) =>
                    (c.columnDef.meta as { resourceActions?: LegacyAction[] })
                        ?.resourceActions || [],
            )
            .filter((a) => !a.conditional || a.conditional(record));

    const rows = table.getRowModel().rows;
    const byOriginal = new Map<any, Row<any>>(
        rows.map((row) => [row.original, row]),
    );
    const dataColumns = table
        .getAllLeafColumns()
        .filter(
            (c) =>
                c.getIsVisible() &&
                c.id !== 'select' &&
                !(c.columnDef.meta as { resourceActions?: unknown })
                    ?.resourceActions &&
                !IDENTITY_COLUMNS.includes(c.id),
        )
        .slice(0, 3);
    const headers = table.getFlatHeaders();
    const columns: DirectoryColumn<any>[] = dataColumns.map((column) => {
        const header = headers.find((h) => h.column.id === column.id);
        return {
            id: column.id,
            header: header
                ? flexRender(column.columnDef.header, header.getContext())
                : column.id,
            align: NUMERIC_COLUMNS.has(column.id) ? 'end' : 'start',
            cell: (record) => {
                const cell = byOriginal
                    .get(record)
                    ?.getVisibleCells()
                    .find((c) => c.column.id === column.id);
                return cell
                    ? flexRender(cell.column.columnDef.cell, cell.getContext())
                    : null;
            },
        };
    });
    const hasStatus = rows.some((row) => recordStatus(row.original));

    return (
        <Directory<any>
            label={typeof title === 'string' ? title : t('Records')}
            rows={rows.map((row) => row.original)}
            rowKey={(record) => byOriginal.get(record)?.id ?? name(record)}
            nameHeader={t('Name')}
            name={name}
            subtitle={(record) =>
                record.email ||
                record.owner_email ||
                record.user?.email ||
                record.network_name ||
                record.description
            }
            status={hasStatus ? recordStatus : undefined}
            columns={columns}
            href={(record) =>
                legacyActions(record)
                    .find((a) => a.href)
                    ?.href?.(record)
            }
            actions={(record) => {
                const all = legacyActions(record);
                const primary = all.find((a) => a.href);
                return all
                    .filter((a) => a !== primary)
                    .map(
                        (a): DirectoryAction<any> => ({
                            label: a.label,
                            onSelect: a.onSelect,
                        }),
                    );
            }}
            pagination={{ page, pageCount, onPageChange }}
            isLoading={isLoading}
            isError={isError}
        />
    );
}
