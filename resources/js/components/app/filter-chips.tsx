import * as React from 'react';

import { toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type FilterChipOption<T extends string = string> = {
    value: T;
    label: React.ReactNode;
    tone?: Tone;
    count?: React.ReactNode;
};

type FilterChipsProps<T extends string> = Omit<
    React.ComponentProps<'div'>,
    'onChange'
> & {
    options: FilterChipOption<T>[];
    /** Selected values. */
    value: T[];
    onValueChange: (value: T[]) => void;
    /** Accessible name for the group. */
    label: string;
    /** Allow more than one chip at once (default true). */
    multiple?: boolean;
};

/** Pill toggles with a colour dot. Each chip is an `aria-pressed` button. */
function FilterChips<T extends string>({
    options,
    value,
    onValueChange,
    label,
    multiple = true,
    className,
    ...props
}: FilterChipsProps<T>) {
    const toggle = (option: T) => {
        const on = value.includes(option);
        if (multiple) {
            onValueChange(
                on ? value.filter((v) => v !== option) : [...value, option],
            );
        } else {
            onValueChange(on ? [] : [option]);
        }
    };

    return (
        <div
            role="group"
            aria-label={label}
            data-slot="filter-chips"
            className={cn('flex flex-wrap gap-2', className)}
            {...props}
        >
            {options.map((option) => {
                const pressed = value.includes(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => toggle(option.value)}
                        className={cn(
                            'inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            pressed
                                ? 'border-transparent bg-sidebar text-white'
                                : 'border-border-strong bg-surface text-ink hover:bg-surface-muted',
                        )}
                    >
                        {option.tone && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'size-2 rounded-full',
                                    toneClasses[option.tone].fill,
                                )}
                            />
                        )}
                        {option.label}
                        {option.count !== undefined && (
                            <span
                                className={cn(
                                    'tabular-nums',
                                    pressed
                                        ? 'text-white/75'
                                        : 'text-ink-muted',
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export { FilterChips };
