import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Buttons from the Foundations board: 44px controls, 12px radius, 8px icon gap.
 * `default` is `primary`, `outline` is `secondary`: both aliases keep existing
 * pages working.
 */
const buttonVariants = cva(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-bold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,filter] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                primary:
                    'bg-primary text-primary-foreground shadow-primary hover:bg-brand-hover',
                default:
                    'bg-primary text-primary-foreground shadow-primary hover:bg-brand-hover',
                secondary:
                    'border border-border-strong bg-surface font-semibold text-ink hover:bg-surface-muted',
                outline:
                    'border border-border-strong bg-surface font-semibold text-ink hover:bg-surface-muted',
                soft: 'hover:brightness-[0.96] dark:hover:brightness-125',
                ghost: 'bg-transparent text-brand-ink hover:bg-brand-soft',
                destructive:
                    'bg-danger-strong text-white hover:brightness-90 dark:hover:brightness-110',
                success:
                    'bg-success-strong text-white hover:brightness-90 dark:hover:brightness-110',
                link: 'text-brand-ink underline-offset-4 hover:underline',
                /** White button on navy surfaces (brand panel, 403 card). */
                inverse:
                    'bg-white font-extrabold text-sidebar hover:bg-white/90',
                /** Secondary button on navy surfaces (preview card). */
                translucent:
                    'border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/15',
            },
            tone: {
                brand: '',
                partners: '',
                finance: '',
                admin: '',
                analytics: '',
                /** Soft danger: secondary destructive actions (Disable, Delete role). */
                danger: '',
            },
            size: {
                md: 'h-11 px-4 has-[>svg]:px-3.5',
                default: 'h-11 px-4 has-[>svg]:px-3.5',
                lg: 'h-11 px-5 has-[>svg]:px-4',
                sm: 'h-10 rounded-[11px] px-3.5 text-[13px] has-[>svg]:px-3',
                icon: 'size-11',
                'icon-sm': 'size-10 rounded-[11px]',
                'icon-lg': 'size-11',
            },
        },
        compoundVariants: [
            {
                variant: 'soft',
                tone: 'brand',
                className: 'bg-brand-soft text-brand-ink',
            },
            {
                variant: 'soft',
                tone: 'partners',
                className: 'bg-partners-soft text-partners-ink',
            },
            {
                variant: 'soft',
                tone: 'finance',
                className: 'bg-finance-soft text-finance-ink',
            },
            {
                variant: 'soft',
                tone: 'admin',
                className: 'bg-admin-soft text-admin-ink',
            },
            {
                variant: 'soft',
                tone: 'analytics',
                className: 'bg-analytics-soft text-analytics-ink',
            },
            {
                variant: 'soft',
                tone: 'danger',
                className: 'bg-danger-soft text-danger-ink',
            },
            {
                variant: 'link',
                className: 'h-auto px-0 has-[>svg]:px-0',
            },
        ],
        defaultVariants: {
            variant: 'primary',
            size: 'md',
            tone: 'brand',
        },
    },
);

type ButtonProps = React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    };

function Button({
    className,
    variant,
    size,
    tone,
    asChild = false,
    ...props
}: ButtonProps) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            data-variant={variant ?? 'primary'}
            className={cn(buttonVariants({ variant, size, tone, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants, type ButtonProps };
