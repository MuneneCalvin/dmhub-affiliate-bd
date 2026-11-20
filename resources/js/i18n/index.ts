import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LOCALES = ['nl', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: Locale = 'nl';

/**
 * Each locale bundle is its own chunk and only the active language is
 * downloaded (both together were ~450 kB of the entry chunk). Keys are the
 * English source strings, so a missing entry falls back to the key itself.
 */
const lazyLocales: BackendModule = {
    type: 'backend',
    init() {},
    read(language, _namespace, callback) {
        const locale = (SUPPORTED_LOCALES as readonly string[]).includes(
            language,
        )
            ? language
            : DEFAULT_LOCALE;
        import(`./locales/${locale}.json`)
            .then((bundle) => callback(null, bundle.default))
            .catch((error) => callback(error, false));
    },
};

// The server renders <html lang> from the user's locale (app.blade.php), so
// the right bundle is requested first.
const initialLocale = (): string => {
    if (typeof document !== 'undefined' && document.documentElement.lang) {
        return document.documentElement.lang.slice(0, 2).toLowerCase();
    }
    return DEFAULT_LOCALE;
};

/** Resolves once the initial locale bundle has loaded. */
export const i18nReady = i18n
    .use(lazyLocales)
    .use(initReactI18next)
    .init({
        lng: initialLocale(),
        // No cross-language fallback: a missing key shows its English source
        // string (the translation test keeps both bundles complete).
        fallbackLng: false,
        supportedLngs: [...SUPPORTED_LOCALES],
        interpolation: {
            escapeValue: false, // React handles escaping
        },
        returnEmptyString: false,
        debug: import.meta.env.DEV && import.meta.env.MODE !== 'test',
        react: {
            useSuspense: false, // Disable suspense for SSR compatibility
        },
    });

export default i18n;

export type TranslationKey = keyof typeof import('./locales/nl.json');
