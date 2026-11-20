import { EmptyState, MetricTile } from '@/components/app';
import { formatCommission } from '@/components/partner-money';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import { useMoney } from '@/lib/format';
import publishers from '@/routes/publishers';
import { campaignEnd, campaignRoi } from '@/utils/campaign-display';
import { termsText } from '@/utils/partner-terms';
import { formatDate } from '@/utils/utils';
import { Link } from '@inertiajs/react';
import { ExternalLink, Megaphone, Target } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cookieWindow } from './format';
import {
    applicationStatus,
    canApply,
    type MarketplaceCampaign,
    type MarketplaceOffer,
} from './types';

type CampaignSheetProps = {
    campaign: MarketplaceCampaign | null;
    onOpenChange: (open: boolean) => void;
};

/** Campaign details beside the marketplace, with the apply / tracking action. */
export function CampaignSheet({ campaign, onOpenChange }: CampaignSheetProps) {
    return (
        <Sheet open={campaign !== null} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full gap-0 sm:max-w-[640px]"
            >
                {campaign && <CampaignSheetBody campaign={campaign} />}
            </SheetContent>
        </Sheet>
    );
}

function CampaignSheetBody({ campaign }: { campaign: MarketplaceCampaign }) {
    const { t } = useTranslation();
    const currency = campaign.currency || 'EUR';
    const money = useMoney(currency);
    const offers = campaign.offers ?? [];
    const enrollment = campaign.enrollment;
    const budget = Number(campaign.total_budget ?? 0);
    const spent = Number(campaign.spent_amount ?? 0);

    return (
        <>
            <SheetHeader icon={<Megaphone />} tone="brand">
                <SheetTitle>{campaign.name}</SheetTitle>
                <SheetDescription>
                    {[
                        campaign.advertiser?.business_name,
                        campaign.geo_targeting?.value || t('Global'),
                        campaign.device_targeting?.value || t('All devices'),
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={campaign.campaign_status} />
                    <StatusBadge status={applicationStatus(campaign)} />
                </div>
                {enrollment?.rejection_reason && (
                    <p className="rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger-ink">
                        {enrollment.rejection_reason}
                    </p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MetricTile
                        tone="finance"
                        label={t('Total Budget')}
                        value={money(budget)}
                    />
                    <MetricTile
                        tone="neutral"
                        label={t('Spent')}
                        value={money(spent)}
                    />
                    <MetricTile
                        tone="success"
                        label={t('Available')}
                        value={money(budget - spent)}
                    />
                </div>
                {campaign.description && (
                    <Section title={t('Campaign Description')}>
                        <p className="text-sm leading-relaxed text-ink-muted">
                            {campaign.description}
                        </p>
                    </Section>
                )}
                <Section title={t('Campaign Details')}>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                        <Fact label={t('Start Date')}>
                            {formatDate(campaign.start_date ?? '')}
                        </Fact>
                        <Fact label={t('End Date')}>
                            {campaignEnd(campaign.end_date, t('No end date'))}
                        </Fact>
                        <Fact label={t('Daily Budget')}>
                            {money(Number(campaign.daily_budget ?? 0))}
                        </Fact>
                        <Fact label={t('Currency')}>{currency}</Fact>
                        <Fact label={t('Max Publishers')}>
                            {campaign.max_publishers || t('Unlimited')}
                        </Fact>
                        <Fact label={t('Target ROI')}>
                            {campaignRoi(campaign.target_roi, t('Not set'))}
                        </Fact>
                        <Fact label={t('Target Conversions')}>
                            {campaign.target_conversions || t('Not set')}
                        </Fact>
                        {campaign.minimum_payout != null && (
                            <Fact label={t('Minimum Payout')}>
                                {money(Number(campaign.minimum_payout))}
                            </Fact>
                        )}
                    </dl>
                </Section>
                {(campaign.allowed_traffic_sources ||
                    campaign.prohibited_traffic_sources) && (
                    <Section title={t('Targeting & Requirements')}>
                        <dl className="grid gap-3">
                            {campaign.allowed_traffic_sources && (
                                <Fact label={t('Allowed Traffic')}>
                                    {campaign.allowed_traffic_sources}
                                </Fact>
                            )}
                            {campaign.prohibited_traffic_sources && (
                                <Fact label={t('Prohibited Traffic')}>
                                    <span className="text-danger-ink">
                                        {campaign.prohibited_traffic_sources}
                                    </span>
                                </Fact>
                            )}
                        </dl>
                    </Section>
                )}
                {Boolean(campaign.terms) && (
                    <Section title={t('Terms & Conditions')}>
                        <p className="text-sm leading-relaxed text-ink-muted">
                            {termsText(campaign.terms as never)}
                        </p>
                    </Section>
                )}
                <Section
                    title={t('Available Offers')}
                    description={t('{{count}} offers available', {
                        count: offers.length,
                    })}
                >
                    {offers.length ? (
                        <ul className="space-y-3">
                            {offers.map((offer) => (
                                <OfferItem
                                    key={offer.id}
                                    offer={offer}
                                    currency={currency}
                                />
                            ))}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<Target />}
                            title={t('No Offers Available')}
                            description={t(
                                "This campaign doesn't have any active offers at the moment. Apply to the campaign and the network will assign you to an offer.",
                            )}
                        />
                    )}
                </Section>
            </div>
            <SheetFooter>
                {enrollment?.status === 'A' ? (
                    <Button asChild variant="soft" tone="partners">
                        <Link
                            href={publishers.my.campaign.show.url(
                                enrollment.id,
                            )}
                        >
                            {t('Get links')}
                        </Link>
                    </Button>
                ) : canApply(campaign) ? (
                    <Button asChild>
                        <Link
                            href={publishers.campaign.application.url({
                                id: campaign.id,
                            })}
                        >
                            {t(
                                enrollment?.status === 'R'
                                    ? 'Reapply'
                                    : enrollment?.status === 'P'
                                      ? 'Review application terms'
                                      : 'Apply to Campaign',
                            )}
                        </Link>
                    </Button>
                ) : null}
            </SheetFooter>
        </>
    );
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-base font-bold">{title}</h3>
                {description && (
                    <p className="text-[13px] text-ink-muted">{description}</p>
                )}
            </div>
            {children}
        </section>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
            <dd className="text-sm font-semibold">{children}</dd>
        </div>
    );
}

function OfferItem({
    offer,
    currency,
}: {
    offer: MarketplaceOffer;
    currency: string;
}) {
    const { t } = useTranslation();
    const commissions = [
        [offer.commission_type_1, offer.commission_value_1],
        [offer.commission_type_2, offer.commission_value_2],
    ].filter(([type]) => type);
    return (
        <li className="space-y-3 rounded-[14px] border border-border p-4">
            <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold">{offer.name}</h4>
                <StatusBadge status={offer.offer_status} />
            </div>
            {offer.description && (
                <p className="line-clamp-2 text-sm text-ink-muted">
                    {offer.description}
                </p>
            )}
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-4">
                {commissions.map(([type, value]) => (
                    <Fact key={String(type)} label={String(type)}>
                        <span className="text-brand-ink">
                            {formatCommission(value, type, currency)}
                        </span>
                    </Fact>
                ))}
                <Fact label={t('Cookie')}>
                    {cookieWindow(offer.click_cookie_lifetime_hours, t)}
                </Fact>
                <Fact label={t('Conversion window')}>
                    {offer.conversion_window_hours
                        ? t('{{count}} hours', {
                              count: offer.conversion_window_hours,
                          })
                        : '—'}
                </Fact>
            </dl>
            <div className="flex flex-wrap items-center gap-2">
                {offer.preview_url && (
                    <Button asChild variant="secondary" size="sm">
                        <a
                            href={offer.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink aria-hidden="true" />
                            {t('Preview')}
                        </a>
                    </Button>
                )}
                {Boolean(offer.bonus) && (
                    <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning-ink">
                        {t('Bonus')}: {String(offer.bonus)}
                    </span>
                )}
            </div>
        </li>
    );
}
