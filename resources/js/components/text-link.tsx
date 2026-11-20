import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ComponentProps } from 'react';

type LinkProps = ComponentProps<typeof Link>;

/** Inline brand link (bold, underlined on hover). */
export default function TextLink({
    className = '',
    children,
    ...props
}: LinkProps) {
    return (
        <Link
            className={cn(
                'rounded-sm font-bold text-brand-ink underline-offset-4 hover:underline',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
