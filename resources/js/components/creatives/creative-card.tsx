import { Link } from '@inertiajs/react';
import { Check, Code2, MousePointerClick, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useCopyToast } from '@/hooks/use-copy-toast';
import { toneClasses } from '@/lib/tones';
import { cn } from '@/lib/utils';

import { CreativePreview } from './creative-preview';
import {
    CREATIVE_KIND_META,
    creativeKind,
    creativeSize,
    creativeThumbnail,
} from './creative-types';

/** Coloured type label ("Banner", "Text link", …). */
function CreativeTypePill({
    type,
    className,
}: {
    type: string;
    className?: string;
}) {
    const { t } = useTranslation();
    const meta = CREATIVE_KIND_META[creativeKind(type)];
    return (
        <span
            data-slot="creative-type"
            className={cn(
                'inline-flex shrink-0 rounded-[8px] px-2 py-0.5 text-[11px] font-extrabold',
                toneClasses[meta.tone].soft,
                className,
            )}
        >
            {t(meta.label)}
        </span>
    );
}

export type CreativeCardData = {
    id: number;
    name: string;
    type: string;
    width?: number | string | null;
    height?: number | string | null;
    file_url?: string | null;
    preview_url?: string | null;
    alt_text?: string | null;
    clicks?: number | null;
    embed_code?: string | null;
    campaign?: { id: number; name: string } | null;
};

type CreativeCardProps = React.ComponentProps<'article'> & {
    creative: CreativeCardData;
    /** Details page for the name link. */
    href: string;
    /** Edit page; the edit button is hidden without it. */
    editHref?: string;
    /** Shows a delete button (the caller confirms). */
    onDelete?: () => void;
};

/** Library tile: real preview, size badge, type, campaign, clicks, copy + edit. */
function CreativeCard({
    creative,
    href,
    editHref,
    onDelete,
    className,
    ...props
}: CreativeCardProps) {
    const { t, i18n } = useTranslation();
    const { copied, copy } = useCopyToast();
    const kind = creativeKind(creative.type);
    const size =
        creativeSize(creative) ??
        (kind === 'text' ? t('Text') : kind === 'html' ? 'HTML' : null);
    const clicks = new Intl.NumberFormat(i18n.language).format(
        Number(creative.clicks ?? 0),
    );

    return (
        <article
            data-slot="creative-card"
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-card',
                className,
            )}
            {...props}
        >
            <CreativePreview
                type={creative.type}
                name={creative.name}
                imageUrl={creativeThumbnail(creative)}
                altText={creative.alt_text}
                badge={size}
            />
            <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                    <CreativeTypePill type={creative.type} />
                    {creative.campaign?.name && (
                        <span className="truncate text-xs text-ink-muted">
                            {creative.campaign.name}
                        </span>
                    )}
                </div>
                <h3 className="text-[15px] leading-snug font-bold break-words">
                    <Link
                        href={href}
                        className="rounded-sm text-ink hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        {creative.name}
                    </Link>
                </h3>
                <div className="mt-auto flex items-center gap-2 text-xs text-ink-muted">
                    <MousePointerClick
                        className="size-3.5 text-analytics"
                        aria-hidden="true"
                    />
                    <span className="flex-1 tabular-nums">
                        {Number(creative.clicks ?? 0) === 1
                            ? t('{{value}} click', { value: clicks })
                            : t('{{value}} clicks', { value: clicks })}
                    </span>
                    {creative.embed_code && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon-sm"
                            aria-label={t('Copy embed code for {{name}}', {
                                name: creative.name,
                            })}
                            onClick={() =>
                                copy(
                                    creative.embed_code ?? '',
                                    t('Embed code copied'),
                                )
                            }
                        >
                            {copied ? <Check /> : <Code2 />}
                        </Button>
                    )}
                    {editHref && (
                        <Button
                            asChild
                            variant="soft"
                            size="icon-sm"
                            aria-label={t('Edit {{name}}', {
                                name: creative.name,
                            })}
                        >
                            <Link href={editHref}>
                                <Pencil />
                            </Link>
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('Delete {{name}}', {
                                name: creative.name,
                            })}
                            onClick={onDelete}
                        >
                            <Trash2 className="text-danger-dot" />
                        </Button>
                    )}
                </div>
            </div>
        </article>
    );
}

export { CreativeCard, CreativeTypePill };
