import { Check } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/app/progress';
import { cn } from '@/lib/utils';

export type StepItem = {
    id: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
};

type StepperProps = Omit<React.ComponentProps<'nav'>, 'children'> & {
    steps: StepItem[];
    /** Index of the current step. Earlier steps are complete. */
    current: number;
    /** Accessible name for the step list. */
    label: string;
    /** Optional click handler; steps become buttons. */
    onStepSelect?: (index: number) => void;
    /** Allow selecting steps after the current one. */
    allowForward?: boolean;
    showProgress?: boolean;
};

/** Vertical wizard steps with icon tiles and a progress bar. */
function Stepper({
    steps,
    current,
    label,
    onStepSelect,
    allowForward = false,
    showProgress = true,
    className,
    ...props
}: StepperProps) {
    const { t } = useTranslation();
    const completeCount = Math.min(Math.max(current, 0), steps.length);

    return (
        <nav
            aria-label={label}
            data-slot="stepper"
            className={cn('flex flex-col gap-4', className)}
            {...props}
        >
            {showProgress && (
                <ProgressBar
                    value={completeCount}
                    max={steps.length}
                    label={t('Progress')}
                    caption={t('Step {{current}} of {{total}}', {
                        current: Math.min(current + 1, steps.length),
                        total: steps.length,
                    })}
                    size="sm"
                />
            )}
            <ol className="flex flex-col gap-1">
                {steps.map((step, index) => {
                    const state =
                        index < current
                            ? 'complete'
                            : index === current
                              ? 'current'
                              : 'upcoming';
                    const selectable =
                        onStepSelect &&
                        index !== current &&
                        (index < current || allowForward);
                    const body = (
                        <>
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'flex size-10 shrink-0 items-center justify-center rounded-[12px] text-sm font-extrabold [&_svg]:size-5',
                                    state === 'complete' &&
                                        'bg-success-soft text-success-dot',
                                    state === 'current' &&
                                        'bg-brand text-white shadow-primary',
                                    state === 'upcoming' &&
                                        'bg-surface-tint text-ink-muted',
                                )}
                            >
                                {state === 'complete' ? (
                                    <Check strokeWidth={2.6} />
                                ) : (
                                    (step.icon ?? index + 1)
                                )}
                            </span>
                            <span className="flex min-w-0 flex-col text-left">
                                <span
                                    className={cn(
                                        'text-sm font-bold',
                                        state === 'upcoming'
                                            ? 'text-ink-muted'
                                            : 'text-ink',
                                        state === 'current' && 'text-brand-ink',
                                    )}
                                >
                                    {step.title}
                                </span>
                                {step.description && (
                                    <span className="text-xs text-ink-muted">
                                        {step.description}
                                    </span>
                                )}
                                <span className="sr-only">
                                    {state === 'complete'
                                        ? t('Completed')
                                        : state === 'current'
                                          ? t('Current')
                                          : t('Upcoming')}
                                </span>
                            </span>
                        </>
                    );
                    const rowClass = cn(
                        'flex min-h-11 w-full items-center gap-3 rounded-[14px] p-2',
                        state === 'current' && 'bg-brand-soft',
                    );

                    return (
                        <li
                            key={step.id}
                            data-state={state}
                            aria-current={
                                state === 'current' ? 'step' : undefined
                            }
                        >
                            {selectable ? (
                                <button
                                    type="button"
                                    onClick={() => onStepSelect(index)}
                                    className={cn(
                                        rowClass,
                                        'transition-colors outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring',
                                    )}
                                >
                                    {body}
                                </button>
                            ) : (
                                <div className={rowClass}>{body}</div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export { Stepper };
