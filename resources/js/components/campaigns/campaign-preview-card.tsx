import { useTranslation } from 'react-i18next';

import { useShortDate } from '@/lib/format';
import {
    initialsFrom,
    toneClasses,
    toneFromName,
    type DomainTone,
} from '@/lib/tones';
import { cn } from '@/lib/utils';

const coverArt: Record<DomainTone, string> = {
    brand: 'bg-brand-soft [background-image:radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--brand-base)_20%,transparent)_0_38px,transparent_39px)]',
    partners:
        'bg-partners-soft [background-image:radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--partners-base)_20%,transparent)_0_38px,transparent_39px)]',
    finance:
        'bg-finance-soft [background-image:radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--finance-base)_20%,transparent)_0_38px,transparent_39px)]',
    admin: 'bg-admin-soft [background-image:radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--admin-base)_20%,transparent)_0_38px,transparent_39px)]',
    analytics:
        'bg-analytics-soft [background-image:radial-gradient(circle_at_85%_20%,color-mix(in_oklab,var(--analytics-base)_20%,transparent)_0_38px,transparent_39px)]',
};
const inkClasses: Record<DomainTone, string> = {
    brand: 'text-brand-ink',
    partners: 'text-partners-ink',
    finance: 'text-finance-ink',
    admin: 'text-admin-ink',
    analytics: 'text-analytics-ink',
};

/**
 * How the campaign will look as a marketplace card while it is being set up.
 * Decorative copy of the publisher card: no links or buttons.
 */
function CampaignPreviewCard({
    name,
    advertiser,
    tags = [],
    startDate,
}: {
    name: string;
    advertiser?: string | null;
    /** Tag labels (already translated). */
    tags?: string[];
    /** yyyy-MM-dd */
    startDate?: string | null;
}) {
    const { t } = useTranslation();
    const shortDate = useShortDate();
    const tone = toneFromName(advertiser || name || 'campaign');
    const byline = [
        advertiser ? t('by {{advertiser}}', { advertiser }) : null,
        startDate ? t('from {{date}}', { date: shortDate(startDate) }) : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <article
            data-slot="campaign-preview-card"
            aria-label={t('Marketplace preview')}
            className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-card"
        >
            <div className={cn('relative h-24', coverArt[tone])}>
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute -bottom-[22px] left-[18px] inline-flex size-14 items-center justify-center rounded-2xl border-4 border-surface text-lg font-extrabold',
                        toneClasses[tone].strong,
                    )}
                >
                    {initialsFrom(advertiser || name || '?')}
                </span>
            </div>
            <div className="flex flex-col gap-1 px-[18px] pt-8 pb-[18px]">
                {tags.length > 0 && (
                    <span
                        className={cn(
                            'text-[11px] font-extrabold tracking-[0.06em] uppercase',
                            inkClasses[tone],
                        )}
                    >
                        {tags.join(' · ')}
                    </span>
                )}
                <strong className="text-[17px] font-extrabold [overflow-wrap:anywhere] text-ink">
                    {name || t('Untitled campaign')}
                </strong>
                {byline && (
                    <span className="text-[13px] text-ink-muted">{byline}</span>
                )}
            </div>
        </article>
    );
}

export { CampaignPreviewCard };
