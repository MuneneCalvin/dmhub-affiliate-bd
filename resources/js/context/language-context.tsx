import { router, usePage } from '@inertiajs/react';
import type { TFunction } from 'i18next';
import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface LocaleData {
    current: string;
    fallback: string;
    available: Record<string, { name: string; native: string; regional: string }>;
}

interface PageProps {
    locale?: LocaleData;
}

interface LanguageContextType {
    t: TFunction;
    __: (text: string, params?: Record<string, unknown>) => string;
    currentLocale: string;
    locale: string;
    setLanguage: (locale: string) => void;
    availableLocales: Array<{ code: string; name: string; native: string }>;
    isLocale: (code: string) => boolean;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
    children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const { i18n: i18nInstance, t } = useTranslation();
    const pageProps = usePage<PageProps>().props;
    const locale = pageProps?.locale;

    // Sync i18next with server locale on mount and when locale changes
    useEffect(() => {
        if (locale?.current && i18nInstance.language !== locale.current) {
            i18nInstance.changeLanguage(locale.current);
        }
    }, [locale?.current, i18nInstance]);

    // Change language function
    const setLanguage = useCallback(
        (newLocale: string) => {
            // Optimistically update i18next
            i18nInstance.changeLanguage(newLocale);

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
        [i18nInstance]
    );

    // Get available locales as array for dropdowns
    const availableLocales = Object.entries(locale?.available || {}).map(
        ([code, data]) => ({
            code,
            name: data.name,
            native: data.native,
        })
    );

    // Legacy compatibility: __() function that wraps t()
    const __ = useCallback(
        (text: string, params?: Record<string, unknown>): string => {
            const result = t(text, params as Record<string, string>);
            return typeof result === 'string' ? result : text;
        },
        [t]
    );

    const currentLocale = locale?.current || 'nl';

    const contextValue: LanguageContextType = {
        t,
        __,
        currentLocale,
        locale: currentLocale,
        setLanguage,
        availableLocales,
        isLocale: (code: string) => currentLocale === code,
        loading: false,
    };

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * Hook to use language context.
 * Falls back to i18next directly if used outside LanguageProvider.
 */
export function useLanguageContext(): LanguageContextType {
    const context = useContext(LanguageContext);
    const { t, i18n } = useTranslation();

    // If we're inside a LanguageProvider, use the context
    if (context) {
        return context;
    }

    // Fallback: use i18next directly (for components outside LanguageProvider)
    const __ = (text: string, params?: Record<string, unknown>): string => {
        const result = t(text, params as Record<string, string>);
        return typeof result === 'string' ? result : text;
    };

    const setLanguage = (newLocale: string) => {
        i18n.changeLanguage(newLocale);
        router.post(
            '/locale',
            { locale: newLocale },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    return {
        t,
        __,
        currentLocale: i18n.language || 'nl',
        locale: i18n.language || 'nl',
        setLanguage,
        availableLocales: [],
        isLocale: (code: string) => i18n.language === code,
        loading: false,
    };
}

// Legacy export for backward compatibility
export const useLanguage = useLanguageContext;

// Standalone hook that works outside LanguageProvider (uses i18next directly)
export function useTranslate() {
    const { t, i18n: i18nInstance } = useTranslation();

    const __ = (text: string, params?: Record<string, unknown>): string => {
        const result = t(text, params as Record<string, string>);
        return typeof result === 'string' ? result : text;
    };

    return {
        t,
        __,
        i18n: i18nInstance,
        currentLocale: i18nInstance.language,
    };
}
