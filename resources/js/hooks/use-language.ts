import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface LocaleData {
    current: string;
    fallback: string;
    available: Record<string, { name: string; native: string; regional: string }>;
}

interface PageProps {
    locale?: LocaleData;
}

/**
 * Hook for language/locale management.
 * Must be used within an Inertia page context.
 */
export function useLanguage() {
    const { i18n, t } = useTranslation();

    let locale: LocaleData | undefined;
    try {
        const pageProps = usePage<PageProps>().props;
        locale = pageProps?.locale;
    } catch {
        // usePage not available, use defaults
        locale = undefined;
    }

    // Sync i18next with server locale on mount and when locale changes
    useEffect(() => {
        if (locale?.current && i18n.language !== locale.current) {
            i18n.changeLanguage(locale.current);
        }
    }, [locale?.current, i18n]);

    // Change language function
    const setLanguage = useCallback(
        (newLocale: string) => {
            // Optimistically update i18next
            i18n.changeLanguage(newLocale);

            // Persist to server
            router.post(
                '/locale',
                { locale: newLocale },
                {
                    preserveState: true,
                    preserveScroll: true,
                }
            );
        },
        [i18n]
    );

    // Get available locales as array for dropdowns
    const availableLocales = Object.entries(locale?.available || {}).map(
        ([code, data]) => ({
            code,
            name: data.name,
            native: data.native,
        })
    );

    return {
        // Current locale
        currentLocale: locale?.current || i18n.language || 'nl',

        // Translation function
        t,

        // i18next instance (for advanced usage)
        i18n,

        // Change language
        setLanguage,

        // Available locales
        availableLocales,

        // Check if current locale
        isLocale: (code: string) => (locale?.current || i18n.language) === code,
    };
}

// Re-export translation function for convenience
export { useTranslation } from 'react-i18next';
