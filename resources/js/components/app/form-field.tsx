import * as React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FormFieldProps = {
    /** Id of the control; the label points at it. */
    id: string;
    label: React.ReactNode;
    hint?: React.ReactNode;
    error?: string;
    /** Content after the control (e.g. a "Verified" badge). */
    after?: React.ReactNode;
    className?: string;
    /** One form control. It receives `aria-describedby` and `aria-invalid`. */
    children: React.ReactElement<{
        'aria-describedby'?: string;
        'aria-invalid'?: boolean;
    }>;
};

/**
 * Label, control, hint and error in one column. The hint and error are wired
 * to the control with `aria-describedby`, and an error marks it invalid.
 */
function FormField({
    id,
    label,
    hint,
    error,
    after,
    className,
    children,
}: FormFieldProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy =
        [children.props['aria-describedby'], hintId, errorId]
            .filter(Boolean)
            .join(' ') || undefined;

    return (
        <div
            data-slot="form-field"
            className={cn('flex min-w-0 flex-col gap-1.5', className)}
        >
            <Label htmlFor={id}>{label}</Label>
            {React.cloneElement(children, {
                'aria-describedby': describedBy,
                'aria-invalid': error ? true : children.props['aria-invalid'],
            })}
            {after}
            {hint && (
                <p id={hintId} className="text-[13px] text-ink-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={errorId}
                    className="text-[13px] font-semibold text-danger-ink"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export { FormField, type FormFieldProps };
