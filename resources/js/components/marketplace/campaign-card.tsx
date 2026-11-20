import { formatCommission } from '@/components/partner-money';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMoney } from '@/lib/format';
import {
    initialsFrom,
    toneClasses,
    toneFromName,
    type DomainTone,
} from '@/lib/tones';
import { cn } from '@/lib/utils';
import publishers from '@/routes/publishers';
import { Link } from '@inertiajs/react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cookieWindow } from './format';
import {
    applicationStatus,
    campaignCta,
    canApply,
    type MarketplaceCampaign,
} from './types';

/** Decorative cover tint per domain tone (soft background + two base circles). */
const cover: Record<DomainTone, string> = {
    brand: 'bg-brand-soft text-brand',
    partners: 'bg-partners-soft text-partners',
    finance: 'bg-finance-soft text-finance',
    admin: 'bg-admin-soft text-admin',
    analytics: 'bg-analytics-soft text-analytics',
};

const ink: Record<DomainTone, string> = {
    brand: 'text-brand-ink',
    partners: 'text-partners-ink',
    finance: 'text-finance-ink',
    admin: 'text-admin-ink',
    analytics: 'text-analytics-ink',
};

/** The campaign's category colour: its advertiser's industry, else its advertiser. */
export function campaignTone(campaign: MarketplaceCampaign): DomainTone {
    return toneFromName(
        campaign.advertiser?.industry ||
            campaign.advertiser?.business_name ||
            campaign.name,
    );
}

type CampaignCardProps = {
    campaign: MarketplaceCampaign;
    onDetails: (campaign: MarketplaceCampaign) => void;
};

export function CampaignCard({ campaign, onDetails }: CampaignCardProps) {
    const { t } = useTranslation();
    const currency = campaign.currency || 'EUR';
    const money = useMoney(currency);
    const tone = campaignTone(campaign);
    const advertiserName = campaign.advertiser?.business_name;
    const offers = campaign.offers ?? [];
    const first = offers[0];
    const cookieHours = Math.max(
        0,
        ...offers.map((offer) =>
            Number(offer.click_cookie_lifetime_hours ?? 0),
        ),
    );
    const cta = campaignCta(campaign);
    const status = applicationStatus(campaign);

    return (
        <article
            data-slot="campaign-card"
            aria-labelledby={`campaign-${campaign.id}-title`}
            className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-card"
        >
            <div className={cn('relative h-[104px]', cover[tone])}>
                <svg
                    aria-hidden="true"
                    className="absolute inset-0 size-full"
                    preserveAspectRatio="none"
                >
                    <circle
                        cx="85%"
                        cy="20%"
                        r="38"
                        fill="currentColor"
                        opacity="0.2"
                    />
                    <circle
                        cx="70%"
                        cy="110%"
                        r="60"
                        fill="currentColor"
                        opacity="0.15"
                    />
                </svg>
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute -bottom-[22px] left-[18px] inline-flex size-14 items-center justify-center rounded-2xl border-4 border-surface text-lg font-extrabold',
                        toneClasses[tone].strong,
                    )}
                >
                    {initialsFrom(advertiserName || campaign.name)}
                </span>
                <StatusBadge
                    status={status}
                    className={cn(
                        'absolute top-3.5 right-3.5',
                        !campaign.enrollment && 'bg-surface',
                    )}
                />
            </div>
            <div className="flex flex-col gap-1 px-[18px] pt-[34px]">
                {campaign.advertiser?.industry && (
                    <span
                        className={cn(
                            'self-start text-[11px] font-extrabold tracking-[0.06em] uppercase',
                            ink[tone],
                        )}
                    >
                        {campaign.advertiser.industry}
                    </span>
                )}
                <h3
                    id={`campaign-${campaign.id}-title`}
                    className="text-[17px] font-extrabold tracking-[-0.01em]"
                >
                    <button
                        type="button"
                        onClick={() => onDetails(campaign)}
                        aria-label={`${t('View details')}: ${campaign.name}`}
                        className="rounded-md text-left hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        {campaign.name}
                    </button>
                </h3>
                {advertiserName && (
                    <span className="text-[13px] text-ink-muted">
                        {t('by {{advertiser}}', { advertiser: advertiserName })}
                    </span>
                )}
            </div>
            <dl className="mx-[18px] mt-3.5 grid grid-cols-3 gap-2 rounded-[14px] bg-canvas px-3.5 py-3">
                <div className="flex min-w-0 flex-col">
                    <dt className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                        {t('Payout')}
                    </dt>
                    <dd className="truncate text-[15px] font-bold text-brand-ink tabular-nums">
                        {first
                            ? `${formatCommission(first.commission_value_1, first.commission_type_1, currency)}${first.commission_type_1 ? ` ${first.commission_type_1}` : ''}`
                            : '—'}
                    </dd>
                </div>
                <div className="flex min-w-0 flex-col">
                    <dt className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                        <abbr
                            title={t('Earnings per click')}
                            className="no-underline"
                        >
                            {t('EPC')}
                        </abbr>
                    </dt>
                    <dd className="truncate text-[15px] font-bold tabular-nums">
                        {campaign.epc != null ? money(campaign.epc) : '—'}
                    </dd>
                </div>
                <div className="flex min-w-0 flex-col">
                    <dt className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                        {t('Cookie')}
                    </dt>
                    <dd className="truncate text-[15px] font-bold tabular-nums">
                        {cookieWindow(cookieHours, t)}
                    </dd>
                </div>
            </dl>
            <div className="mt-auto flex flex-wrap items-center gap-2.5 px-[18px] pt-3.5 pb-[18px]">
                <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs text-ink-muted">
                    <Globe
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-analytics"
                    />
                    <span className="truncate">
                        {campaign.geo_targeting?.value || t('Global')}
                    </span>
                </span>
                {cta === 'apply' && canApply(campaign) ? (
                    <Button asChild>
                        <Link
                            href={publishers.campaign.application.url({
                                id: campaign.id,
                            })}
                            aria-label={`${t('Apply')}: ${campaign.name}`}
                        >
                            {t('Apply')}
                        </Link>
                    </Button>
                ) : cta === 'links' && campaign.enrollment ? (
                    <Button asChild variant="soft" tone="partners">
                        <Link
                            href={publishers.my.campaign.show.url(
                                campaign.enrollment.id,
                            )}
                            aria-label={`${t('Get links')}: ${campaign.name}`}
                        >
                            {t('Get links')}
                        </Link>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onDetails(campaign)}
                    >
                        {t('View details')}
                    </Button>
                )}
            </div>
        </article>
    );
}
