import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon, MinusIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** 22px checkbox with a brand fill. Wrap with a `<label>` for a 44px target. */
function Checkbox({
    className,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            className={cn(
                'peer size-[22px] shrink-0 rounded-[7px] border-[1.5px] border-border-strong bg-surface transition-[color,background-color,border-color,box-shadow] outline-none',
                'data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white',
                'data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand data-[state=indeterminate]:text-white',
                'focus-visible:shadow-[0_0_0_4px_var(--focus-halo)] focus-visible:ring-2 focus-visible:ring-ring',
                'aria-invalid:border-danger-dot disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="group flex items-center justify-center text-current transition-none"
            >
                {props.checked === 'indeterminate' ? (
                    <MinusIcon className="size-3.5" strokeWidth={3} />
                ) : (
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                )}
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
