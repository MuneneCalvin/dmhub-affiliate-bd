import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

type StepProgressProps = {
    /** 1-based current step. */
    current: number;
    total: number;
    /** Name of the current step, shown after the counter. */
    stepLabel?: string;
    className?: string;
};

/** Segmented progress bar for short linear flows ("Step 1 of 3"). */
function StepProgress({
    current,
    total,
    stepLabel,
    className,
}: StepProgressProps) {
    const { t } = useTranslation();
    const counter = t('Step {{current}} of {{total}}', { current, total });
    const text = stepLabel ? `${counter} · ${stepLabel}` : counter;

    return (
        <div
            data-slot="step-progress"
            className={cn('flex items-center gap-2', className)}
        >
            <div
                role="progressbar"
                aria-label={t('Progress')}
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={current}
                aria-valuetext={text}
                className="flex flex-1 items-center gap-2"
            >
                {Array.from({ length: total }, (_, index) => (
                    <span
                        key={index}
                        data-complete={index < current || undefined}
                        className={cn(
                            'h-1.5 flex-1 rounded-full',
                            index < current ? 'bg-brand' : 'bg-focus-halo',
                        )}
                    />
                ))}
            </div>
            <span className="ml-1.5 shrink-0 text-xs font-semibold text-ink-muted">
                {text}
            </span>
        </div>
    );
}

export { StepProgress };
