import { Copy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Copies text to the clipboard and confirms with a toast ("Copied to
 * clipboard", or `message`). `copied` stays true for two seconds so buttons
 * can show a check mark. Failure shows the "Could not copy" error toast.
 */
export function useCopyToast() {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = useCallback(
        async (value: string, message?: string) => {
            try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                toast(message ?? t('Copied to clipboard'), {
                    icon: <Copy />,
                });
                return true;
            } catch {
                toast.error(t('Could not copy'));
                return false;
            }
        },
        [t],
    );

    return { copied, copy };
}
