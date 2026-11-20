import type { DomainTone } from '@/lib/tones';

/** Library filter keys. `banner` also covers the legacy `image` type. */
export type CreativeKind = 'banner' | 'text' | 'email' | 'html' | 'video';
export type CreativeFilter = 'all' | CreativeKind;

export const CREATIVE_KINDS: CreativeKind[] = [
    'banner',
    'text',
    'email',
    'html',
    'video',
];

/** English source strings (pass through `t()`). */
export const CREATIVE_KIND_META: Record<
    CreativeKind,
    { label: string; plural: string; tone: DomainTone }
> = {
    banner: { label: 'Banner', plural: 'Banners', tone: 'admin' },
    text: { label: 'Text link', plural: 'Text links', tone: 'analytics' },
    email: { label: 'Email', plural: 'Email', tone: 'finance' },
    html: { label: 'HTML', plural: 'HTML', tone: 'brand' },
    video: { label: 'Video', plural: 'Video', tone: 'partners' },
};

export function creativeKind(type: string | null | undefined): CreativeKind {
    if (type === 'image') return 'banner';
    return CREATIVE_KINDS.includes(type as CreativeKind)
        ? (type as CreativeKind)
        : 'banner';
}

/** Types whose main asset is an image (dimensions read from the file). */
export function isImageKind(type: string | null | undefined) {
    return ['banner', 'image', 'email'].includes(type ?? '');
}

/**
 * Upload limits. They mirror `CreativesController::saveCreative` validation
 * (`mimes:jpg,jpeg,png,gif,webp|max:10240`, video `mimes:mp4,webm|max:51200`).
 */
export const IMAGE_UPLOAD = {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    maxMb: 10,
    error: 'Choose a JPG, PNG, GIF or WebP image up to 10 MB.',
    hint: 'JPG, PNG, GIF or WebP · max 10 MB',
} as const;

export const VIDEO_UPLOAD = {
    mimeTypes: ['video/mp4', 'video/webm'],
    accept: 'video/mp4,video/webm',
    maxMb: 50,
    error: 'Choose an MP4 or WebM file up to 50 MB.',
    hint: 'MP4 or WebM · max 50 MB',
} as const;

export type UploadRules = typeof IMAGE_UPLOAD | typeof VIDEO_UPLOAD;

/** Returns the (untranslated) error message, or null when the file is accepted. */
export function uploadError(file: File, rules: UploadRules): string | null {
    const types: readonly string[] = rules.mimeTypes;
    if (!types.includes(file.type) || file.size > rules.maxMb * 1024 * 1024) {
        return rules.error;
    }
    return null;
}

/** "728×90", or null when the creative has no dimensions. */
export function creativeSize(creative: {
    width?: number | string | null;
    height?: number | string | null;
}) {
    return creative.width && creative.height
        ? `${creative.width}×${creative.height}`
        : null;
}

/** Image to show for a creative card, if any. */
export function creativeThumbnail(creative: {
    type: string;
    file_url?: string | null;
    preview_url?: string | null;
}) {
    return (
        creative.preview_url ||
        (isImageKind(creative.type) ? creative.file_url : '') ||
        ''
    );
}
