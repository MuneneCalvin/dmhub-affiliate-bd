export function termsText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value))
        return value.map(termsText).filter(Boolean).join('\n');
    if (value && typeof value === 'object')
        return Object.values(value).map(termsText).filter(Boolean).join('\n');
    return '';
}
