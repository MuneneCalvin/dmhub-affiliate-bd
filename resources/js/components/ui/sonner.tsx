import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Toasts from the Overlays board: white card with a solid 36px tone tile,
 * title + description and an optional action. Info and plain toasts use the
 * dark navy card.
 */
const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            gap={12}
            icons={{
                success: <CircleCheckIcon />,
                info: <InfoIcon />,
                warning: <TriangleAlertIcon />,
                error: <OctagonXIcon />,
                loading: <Loader2Icon className="animate-spin" />,
            }}
            toastOptions={{
                unstyled: true,
                ...toastOptions,
                classNames: {
                    toast: 'group/toast flex w-[var(--width)] items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-ink shadow-overlay data-[type=default]:border-transparent data-[type=default]:bg-sidebar data-[type=default]:text-white data-[type=info]:border-transparent data-[type=info]:bg-sidebar data-[type=info]:text-white dark:data-[type=default]:border-sidebar-border dark:data-[type=info]:border-sidebar-border',
                    icon: "!m-0 flex !size-9 shrink-0 items-center justify-center rounded-[11px] bg-analytics text-white [&_svg]:!size-[18px] group-data-[type=error]/toast:bg-danger-dot group-data-[type=success]/toast:bg-success-dot group-data-[type=warning]/toast:bg-warning-ink group-data-[type=loading]/toast:bg-brand",
                    content: 'flex min-w-0 flex-1 flex-col gap-0.5',
                    title: 'font-bold',
                    description:
                        'text-[13px] text-ink-muted group-data-[type=default]/toast:text-sidebar-text group-data-[type=info]/toast:text-sidebar-text',
                    actionButton:
                        'inline-flex h-10 shrink-0 items-center rounded-[10px] px-2.5 font-bold text-brand-ink hover:bg-brand-soft group-data-[type=default]/toast:text-brand-nav group-data-[type=info]/toast:text-brand-nav',
                    cancelButton:
                        'inline-flex h-10 shrink-0 items-center rounded-[10px] px-2.5 font-semibold text-ink-muted hover:bg-surface-tint',
                    closeButton:
                        'border-border bg-surface text-ink hover:bg-surface-tint',
                    ...toastOptions?.classNames,
                },
            }}
            {...props}
        />
    );
};

export { Toaster };
