import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={cn(
                'text-[13px] font-semibold text-danger-ink',
                className,
            )}
        >
            {message}
        </p>
    ) : null;
}
