import { Check, SearchX } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/app/empty-state';
import {
    groupPermissions,
    permissionLabel,
    type PermissionGroupMeta,
} from '@/lib/permissions';
import { cn } from '@/lib/utils';

export type PermissionOption = { id: number | string; name: string };

const groupStyles: Record<
    PermissionGroupMeta['tone'],
    { dot: string; on: string; box: string }
> = {
    brand: {
        dot: 'bg-brand',
        on: 'has-[:checked]:bg-brand-soft',
        box: 'peer-checked:border-brand peer-checked:bg-brand',
    },
    partners: {
        dot: 'bg-partners',
        on: 'has-[:checked]:bg-partners-soft',
        box: 'peer-checked:border-partners peer-checked:bg-partners',
    },
    finance: {
        dot: 'bg-finance',
        on: 'has-[:checked]:bg-finance-soft',
        box: 'peer-checked:border-finance peer-checked:bg-finance',
    },
    admin: {
        dot: 'bg-admin',
        on: 'has-[:checked]:bg-admin-soft',
        box: 'peer-checked:border-admin peer-checked:bg-admin',
    },
    analytics: {
        dot: 'bg-analytics',
        on: 'has-[:checked]:bg-analytics-soft',
        box: 'peer-checked:border-analytics peer-checked:bg-analytics',
    },
    neutral: {
        dot: 'bg-neutral-dot',
        on: 'has-[:checked]:bg-neutral-soft',
        box: 'peer-checked:border-neutral-dot peer-checked:bg-neutral-dot',
    },
};

type PermissionGridProps = {
    permissions: PermissionOption[];
    /** Ids of the permissions that are on. */
    value: (number | string)[];
    onValueChange: (value: (number | string)[]) => void;
    /** Filter by label or code (case-insensitive). */
    query?: string;
    disabled?: boolean;
    /** Heading level of the group names (default h3). */
    headingLevel?: 3 | 4;
    className?: string;
};

/**
 * Permissions grouped by domain as checkbox tiles, with an "x of y on" count
 * per group. Native checkboxes, so each tile is a labelled form control.
 */
function PermissionGrid({
    permissions,
    value,
    onValueChange,
    query = '',
    disabled,
    headingLevel = 3,
    className,
}: PermissionGridProps) {
    const { t } = useTranslation();
    const idPrefix = React.useId();
    const selected = new Set(value.map(String));
    const needle = query.trim().toLowerCase();
    const Heading = `h${headingLevel}` as 'h3';
    const groups = groupPermissions(permissions)
        .map((group) => ({
            ...group,
            visible: group.items.filter(
                (item) =>
                    !needle ||
                    item.name.toLowerCase().includes(needle) ||
                    t(permissionLabel(item.name))
                        .toLowerCase()
                        .includes(needle),
            ),
            on: group.items.filter((item) => selected.has(String(item.id)))
                .length,
        }))
        .filter((group) => group.visible.length > 0);

    const toggle = (id: number | string, on: boolean) =>
        onValueChange(
            on
                ? [...value, id]
                : value.filter((item) => String(item) !== String(id)),
        );

    if (!groups.length) {
        return (
            <EmptyState
                icon={<SearchX />}
                tone="neutral"
                title={t('No permissions found')}
                description={t('Try a different search term.')}
            />
        );
    }

    return (
        <div
            data-slot="permission-grid"
            className={cn('flex flex-col gap-5', className)}
        >
            {groups.map((group) => {
                const style = groupStyles[group.tone];
                const headingId = `${idPrefix}-${group.key}`;
                return (
                    <div
                        key={group.key}
                        role="group"
                        aria-labelledby={headingId}
                        data-group={group.key}
                        className="flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2.5">
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'size-2.5 shrink-0 rounded-[3px]',
                                    style.dot,
                                )}
                            />
                            <Heading
                                id={headingId}
                                className="flex-1 text-sm font-bold text-ink"
                            >
                                {t(group.title)}
                            </Heading>
                            <span
                                data-slot="permission-group-count"
                                className="text-xs text-ink-muted tabular-nums"
                            >
                                {t('{{on}} of {{total}} on', {
                                    on: group.on,
                                    total: group.items.length,
                                })}
                            </span>
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                            {group.visible.map((item) => {
                                const id = `${idPrefix}-p${item.id}`;
                                return (
                                    <label
                                        key={item.id}
                                        htmlFor={id}
                                        title={item.name}
                                        className={cn(
                                            'relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-[13px] font-semibold text-ink-muted transition-colors',
                                            'has-[:checked]:border-transparent has-[:checked]:text-ink',
                                            'has-[:focus-visible]:shadow-[0_0_0_4px_var(--focus-halo)]',
                                            'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
                                            style.on,
                                        )}
                                    >
                                        <input
                                            id={id}
                                            type="checkbox"
                                            className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0 disabled:cursor-not-allowed"
                                            checked={selected.has(
                                                String(item.id),
                                            )}
                                            disabled={disabled}
                                            onChange={(event) =>
                                                toggle(
                                                    item.id,
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'pointer-events-none flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 border-border-strong bg-surface text-transparent peer-checked:text-white',
                                                style.box,
                                            )}
                                        >
                                            <Check
                                                className="size-[13px]"
                                                strokeWidth={3}
                                            />
                                        </span>
                                        <span className="pointer-events-none min-w-0 [overflow-wrap:anywhere]">
                                            {t(permissionLabel(item.name))}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export { PermissionGrid };
