/**
 * Colour tones shared by the design system. Class strings are written out in
 * full so Tailwind can find them; never build them from string fragments.
 */

export const domainTones = [
    'brand',
    'partners',
    'finance',
    'admin',
    'analytics',
] as const;
export type DomainTone = (typeof domainTones)[number];

export const statusTones = [
    'success',
    'warning',
    'danger',
    'info',
    'neutral',
    'brand',
] as const;
export type StatusTone = (typeof statusTones)[number];

/** Any tone a tile, chip or badge can take. */
export type Tone = DomainTone | Exclude<StatusTone, 'brand'>;

type ToneClasses = {
    /** Tinted background + ink text (soft tile, soft button, badge). */
    soft: string;
    /** Solid base background + white foreground (icons only). */
    solid: string;
    /** Darker solid fill + white text that meets 4.5:1 (initials, labels). */
    strong: string;
    /** Base colour as text (icons on soft tiles). */
    text: string;
    /** Base colour as a background (dots, progress fills). */
    fill: string;
    /** Selected border for radio cards. */
    border: string;
};

export const toneClasses: Record<Tone, ToneClasses> = {
    brand: {
        soft: 'bg-brand-soft text-brand-ink',
        solid: 'bg-brand text-white',
        strong: 'bg-brand-strong text-white',
        text: 'text-brand',
        fill: 'bg-brand',
        border: 'border-brand',
    },
    partners: {
        soft: 'bg-partners-soft text-partners-ink',
        solid: 'bg-partners text-white',
        strong: 'bg-partners-strong text-white',
        text: 'text-partners',
        fill: 'bg-partners',
        border: 'border-partners',
    },
    finance: {
        soft: 'bg-finance-soft text-finance-ink',
        solid: 'bg-finance text-white',
        strong: 'bg-finance-strong text-white',
        text: 'text-finance',
        fill: 'bg-finance',
        border: 'border-finance',
    },
    admin: {
        soft: 'bg-admin-soft text-admin-ink',
        solid: 'bg-admin text-white',
        strong: 'bg-admin-strong text-white',
        text: 'text-admin',
        fill: 'bg-admin',
        border: 'border-admin',
    },
    analytics: {
        soft: 'bg-analytics-soft text-analytics-ink',
        solid: 'bg-analytics text-white',
        strong: 'bg-analytics-strong text-white',
        text: 'text-analytics',
        fill: 'bg-analytics',
        border: 'border-analytics',
    },
    success: {
        soft: 'bg-success-soft text-success-ink',
        solid: 'bg-success-dot text-white',
        strong: 'bg-success-strong text-white',
        text: 'text-success-dot',
        fill: 'bg-success-dot',
        border: 'border-success-dot',
    },
    warning: {
        soft: 'bg-warning-soft text-warning-ink',
        solid: 'bg-warning-dot text-white',
        strong: 'bg-warning-strong text-white',
        text: 'text-warning-dot',
        fill: 'bg-warning-dot',
        border: 'border-warning-dot',
    },
    danger: {
        soft: 'bg-danger-soft text-danger-ink',
        solid: 'bg-danger-dot text-white',
        strong: 'bg-danger-strong text-white',
        text: 'text-danger-dot',
        fill: 'bg-danger-dot',
        border: 'border-danger-dot',
    },
    info: {
        soft: 'bg-info-soft text-info-ink',
        solid: 'bg-info-dot text-white',
        strong: 'bg-info-strong text-white',
        text: 'text-info-dot',
        fill: 'bg-info-dot',
        border: 'border-info-dot',
    },
    neutral: {
        soft: 'bg-neutral-soft text-neutral-ink',
        solid: 'bg-neutral-dot text-white',
        strong: 'bg-neutral-strong text-white',
        text: 'text-neutral-dot',
        fill: 'bg-neutral-dot',
        border: 'border-neutral-dot',
    },
};

/** Soft background + base-colour icon, the design's "soft icon tile". */
export const softIconClasses: Record<Tone, string> = {
    brand: 'bg-brand-soft text-brand',
    partners: 'bg-partners-soft text-partners',
    finance: 'bg-finance-soft text-finance',
    admin: 'bg-admin-soft text-admin',
    analytics: 'bg-analytics-soft text-analytics',
    success: 'bg-success-soft text-success-dot',
    warning: 'bg-warning-soft text-warning-dot',
    danger: 'bg-danger-soft text-danger-dot',
    info: 'bg-info-soft text-info-dot',
    neutral: 'bg-neutral-soft text-neutral-ink',
};

/** Deterministic domain tone for a name (identity tiles, avatars). */
export function toneFromName(name: string): DomainTone {
    let hash = 0;
    for (const char of name.trim().toLowerCase()) {
        hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    return domainTones[Math.abs(hash) % domainTones.length];
}

/** Up to two initials from a name or email. */
export function initialsFrom(name: string): string {
    const words = name
        .replace(/@.*/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(/[\s._-]+/)
        .filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
