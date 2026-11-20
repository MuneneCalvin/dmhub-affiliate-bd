import * as React from 'react';

import type { DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

const selected: Record<DomainTone, string> = {
    brand: 'has-[:checked]:border-brand has-[:checked]:bg-brand-soft',
    partners: 'has-[:checked]:border-partners has-[:checked]:bg-partners-soft',
    finance: 'has-[:checked]:border-finance has-[:checked]:bg-finance-soft',
    admin: 'has-[:checked]:border-admin has-[:checked]:bg-admin-soft',
    analytics:
        'has-[:checked]:border-analytics has-[:checked]:bg-analytics-soft',
};

const dot: Record<DomainTone, string> = {
    brand: 'peer-checked:border-brand',
    partners: 'peer-checked:border-partners',
    finance: 'peer-checked:border-finance',
    admin: 'peer-checked:border-admin',
    analytics: 'peer-checked:border-analytics',
};

type RadioCardGroupProps = Omit<React.ComponentProps<'div'>, 'onChange'> & {
    name: string;
    value?: string;
    onValueChange?: (value: string) => void;
    /** Accessible name for the group when there is no visible legend. */
    label?: string;
    disabled?: boolean;
};

const RadioCardContext = React.createContext<{
    name: string;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
} | null>(null);

/** A radiogroup of bordered cards (native radios, so arrow keys work). */
function RadioCardGroup({
    name,
    value,
    onValueChange,
    label,
    disabled,
    className,
    ...props
}: RadioCardGroupProps) {
    return (
        <RadioCardContext.Provider
            value={{ name, value, onValueChange, disabled }}
        >
            <div
                role="radiogroup"
                aria-label={label}
                data-slot="radio-card-group"
                className={cn('grid gap-3 sm:grid-cols-2', className)}
                {...props}
            />
        </RadioCardContext.Provider>
    );
}

type RadioCardProps = Omit<
    React.ComponentProps<'input'>,
    'type' | 'title' | 'value'
> & {
    value: string;
    title: React.ReactNode;
    hint?: React.ReactNode;
    icon?: React.ReactNode;
    tone?: DomainTone;
    /**
     * Decorative preview shown above the title (theme swatches). The card
     * stacks vertically when set.
     */
    media?: React.ReactNode;
};

function RadioCard({
    value,
    title,
    hint,
    icon,
    tone = 'brand',
    media,
    className,
    disabled,
    onChange,
    ...props
}: RadioCardProps) {
    const group = React.useContext(RadioCardContext);
    const id = React.useId();
    const hintId = hint ? `${id}-hint` : undefined;
    const controlled = group?.value !== undefined;

    return (
        <label
            htmlFor={id}
            data-slot="radio-card"
            className={cn(
                'relative flex min-h-11 cursor-pointer items-start gap-3 rounded-[14px] border border-border-strong bg-surface p-4 transition-colors',
                media && 'flex-wrap p-2.5 has-[:checked]:p-[9px]',
                'hover:bg-surface-muted has-[:checked]:border-2 has-[:checked]:p-[15px]',
                'has-[:focus-visible]:shadow-[0_0_0_4px_var(--focus-halo)]',
                'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
                selected[tone],
                className,
            )}
        >
            <input
                id={id}
                type="radio"
                name={group?.name}
                value={value}
                aria-labelledby={`${id}-title`}
                aria-describedby={hintId}
                disabled={disabled ?? group?.disabled}
                {...(controlled ? { checked: group?.value === value } : {})}
                onChange={(event) => {
                    onChange?.(event);
                    if (event.target.checked) group?.onValueChange?.(value);
                }}
                className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-[inherit] opacity-0 disabled:cursor-not-allowed"
                {...props}
            />
            {media && (
                <span
                    aria-hidden="true"
                    data-slot="radio-card-media"
                    className="pointer-events-none block w-full basis-full"
                >
                    {media}
                </span>
            )}
            {icon && (
                <span className="flex shrink-0 items-center [&_svg]:size-5">
                    {icon}
                </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={`${id}-title`} className="text-sm font-bold text-ink">
                    {title}
                </span>
                {hint && (
                    <span id={hintId} className="text-[13px] text-ink-muted">
                        {hint}
                    </span>
                )}
            </span>
            <span
                aria-hidden="true"
                className={cn(
                    'mt-0.5 flex size-5 shrink-0 rounded-full border-2 border-border-strong bg-surface peer-checked:border-[6px]',
                    dot[tone],
                )}
            />
        </label>
    );
}

export { RadioCard, RadioCardGroup };
