import { Code2, Film, ImageIcon, Link2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { creativeKind, isImageKind } from './creative-types';

type CreativePreviewProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    type: string;
    name: string;
    /** Image to show (the uploaded banner, or a poster/preview image). */
    imageUrl?: string | null;
    /** Video file for video creatives. */
    videoUrl?: string | null;
    altText?: string | null;
    /** Size badge in the top-left corner ("728×90"). */
    badge?: React.ReactNode;
    /** `card` = 170px library tile, `panel` = larger detail/form preview. */
    size?: 'card' | 'panel';
    /** Video gets native controls in the panel size. */
    controls?: boolean;
    onMediaLoad?: (width: number, height: number) => void;
    onMediaError?: () => void;
};

/**
 * Preview area for a creative: the real image or video when there is one,
 * the link text for text links, otherwise a type icon. HTML is never
 * executed here.
 */
function CreativePreview({
    type,
    name,
    imageUrl,
    videoUrl,
    altText,
    badge,
    size = 'card',
    controls = size === 'panel',
    onMediaLoad,
    onMediaError,
    className,
    ...props
}: CreativePreviewProps) {
    const { t } = useTranslation();
    const kind = creativeKind(type);
    const panel = size === 'panel';
    const Icon =
        kind === 'text'
            ? Link2
            : kind === 'html'
              ? Code2
              : kind === 'video'
                ? Film
                : ImageIcon;

    let content: React.ReactNode;
    if (kind === 'video' && videoUrl) {
        content = (
            <video
                key={videoUrl}
                src={videoUrl}
                poster={imageUrl || undefined}
                controls={controls}
                muted={!controls}
                preload="metadata"
                className="max-h-full max-w-full rounded-[10px]"
                onLoadedMetadata={(event) =>
                    onMediaLoad?.(
                        event.currentTarget.videoWidth,
                        event.currentTarget.videoHeight,
                    )
                }
                onError={onMediaError}
            />
        );
    } else if (imageUrl) {
        content = (
            <img
                src={imageUrl}
                alt={altText || name}
                loading="lazy"
                className="max-h-full max-w-full rounded-[10px] object-contain"
                onLoad={(event) =>
                    onMediaLoad?.(
                        event.currentTarget.naturalWidth,
                        event.currentTarget.naturalHeight,
                    )
                }
                onError={onMediaError}
            />
        );
    } else if (kind === 'text') {
        content = (
            <span className="max-w-full rounded-[12px] bg-surface px-4 py-3 text-center font-semibold break-words text-brand-ink underline underline-offset-4 shadow-card">
                {altText || name || t('Your link text will appear here.')}
            </span>
        );
    } else {
        content = (
            <span className="flex flex-col items-center gap-2 text-center text-[13px] text-ink-muted">
                <Icon className="size-8 text-ink-muted/70" aria-hidden="true" />
                {kind === 'html' && panel
                    ? t(
                          'Custom HTML is saved as source code and is not executed in this preview.',
                      )
                    : !isImageKind(type) && kind !== 'html' && panel
                      ? t('Your uploaded material will appear here.')
                      : null}
            </span>
        );
    }

    return (
        <div
            data-slot="creative-preview"
            className={cn(
                'relative flex items-center justify-center overflow-hidden bg-canvas p-4',
                panel ? 'min-h-56 rounded-[16px] sm:min-h-64' : 'h-[170px]',
                className,
            )}
            {...props}
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -left-8 size-32 rounded-full bg-brand/8"
            />
            <div
                className={cn(
                    'relative flex h-full w-full items-center justify-center',
                    panel ? 'max-h-80' : 'max-h-[138px]',
                )}
            >
                {content}
            </div>
            {badge && (
                <span className="absolute top-3 left-3 rounded-[8px] bg-sidebar/80 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                    {badge}
                </span>
            )}
        </div>
    );
}

export { CreativePreview };
