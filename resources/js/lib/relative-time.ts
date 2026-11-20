/** "5 minutes ago", "yesterday", … in the given locale. */
export function relativeTime(iso: string, locale: string): string {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ['second', 60],
        ['minute', 60],
        ['hour', 24],
        ['day', 7],
        ['week', 4.35],
        ['month', 12],
    ];
    let value = seconds;
    for (const [unit, size] of steps) {
        if (Math.abs(value) < size) return format.format(value, unit);
        value = Math.round(value / size);
    }
    return format.format(value, 'year');
}
