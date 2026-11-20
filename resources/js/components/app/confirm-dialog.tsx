import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ConfirmDialogOptions = {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** `destructive` uses the danger tile and a red confirm button. */
    variant?: 'default' | 'destructive';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
};

export type ConfirmDialogProps = ConfirmDialogOptions & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading?: boolean;
};

/**
 * Centered confirm dialog (Overlays board). Titles and labels are passed
 * already translated or as English keys; both go through `t()`.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
    isLoading = false,
}: ConfirmDialogProps) {
    const { t } = useTranslation();
    const destructive = variant === 'destructive';

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader
                    icon={destructive ? <AlertTriangle /> : <CheckCircle2 />}
                    tone={destructive ? 'danger' : 'brand'}
                >
                    <AlertDialogTitle>{t(title)}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t(description)}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={isLoading}
                        onClick={() => {
                            onCancel?.();
                            onOpenChange(false);
                        }}
                    >
                        {t(cancelLabel)}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={destructive ? 'destructive' : 'primary'}
                        disabled={isLoading}
                        onClick={() => {
                            void onConfirm();
                            if (!isLoading) onOpenChange(false);
                        }}
                    >
                        {isLoading ? t('Processing...') : t(confirmLabel)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/**
 * `const { confirm, ConfirmDialog } = useConfirmationDialog();`
 * Call `confirm({...})` from a handler and render `<ConfirmDialog />` once.
 */
export function useConfirmationDialog() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [config, setConfig] = React.useState<ConfirmDialogOptions | null>(
        null,
    );

    const confirm = React.useCallback((options: ConfirmDialogOptions) => {
        setConfig({
            ...options,
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await options.onConfirm();
                } finally {
                    setIsLoading(false);
                    setIsOpen(false);
                }
            },
        });
        setIsOpen(true);
    }, []);

    const Dialog = React.useCallback(() => {
        if (!config) return null;
        return (
            <ConfirmDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                isLoading={isLoading}
                {...config}
            />
        );
    }, [isOpen, config, isLoading]);

    return { isOpen, confirm, ConfirmDialog: Dialog };
}
