import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import nlTranslations from './locales/nl.json';
import enTranslations from './locales/en.json';

// Type-safe resources
const resources = {
    nl: { translation: nlTranslations },
    en: { translation: enTranslations },
} as const;

// Get initial locale from page props or default to Dutch
const getInitialLocale = (): string => {
    // Try to get from Inertia page props
    if (typeof window !== 'undefined') {
        const pageProps = (window as unknown as { __page?: { props?: { locale?: { current?: string } } } }).__page?.props;
        if (pageProps?.locale?.current) {
            return pageProps.locale.current;
        }
    }
    return 'nl';
};

i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'nl',

    interpolation: {
        escapeValue: false, // React handles escaping
    },

    // Return key if translation missing (helps identify missing translations)
    returnEmptyString: false,

    // Debug mode for development
    debug: import.meta.env.DEV,

    // React specific options
    react: {
        useSuspense: false, // Disable suspense for SSR compatibility
    },
});

export default i18n;

// Export type for translation keys
export type TranslationKey = keyof typeof nlTranslations;
