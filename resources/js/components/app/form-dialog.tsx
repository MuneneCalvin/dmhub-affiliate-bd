import * as React from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type FormDialogProps = {
    dialogOpen: boolean;
    /** Called with `{}` when the dialog asks to close (Esc, overlay, ✕). */
    handleDialogContextSwitch: (context: Record<string, never>) => void;
    className?: string;
    children: React.ReactNode;
};

/**
 * Scrollable dialog shell for the page-level modal pattern
 * (`dialogOpen` + a context switch that closes it). Content uses
 * `DialogHeader` / `DialogFooter`; the body pads 24px and sets
 * `--dialog-pad` so the footer runs full-bleed.
 */
export function FormDialog({
    dialogOpen,
    handleDialogContextSwitch,
    className,
    children,
}: FormDialogProps) {
    return (
        <Dialog
            open={dialogOpen}
            modal
            onOpenChange={() => handleDialogContextSwitch({})}
        >
            <DialogContent
                onOpenAutoFocus={(e) => {
                    // Keep focus inside the dialog without jumping into (and
                    // opening) the first field: focus the dialog itself.
                    e.preventDefault();
                    (e.currentTarget as HTMLElement | null)?.focus();
                }}
                className={cn(
                    'm-0! flex max-h-[90dvh] flex-col overflow-hidden p-0!',
                    className,
                )}
            >
                <div className="relative h-full w-full flex-1 overflow-y-auto p-6 [--dialog-pad:1.5rem]">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
}
