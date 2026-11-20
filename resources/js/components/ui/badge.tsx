import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/** Pill badge. Tone variants match the status tones in tokens.md. */
const badgeVariants = cva(
    'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-xs leading-none font-bold whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3',
    {
        variants: {
            variant: {
                default: 'bg-brand-soft text-brand-ink',
                secondary: 'bg-surface-tint text-ink',
                destructive: 'bg-danger-soft text-danger-ink',
                outline: 'border-border-strong bg-surface text-ink',
                success: 'bg-success-soft text-success-ink',
                warning: 'bg-warning-soft text-warning-ink',
                danger: 'bg-danger-soft text-danger-ink',
                info: 'bg-info-soft text-info-ink',
                neutral: 'bg-neutral-soft text-neutral-ink',
                brand: 'bg-brand-soft text-brand-ink',
                count: 'bg-admin px-2 text-white',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

function Badge({
    className,
    variant,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span';

    return (
        <Comp
            data-slot="badge"
            data-variant={variant ?? 'default'}
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
