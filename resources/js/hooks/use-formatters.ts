import {
    formatCompactNumber,
    formatCurrency,
    formatDate,
    formatDateShort,
    formatNumber,
    formatPercent,
    formatRelativeTime,
} from '@/lib/formatters';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export function useFormatters() {
    const { i18n } = useTranslation();
    const locale = (i18n.language || 'nl') as 'nl' | 'en';

    return useMemo(
        () => ({
            formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
                formatDate(date, locale, options),
            formatDateShort: (date: Date | string | number) =>
                formatDateShort(date, locale),
            formatRelativeTime: (date: Date | string | number) =>
                formatRelativeTime(date, locale),
            formatCurrency: (amount: number, currency?: string) =>
                formatCurrency(amount, locale, currency),
            formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
                formatNumber(value, locale, options),
            formatPercent: (value: number, decimals?: number) =>
                formatPercent(value, locale, decimals),
            formatCompactNumber: (value: number) =>
                formatCompactNumber(value, locale),
        }),
        [locale]
    );
}
