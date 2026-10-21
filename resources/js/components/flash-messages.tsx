import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface FlashMessages {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
}

interface PageProps {
    flash: FlashMessages;
    [key: string]: unknown;
}

export function FlashMessages() {
    const { flash } = usePage<PageProps>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success, {
                duration: 5000,
            });
        }

        if (flash?.error) {
            toast.error(flash.error, {
                duration: 5000,
            });
        }

        if (flash?.warning) {
            toast.warning(flash.warning, {
                duration: 5000,
            });
        }

        if (flash?.info) {
            toast.info(flash.info, {
                duration: 5000,
            });
        }
    }, [flash]);

    return null;
}
