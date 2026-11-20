import { useTranslation } from 'react-i18next';

/** Locale-aware money formatter for one currency. `compact` → "€12.4K". */
export function useMoney(currency: string) {
    const { i18n } = useTranslation();
    return (value: number, compact = false) =>
        new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency,
            notation: compact ? 'compact' : 'standard',
            maximumFractionDigits: compact ? 1 : 2,
        }).format(Number.isFinite(value) ? value : 0);
}

/** Locale-aware integer/decimal formatter. */
export function useCount() {
    const { i18n } = useTranslation();
    return (value: number | null | undefined, digits = 0) =>
        new Intl.NumberFormat(i18n.language, {
            maximumFractionDigits: digits,
        }).format(Number(value ?? 0));
}

/** "12 Nov" for an ISO date (YYYY-MM-DD), independent of the browser zone. */
export function useShortDate() {
    const { i18n } = useTranslation();
    return (date: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
        }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

/** "12 Nov 2026" for an ISO date or timestamp, independent of the browser zone. */
export function useDate() {
    const { i18n } = useTranslation();
    return (date: string | null | undefined) =>
        date
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
              }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
            : '—';
}
