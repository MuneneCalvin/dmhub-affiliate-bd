import { DetailList, PageHeader, SectionCard } from '@/components/app';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { CommissionPill, offerStatusKey } from '@/components/campaigns';
import { OfferIntegration } from '@/components/offer-integration';
import {
    OfferMaterials,
    type MaterialsPage,
} from '@/components/offer-materials';
import { formatCommission } from '@/components/partner-money';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useMoney } from '@/lib/format';
import advertiser from '@/routes/advertiser';
import type { SharedData, TOffers } from '@/types';
import { OFFER_BONUSES, OFFER_TERMS, TRAFFIC_SOURCES } from '@/utils/enums';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle,
    FileText,
    Gift,
    Image,
    Info,
    Link2,
    Pencil,
    Power,
    PowerOff,
    Settings,
    Tag,
    Trash2,
    Wallet,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Props = SharedData & {
    offer: TOffers & {
        id: number;
        campaign?: { id: number; name: string } | null;
    };
    hasPublishers: boolean;
    materials: MaterialsPage;
};

function Chips({
    values,
    options,
    variant,
    empty,
}: {
    values?: string[];
    options: { value: string; label: string }[];
    variant: 'success' | 'danger' | 'info' | 'neutral';
    empty: string;
}) {
    const { t } = useTranslation();
    if (!values?.length) {
        return <p className="text-sm text-ink-muted">{empty}</p>;
    }
    return (
        <ul className="flex flex-wrap gap-2">
            {values.map((value) => (
                <li key={value}>
                    <Badge variant={variant}>
                        {t(
                            options.find((option) => option.value === value)
                                ?.label ?? value,
                        )}
                    </Badge>
                </li>
            ))}
        </ul>
    );
}

