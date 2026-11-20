import { formatDate } from '@/utils/utils';
export function campaignEnd(
    value: string | null | undefined,
    noEndLabel: string,
) {
    if (!value) return noEndLabel;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === '2100-12-31'
        ? noEndLabel
        : formatDate(value);
}
export function campaignRoi(
    value: string | number | null | undefined,
    unsetLabel: string,
) {
    return value != null && Number(value) > 0
        ? `${Number(value)}%`
        : unsetLabel;
}
export function trafficSourceLabels(value: unknown, fallback: string) {
    let parsed = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return String(value || fallback);
        }
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        parsed = (parsed as { sources?: unknown }).sources;
    return Array.isArray(parsed) && parsed.length
        ? parsed.map((item) => String(item).replaceAll('_', ' ')).join(', ')
        : fallback;
}
