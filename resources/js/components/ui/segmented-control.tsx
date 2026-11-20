import * as React from 'react';

import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

const filledSelected: Record<Tone, string> = {
    brand: 'aria-pressed:bg-brand',
    partners: 'aria-pressed:bg-partners-strong',
    finance: 'aria-pressed:bg-finance-strong',
    admin: 'aria-pressed:bg-admin-strong',
    analytics: 'aria-pressed:bg-analytics-strong',
    success: 'aria-pressed:bg-success-strong',
    warning: 'aria-pressed:bg-warning-strong',
    danger: 'aria-pressed:bg-danger-strong',
    info: 'aria-pressed:bg-info-strong',
    neutral: 'aria-pressed:bg-neutral-strong',
};

export type SegmentedOption<T extends string = string> = {
    value: T;
    label: React.ReactNode;
    /** Count shown after the label ("Active · 39"). */
    count?: React.ReactNode;
    /** Selected colour in the `filled` variant. Defaults to the control's tone. */
    tone?: Tone;
    disabled?: boolean;
};

type SegmentedControlProps<T extends string> = Omit<
    React.ComponentProps<'div'>,
    'onChange'
> & {
    options: SegmentedOption<T>[];
    value: T;
    onValueChange: (value: T) => void;
    /** Accessible name for the group. */
    label: string;
    /**
     * `tinted`: tinted track, white selected pill. `filled`: selected option
     * takes a solid colour (currency, status filters).
     */
    variant?: 'tinted' | 'filled';
    tone?: Tone;
    size?: 'md' | 'sm';
};

/** A group of toggle buttons where exactly one is pressed. */
function SegmentedControl<T extends string>({
    options,
    value,
    onValueChange,
    label,
    variant = 'tinted',
    tone = 'brand',
    size = 'md',
    className,
    ...props
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            data-slot="segmented-control"
            data-variant={variant}
            className={cn(
                'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control bg-surface-tint p-1',
                className,
            )}
            {...props}
        >
            {options.map((option) => {
                const pressed = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={pressed}
                        disabled={option.disabled}
                        onClick={() => onValueChange(option.value)}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-semibold whitespace-nowrap text-ink-muted transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                            size === 'md' ? 'h-9' : 'h-8 px-3 text-[13px]',
                            variant === 'tinted' &&
                                'aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-brand-ink aria-pressed:shadow-[0_1px_3px_rgba(23,19,59,0.12)]',
                            variant === 'filled' && [
                                'aria-pressed:font-bold aria-pressed:text-white',
                                filledSelected[option.tone ?? tone],
                            ],
                        )}
                    >
                        {option.label}
                        {option.count !== undefined && (
                            <span className="tabular-nums">
                                · {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export { SegmentedControl };