export default function OfferShowPage() {
    const { t } = useTranslation();
    const { auth, offer, hasPublishers, materials } = usePage<Props>().props;
    const url = usePage().url;
    const can = (permission: string) =>
        Boolean(
            auth.user.is_super_admin || auth.permissions?.includes(permission),
        );
    const currency = offer.currency ?? 'EUR';
    const money = useMoney(currency);
    const requestedTab = new URLSearchParams(url.split('?')[1]).get('tab');
    const activeTab = ['materials', 'integration'].includes(requestedTab ?? '')
        ? requestedTab!
        : 'details';
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const hours = (value: number | null) =>
        value == null ? '—' : t('{{count}} hours', { count: Number(value) });
    const bonuses =
        typeof offer.bonus === 'object' && offer.bonus?.bonuses
            ? offer.bonus.bonuses
            : [];

    const actions: ReactNode = can('manage_offers') ? (
        <>
            <Button variant="secondary" asChild>
                <Link href={advertiser.offers.edit.url(offer.id)}>
                    <Pencil />
                    {t('Edit')}
                </Link>
            </Button>
            {offer.offer_status === 'A' ? (
                <Button
                    variant="soft"
                    className="bg-warning-soft text-warning-ink hover:bg-warning-soft/80"
                    onClick={() =>
                        router.patch(advertiser.offers.deactivate.url(offer.id))
                    }
                >
                    <PowerOff />
                    {t('Deactivate')}
                </Button>
            ) : (
                <Button
                    variant="success"
                    onClick={() =>
                        router.patch(advertiser.offers.activate.url(offer.id))
                    }
                >
                    <Power />
                    {t('Activate')}
                </Button>
            )}
            <Button
                variant="destructive"
                disabled={hasPublishers}
                onClick={() => setDeleteDialogOpen(true)}
            >
                <Trash2 />
                {t('Delete')}
            </Button>
        </>
    ) : undefined;

    return (
        <AppLayout>
            <Head title={offer.name} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={offer.name}
                    description={
                        <span className="inline-flex flex-wrap items-center gap-2">
                            <StatusBadge
                                status={offerStatusKey(offer.offer_status)}
                            />
                            {offer.campaign?.name}
                        </span>
                    }
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        {
                            title: offer.campaign?.name ?? t('Campaign'),
                            href: `${advertiser.campaign.show.url(offer.campaign_id)}?tab=offers`,
                        },
                        {
                            title: offer.name,
                            href: advertiser.offers.show.url(offer.id),
                        },
                    ]}
                    icon={<Tag />}
                    tone="brand"
                    actions={actions}
                />
                {hasPublishers && (
                    <Alert variant="warning" role="note">
                        <Info />
                        <AlertDescription>
                            {t(
                                'This offer has active publishers and cannot be deleted. You can deactivate it instead.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}
                <Tabs
                    value={activeTab}
                    onValueChange={(tab) =>
                        router.get(
                            advertiser.offers.show.url(offer.id),
                            { tab },
                            { preserveScroll: true, preserveState: true },
                        )
                    }
                    className="gap-6"
                >
                    <TabsList aria-label={t('Offer sections')}>
                        <TabsTrigger
                            value="details"
                            icon={<Info className="text-brand" />}
                        >
                            {t('Offer details')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="materials"
                            icon={<Image className="text-admin" />}
                            count={materials.total}
                        >
                            {t('Promotional materials')}
                        </TabsTrigger>
                        <TabsTrigger
                            value="integration"
                            icon={<Link2 className="text-analytics" />}
                        >
                            {t('Integration')}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <div className="grid gap-[18px] lg:grid-cols-2">
                            <SectionCard
                                title={t('Basic information')}
                                icon={<Info />}
                                tone="brand"
                            >
                                <DetailList
                                    rows={[
                                        {
                                            label: t('Status'),
                                            value: (
                                                <StatusBadge
                                                    status={offerStatusKey(
                                                        offer.offer_status,
                                                    )}
                                                />
                                            ),
                                        },
                                        { label: t('Name'), value: offer.name },
                                        {
                                            label: t('Description'),
                                            value: offer.description,
                                        },
                                        {
                                            label: t('Minimum payout'),
                                            value: money(
                                                Number(
                                                    offer.minimum_payout ?? 0,
                                                ),
                                            ),
                                        },
                                    ]}
                                />
                            </SectionCard>
                            <SectionCard
                                title={t('Commissions')}
                                icon={<Wallet />}
                                tone="finance"
                            >
                                {offer.commissions?.length ? (
                                    <DetailList
                                        rows={offer.commissions.map(
                                            (commission, index) => ({
                                                key: String(commission.id),
                                                label:
                                                    commission.commission_type
                                                        ?.nice_name ??
                                                    `${t('Commission')} ${index + 1}`,
                                                value: (
                                                    <span className="inline-flex items-center gap-2 font-bold tabular-nums">
                                                        {commission
                                                            .commission_type
                                                            ?.name && (
                                                            <CommissionPill
                                                                type={
                                                                    commission
                                                                        .commission_type
                                                                        .name
                                                                }
                                                            />
                                                        )}
                                                        {formatCommission(
                                                            commission.commission_value,
                                                            commission
                                                                .commission_type
                                                                ?.name,
                                                            currency,
                                                        )}
                                                    </span>
                                                ),
                                            }),
                                        )}
                                    />
                                ) : (
                                    <p className="text-sm text-ink-muted">
                                        {t('No commissions configured')}
                                    </p>
                                )}
                            </SectionCard>
                            <SectionCard
                                title={t('Tracking settings')}
                                icon={<Settings />}
                                tone="analytics"
                            >
                                <DetailList
                                    rows={[
                                        {
                                            label: t('Conversion window'),
                                            value: hours(
                                                offer.conversion_window_hours,
                                            ),
                                        },
                                        {
                                            label: t('Cookie lifetime'),
                                            value: hours(
                                                offer.click_cookie_lifetime_hours,
                                            ),
                                        },
                                        {
                                            label: t('Landing page URL'),
                                            value: offer.preview_url ? (
                                                <span className="break-all">
                                                    {offer.preview_url}
                                                </span>
                                            ) : null,
                                        },
                                        {
                                            label: t('Tracking URL template'),
                                            value: offer.tracking_url_template ? (
                                                <code className="font-mono text-xs break-all">
                                                    {
                                                        offer.tracking_url_template
                                                    }
                                                </code>
                                            ) : null,
                                        },
                                    ]}
                                />
                            </SectionCard>
                            <SectionCard
                                title={t('Bonuses')}
                                icon={<Gift />}
                                tone="admin"
                            >
                                <Chips
                                    values={bonuses}
                                    options={OFFER_BONUSES}
                                    variant="success"
                                    empty={t('No bonuses configured')}
                                />
                            </SectionCard>
                            <SectionCard
                                title={t('Allowed traffic sources')}
                                icon={<CheckCircle />}
                                tone="success"
                            >
                                <Chips
                                    values={
                                        offer.allowed_traffic_sources?.sources
                                    }
                                    options={TRAFFIC_SOURCES}
                                    variant="info"
                                    empty={t('All traffic sources allowed')}
                                />
                            </SectionCard>
                            <SectionCard
                                title={t('Prohibited traffic sources')}
                                icon={<Ban />}
                                tone="danger"
                            >
                                <Chips
                                    values={
                                        offer.prohibited_traffic_sources
                                            ?.sources
                                    }
                                    options={TRAFFIC_SOURCES}
                                    variant="danger"
                                    empty={t('No prohibited traffic sources')}
                                />
                            </SectionCard>
                            <SectionCard
                                title={t('Terms & conditions')}
                                icon={<FileText />}
                                tone="neutral"
                                className="lg:col-span-2"
                            >
                                <Chips
                                    values={offer.terms?.terms}
                                    options={OFFER_TERMS}
                                    variant="neutral"
                                    empty={t('No specific terms configured')}
                                />
                            </SectionCard>
                        </div>
                    </TabsContent>
                    <TabsContent value="materials">
                        <OfferMaterials
                            offerId={offer.id}
                            materials={materials}
                            canUpload={can('upload_creatives')}
                            canManage={can('manage_creatives')}
                        />
                    </TabsContent>
                    <TabsContent value="integration">
                        <OfferIntegration offer={offer} />
                    </TabsContent>
                </Tabs>
            </div>
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={t('Delete offer')}
                description={t(
                    'Are you sure you want to delete this offer? This action cannot be undone.',
                )}
                confirmLabel={t('Delete')}
                cancelLabel={t('Cancel')}
                variant="destructive"
                onConfirm={() =>
                    router.delete(advertiser.offers.delete.url(offer.id))
                }
            />
        </AppLayout>
    );
}
