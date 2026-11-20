import { X } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type BulkBarProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    /** Number of selected rows; the bar renders nothing at 0. */
    count: number;
    /** Action buttons (use Button variant="success" / the bar's ghost style). */
    actions: React.ReactNode;
    onClear?: () => void;
};

/** Navy bar shown under a list while rows are selected. */
function BulkBar({
    count,
    actions,
    onClear,
    className,
    ...props
}: BulkBarProps) {
    const { t } = useTranslation();
    if (count <= 0) return null;
    return (
        <div
            role="region"
            aria-label={t('Bulk actions')}
            data-slot="bulk-bar"
            className={cn(
                'flex flex-wrap items-center gap-2.5 bg-sidebar px-[18px] py-3 text-white',
                className,
            )}
            {...props}
        >
            <strong className="flex-1" aria-live="polite">
                {t('{{count}} selected', { count })}
            </strong>
            {actions}
            {onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label={t('Clear selection')}
                    className="inline-flex size-10 items-center justify-center rounded-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}

/** Outline button for the navy bar. */
function BulkBarButton({
    className,
    ...props
}: React.ComponentProps<'button'>) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex h-10 items-center gap-2 rounded-[11px] border border-white/25 px-3.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50 [&_svg]:size-4',
                className,
            )}
            {...props}
        />
    );
}

export { BulkBar, BulkBarButton };
