import * as React from 'react';

import { cn } from '@/lib/utils';

/** Shared control look for inputs, textareas and select triggers. */
export const controlClasses = cn(
    'w-full min-w-0 rounded-control border border-border-strong bg-surface-muted text-sm font-medium text-ink transition-[color,box-shadow,border-color,background-color] outline-none',
    'placeholder:text-ink-muted/80 selection:bg-primary selection:text-primary-foreground',
    'focus-visible:border-brand focus-visible:bg-surface focus-visible:shadow-[inset_0_0_0_1px_var(--brand-base),0_0_0_4px_var(--focus-halo)]',
    'aria-invalid:border-danger-dot aria-invalid:bg-invalid-fill aria-invalid:shadow-[inset_0_0_0_1px_var(--danger-dot)]',
    'disabled:cursor-not-allowed disabled:opacity-60',
);

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                controlClasses,
                'flex h-11 px-3.5 py-1',
                'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-ink',
                className,
            )}
            {...props}
        />
    );
}

type InputGroupProps = React.ComponentProps<'div'> & {
    /** Leading icon or adornment, e.g. a currency symbol. */
    leading?: React.ReactNode;
    /** Trailing adornment, e.g. a unit. */
    trailing?: React.ReactNode;
};

/**
 * Input with a leading/trailing adornment. Put an `<Input>` inside; the group
 * draws the border and focus ring.
 */
function InputGroup({
    className,
    leading,
    trailing,
    children,
    ...props
}: InputGroupProps) {
    return (
        <div
            data-slot="input-group"
            className={cn(
                controlClasses,
                'flex h-11 items-center gap-2 px-3',
                'focus-within:border-brand focus-within:bg-surface focus-within:shadow-[inset_0_0_0_1px_var(--brand-base),0_0_0_4px_var(--focus-halo)]',
                'has-[[aria-invalid=true]]:border-danger-dot has-[[aria-invalid=true]]:bg-invalid-fill',
                '[&_[data-slot=input]]:h-full [&_[data-slot=input]]:rounded-none [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:shadow-none',
                className,
            )}
            {...props}
        >
            {leading != null && (
                <span
                    data-slot="input-adornment"
                    className="flex shrink-0 items-center font-extrabold text-brand [&_svg]:size-4"
                >
                    {leading}
                </span>
            )}
            {children}
            {trailing != null && (
                <span
                    data-slot="input-adornment"
                    className="flex shrink-0 items-center text-ink-muted [&_svg]:size-4"
                >
                    {trailing}
                </span>
            )}
        </div>
    );
}

export { Input, InputGroup };
