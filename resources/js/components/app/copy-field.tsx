import { Check, Copy } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useCopyToast } from '@/hooks/use-copy-toast';
import { cn } from '@/lib/utils';

type CopyFieldProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    value: string;
    /** Visible label above the field. Also names the Copy button. */
    label?: string;
    /** Toast title after copying (default "Copied to clipboard"). */
    copiedMessage?: string;
    /** Show the value on several lines (scripts, long URLs). */
    multiline?: boolean;
    /**
     * `dark`: navy code style for use on navy cards. `code`: the same style
     * in its own navy panel (code blocks on light pages).
     */
    variant?: 'default' | 'dark' | 'code';
};

/** Monospace read-only value with a Copy button and a toast. */
function CopyField({
    value,
    label,
    copiedMessage,
    multiline = false,
    variant = 'default',
    className,
    ...props
}: CopyFieldProps) {
    const dark = variant !== 'default';
    const { t } = useTranslation();
    const { copied, copy: copyValue } = useCopyToast();
    const valueId = React.useId();
    const copy = () => copyValue(value, copiedMessage);

    return (
        <div
            data-slot="copy-field"
            className={cn(
                'flex min-w-0 flex-col gap-1.5',
                variant === 'code' && 'rounded-card bg-sidebar p-4',
                className,
            )}
            {...props}
        >
            {label && (
                <span
                    id={`${valueId}-label`}
                    className={cn(
                        'text-[13px] font-bold',
                        dark ? 'text-white' : 'text-ink',
                    )}
                >
                    {label}
                </span>
            )}
            <div
                className={cn(
                    'flex min-w-0 gap-2 rounded-control border p-1.5 pl-3.5',
                    dark
                        ? 'border-white/12 bg-white/8'
                        : 'border-border-strong bg-surface-muted',
                    multiline ? 'items-start' : 'items-center',
                )}
            >
                <code
                    id={valueId}
                    aria-labelledby={label ? `${valueId}-label` : undefined}
                    className={cn(
                        'min-w-0 flex-1 font-mono text-[13px] font-medium',
                        dark ? 'text-sidebar-text' : 'text-ink',
                        multiline
                            ? 'py-2 break-all whitespace-pre-wrap'
                            : 'truncate',
                    )}
                >
                    {value}
                </code>
                <Button
                    type="button"
                    variant={dark ? 'secondary' : 'soft'}
                    size="sm"
                    className={
                        dark
                            ? 'border-0 bg-white text-sidebar hover:bg-white/90'
                            : undefined
                    }
                    onClick={copy}
                    aria-label={label ? `${t('Copy')}: ${label}` : undefined}
                    aria-describedby={valueId}
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? t('Copied') : t('Copy')}
                </Button>
            </div>
        </div>
    );
}

export { CopyField };
