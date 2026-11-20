import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';

import { IconTile } from '@/components/app/icon-tile';
import { buttonVariants } from '@/components/ui/button';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useRestoreFocus } from './use-restore-focus';

function AlertDialog({
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
    return (
        <AlertDialogPrimitive.Trigger
            data-slot="alert-dialog-trigger"
            {...props}
        />
    );
}

function AlertDialogPortal({
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
    return (
        <AlertDialogPrimitive.Portal
            data-slot="alert-dialog-portal"
            {...props}
        />
    );
}

function AlertDialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
    return (
        <AlertDialogPrimitive.Overlay
            data-slot="alert-dialog-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-sidebar/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                className,
            )}
            {...props}
        />
    );
}

/** Centred confirm dialog (Overlays board): 64px tile, title, text, two buttons. */
function AlertDialogContent({
    className,
    onOpenAutoFocus,
    onCloseAutoFocus,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
    const restoreFocus = useRestoreFocus({ onOpenAutoFocus, onCloseAutoFocus });
    return (
        <AlertDialogPortal>
            <AlertDialogOverlay />
            <AlertDialogPrimitive.Content
                data-slot="alert-dialog-content"
                className={cn(
                    'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] justify-items-center gap-4 rounded-[24px] border border-border bg-surface p-7 text-center text-ink shadow-overlay duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-md',
                    className,
                )}
                {...restoreFocus}
                {...props}
            />
        </AlertDialogPortal>
    );
}

function AlertDialogHeader({
    className,
    icon,
    tone = 'danger',
    children,
    ...props
}: React.ComponentProps<'div'> & { icon?: React.ReactNode; tone?: Tone }) {
    return (
        <div
            data-slot="alert-dialog-header"
            className={cn(
                'flex flex-col items-center gap-3 text-center',
                className,
            )}
            {...props}
        >
            {icon && (
                <IconTile size={64} tone={tone}>
                    {icon}
                </IconTile>
            )}
            {children}
        </div>
    );
}

function AlertDialogFooter({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="alert-dialog-footer"
            className={cn(
                'flex w-full flex-col-reverse gap-2.5 sm:flex-row [&>*]:flex-1',
                className,
            )}
            {...props}
        />
    );
}

function AlertDialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
    return (
        <AlertDialogPrimitive.Title
            data-slot="alert-dialog-title"
            className={cn('text-xl font-extrabold text-ink', className)}
            {...props}
        />
    );
}

function AlertDialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
    return (
        <AlertDialogPrimitive.Description
            data-slot="alert-dialog-description"
            className={cn('max-w-[340px] text-sm text-ink-muted', className)}
            {...props}
        />
    );
}

function AlertDialogAction({
    className,
    variant = 'primary',
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
    variant?: 'primary' | 'destructive' | 'success';
}) {
    return (
        <AlertDialogPrimitive.Action
            className={cn(buttonVariants({ variant }), className)}
            {...props}
        />
    );
}

function AlertDialogCancel({
    className,
    ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
    return (
        <AlertDialogPrimitive.Cancel
            className={cn(buttonVariants({ variant: 'secondary' }), className)}
            {...props}
        />
    );
}

export {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogTitle,
    AlertDialogTrigger,
};
