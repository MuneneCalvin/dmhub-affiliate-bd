import * as React from 'react';

import type { DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

const onTrack: Record<DomainTone, string> = {
    brand: 'aria-checked:bg-brand',
    partners: 'aria-checked:bg-partners',
    finance: 'aria-checked:bg-finance',
    admin: 'aria-checked:bg-admin',
    analytics: 'aria-checked:bg-analytics',
};

type SwitchProps = Omit<
    React.ComponentProps<'button'>,
    'onChange' | 'value'
> & {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    /** Track colour when on. */
    tone?: DomainTone;
};

/** 48×28 toggle switch, `role="switch"`. */
function Switch({
    checked,
    defaultChecked = false,
    onCheckedChange,
    tone = 'brand',
    className,
    disabled,
    onClick,
    ...props
}: SwitchProps) {
    const [internal, setInternal] = React.useState(defaultChecked);
    const isOn = checked ?? internal;

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isOn}
            data-slot="switch"
            data-state={isOn ? 'checked' : 'unchecked'}
            disabled={disabled}
            onClick={(event) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                if (checked === undefined) setInternal(!isOn);
                onCheckedChange?.(!isOn);
            }}
            className={cn(
                'peer relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-border-strong transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                'disabled:cursor-not-allowed disabled:opacity-50',
                onTrack[tone],
                className,
            )}
            {...props}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none block size-[22px] rounded-full bg-white shadow-sm transition-transform',
                    isOn ? 'translate-x-[23px]' : 'translate-x-[3px]',
                )}
            />
        </button>
    );
}

export { Switch, type SwitchProps };
