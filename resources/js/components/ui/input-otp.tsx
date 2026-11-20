import { OTPInput, OTPInputContext } from 'input-otp';
import { Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const InputOTP = React.forwardRef<
    React.ElementRef<typeof OTPInput>,
    React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
    <OTPInput
        ref={ref}
        containerClassName={cn(
            'flex items-center gap-2 has-[:disabled]:opacity-50',
            containerClassName,
        )}
        className={cn('disabled:cursor-not-allowed', className)}
        {...props}
    />
));
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<
    React.ElementRef<'div'>,
    React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center gap-2', className)}
        {...props}
    />
));
InputOTPGroup.displayName = 'InputOTPGroup';

/** One digit box: 48×56, 12px radius, brand border + halo when active. */
const InputOTPSlot = React.forwardRef<
    React.ElementRef<'div'>,
    React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

    return (
        <div
            ref={ref}
            data-slot="input-otp-slot"
            data-active={isActive || undefined}
            className={cn(
                'relative flex h-14 w-11 items-center justify-center rounded-control border border-border-strong bg-surface-muted text-xl font-extrabold text-ink tabular-nums transition-[border-color,box-shadow] sm:w-12',
                isActive &&
                    'z-10 border-brand bg-surface shadow-[inset_0_0_0_1px_var(--brand-base),0_0_0_4px_var(--focus-halo)]',
                className,
            )}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-px animate-caret-blink bg-ink duration-1000" />
                </div>
            )}
        </div>
    );
});
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<
    React.ElementRef<'div'>,
    React.ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
        <Minus />
    </div>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
