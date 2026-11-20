import * as React from 'react';

import { cn } from '@/lib/utils';

export type DetailRow = {
    label: React.ReactNode;
    value: React.ReactNode;
    /** Stable key when the label is not a string. */
    key?: string;
};

type DetailListProps = Omit<React.ComponentProps<'dl'>, 'children'> & {
    rows: (DetailRow | false | null | undefined | '' | 0)[];
    /** Width of the label column on wide screens. */
    labelWidth?: number;
};

const isEmpty = (value: React.ReactNode) =>
    value === null || value === undefined || value === '';

/**
 * Label/value pairs in two columns (stacked on phones). Empty values show a
 * dash so every row keeps its label.
 */
function DetailList({
    rows,
    labelWidth = 130,
    className,
    style,
    ...props
}: DetailListProps) {
    return (
        <dl
            data-slot="detail-list"
            className={cn(
                'grid grid-cols-1 gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[var(--detail-label)_minmax(0,1fr)] sm:gap-y-3',
                className,
            )}
            style={
                {
                    '--detail-label': `${labelWidth}px`,
                    ...style,
                } as React.CSSProperties
            }
            {...props}
        >
            {rows.filter(Boolean).map((row, index) => {
                const { label, value, key } = row as DetailRow;
                return (
                    <React.Fragment
                        key={key ?? (typeof label === 'string' ? label : index)}
                    >
                        <dt className="text-ink-muted max-sm:mt-2 max-sm:first:mt-0">
                            {label}
                        </dt>
                        <dd className="min-w-0 font-semibold [overflow-wrap:anywhere] text-ink">
                            {isEmpty(value) ? (
                                <span className="font-normal text-ink-muted">
                                    —
                                </span>
                            ) : (
                                value
                            )}
                        </dd>
                    </React.Fragment>
                );
            })}
        </dl>
    );
}

export { DetailList };
