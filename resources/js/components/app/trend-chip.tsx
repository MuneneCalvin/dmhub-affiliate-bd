import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export type TrendDirection = 'up' | 'down' | 'neutral';

type TrendChipProps = Omit<React.ComponentProps<'span'>, 'children'> & {
    /** Percentage change; the sign sets the direction unless `direction` is given. */
    value: number;
    direction?: TrendDirection;
    /** Set when a decrease is good (e.g. fraud rate): flips the colours only. */
    inverse?: boolean;
};

/** Pill with an arrow and a percentage, green for good, red for bad. */
function TrendChip({
    value,
    direction,
    inverse = false,
    className,
    ...props
}: TrendChipProps) {
    const { t, i18n } = useTranslation();
    const dir: TrendDirection =
        direction ?? (value > 0 ? 'up' : value < 0 ? 'down' : 'neutral');
    const good = dir === 'neutral' ? null : (dir === 'up') !== inverse;
    const formatted = new Intl.NumberFormat(i18n.language || 'en', {
        maximumFractionDigits: 1,
    }).format(Math.abs(value));
    const Icon =
        dir === 'up'
            ? ArrowUpRight
            : dir === 'down'
              ? ArrowDownRight
              : ArrowRight;
    const spoken =
        dir === 'up'
            ? t('Increase')
            : dir === 'down'
              ? t('Decrease')
              : t('No change');

    return (
        <span
            data-slot="trend-chip"
            data-direction={dir}
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-[3px] text-xs font-bold tabular-nums',
                good === true && 'bg-success-soft text-success-ink',
                good === false && 'bg-danger-soft text-danger-ink',
                good === null && 'bg-neutral-soft text-neutral-ink',
                className,
            )}
            {...props}
        >
            <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
            <span className="sr-only">{spoken} </span>
            {formatted}%
        </span>
    );
}

export { TrendChip };
