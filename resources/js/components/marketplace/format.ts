import type { TFunction } from 'i18next';

/** Cookie lifetime: whole days when possible, otherwise hours. */
export function cookieWindow(hours: number | null | undefined, t: TFunction) {
    if (!hours) return '—';
    return hours % 24 === 0
        ? t('{{count}} days', { count: hours / 24 })
        : t('{{count}} hours', { count: hours });
}
