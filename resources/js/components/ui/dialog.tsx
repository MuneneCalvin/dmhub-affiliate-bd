import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { IconTile } from '@/components/app/icon-tile';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useRestoreFocus } from './use-restore-focus';

function Dialog({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-sidebar/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                className,
            )}
            {...props}
        />
    );
}

/** 44px close button used by dialogs and sheets. */
function OverlayCloseButton({
    className,
    asPrimitive: Close,
}: {
    className?: string;
    asPrimitive: React.ElementType;
}) {
    const { t } = useTranslation();
    return (
        <Close
            data-slot="dialog-close"
            className={cn(
                'absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-control bg-surface-tint text-ink transition-colors outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none [&_svg]:size-[18px]',
                className,
            )}
        >
            <XIcon strokeWidth={2.4} aria-hidden="true" />
            <span className="sr-only">{t('Close')}</span>
        </Close>
    );
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    onOpenAutoFocus,
    onCloseAutoFocus,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
}) {
    const restoreFocus = useRestoreFocus({ onOpenAutoFocus, onCloseAutoFocus });
    return (
        <DialogPortal data-slot="dialog-portal">
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'fixed top-[50%] left-[50%] z-50 grid max-h-[90svh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-[24px] border border-border bg-surface p-6 text-ink shadow-overlay duration-200 [--dialog-pad:1.5rem] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg [&_form]:min-w-0 [&_form_div]:min-w-0',
                    className,
                )}
                {...restoreFocus}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <OverlayCloseButton asPrimitive={DialogPrimitive.Close} />
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}

type OverlayHeaderProps = React.ComponentProps<'div'> & {
    /** Icon shown in a solid tile before the title. */
    icon?: React.ReactNode;
    tone?: Tone;
};

function DialogHeader({
    className,
    icon,
    tone = 'brand',
    children,
    ...props
}: OverlayHeaderProps) {
    return (
        <div
            data-slot="dialog-header"
            className={cn(
                'flex min-h-11 items-center gap-3.5 pr-14 text-left',
                className,
            )}
            {...props}
        >
            {icon && (
                <IconTile size={44} tone={tone} variant="solid">
                    {icon}
                </IconTile>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {children}
            </div>
        </div>
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                '-mx-[var(--dialog-pad,1.5rem)] mt-1 -mb-[var(--dialog-pad,1.5rem)] flex flex-col-reverse gap-2.5 border-t border-border bg-surface-muted px-[var(--dialog-pad,1.5rem)] py-4 sm:flex-row sm:justify-end',
                className,
            )}
            {...props}
        />
    );
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn(
                'text-lg leading-snug font-extrabold text-ink',
                className,
            )}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn('text-[13px] text-ink-muted', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
    OverlayCloseButton,
    type OverlayHeaderProps,
};
