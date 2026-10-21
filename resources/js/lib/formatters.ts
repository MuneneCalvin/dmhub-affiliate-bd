type SupportedLocale = 'nl' | 'en';

const LOCALE_MAP: Record<SupportedLocale, string> = {
    nl: 'nl-NL',
    en: 'en-GB',
};

const CURRENCY_MAP: Record<SupportedLocale, string> = {
    nl: 'EUR',
    en: 'EUR', // Keep EUR for consistency
};

/**
 * Format a date according to locale
 */
export function formatDate(
    date: Date | string | number,
    locale: SupportedLocale = 'nl',
    options?: Intl.DateTimeFormatOptions
): string {
    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };

    return new Intl.DateTimeFormat(
        LOCALE_MAP[locale],
        options || defaultOptions
    ).format(dateObj);
}

/**
 * Format a date as short format (e.g., "13 jan 2026" or "Jan 13, 2026")
 */
export function formatDateShort(
    date: Date | string | number,
    locale: SupportedLocale = 'nl'
): string {
    return formatDate(date, locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
    date: Date | string | number,
    locale: SupportedLocale = 'nl'
): string {
    const dateObj = typeof date === 'string' || typeof date === 'number'
        ? new Date(date)
        : date;

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(LOCALE_MAP[locale], {
        numeric: 'auto',
    });

    // Calculate appropriate unit
    if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 2592000) {
        return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 31536000) {
        return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
        return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
}

/**
 * Format currency
 */
export function formatCurrency(
    amount: number,
    locale: SupportedLocale = 'nl',
    currency?: string
): string {
    return new Intl.NumberFormat(LOCALE_MAP[locale], {
        style: 'currency',
        currency: currency || CURRENCY_MAP[locale],
    }).format(amount);
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(
    value: number,
    locale: SupportedLocale = 'nl',
    options?: Intl.NumberFormatOptions
): string {
    return new Intl.NumberFormat(LOCALE_MAP[locale], options).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(
    value: number,
    locale: SupportedLocale = 'nl',
    decimals: number = 1
): string {
    return new Intl.NumberFormat(LOCALE_MAP[locale], {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
}

/**
 * Format compact number (e.g., 1.5K, 2.3M)
 */
export function formatCompactNumber(
    value: number,
    locale: SupportedLocale = 'nl'
): string {
    return new Intl.NumberFormat(LOCALE_MAP[locale], {
        notation: 'compact',
        compactDisplay: 'short',
    }).format(value);
}
