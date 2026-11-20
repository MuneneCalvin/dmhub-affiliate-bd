import { OfferIntegration } from '@/components/offer-integration';
import {
    OfferMaterials,
    type MaterialsPage,
} from '@/components/offer-materials';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatCommission } from '@/components/partner-money';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    ConfirmationDialog,
    InfoCardSkeleton,
    InfoRow,
    ReusablePageTitle,
} from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, TOffers } from '@/types';
import { OFFER_BONUSES, OFFER_TERMS, TRAFFIC_SOURCES } from '@/utils/enums';
import { formatCurrency } from '@/utils/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle,
    DollarSign,
    Edit,
    FileText,
    Gift,
    Info,
    Power,
    PowerOff,
    Settings,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const OfferShowPage = () => {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const can = (permission: string) =>
        Boolean(
            auth.user.is_super_admin || auth.permissions?.includes(permission),
        );
    const { offer, hasPublishers, materials } = usePage<{
        offer: TOffers;
        hasPublishers: boolean;
        materials: MaterialsPage;
    }>().props;
    const requestedTab = new URLSearchParams(usePage().url.split('?')[1]).get(
        'tab',
    );
    const activeTab = ['materials', 'integration'].includes(requestedTab ?? '')
        ? requestedTab!
        : 'details';
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Campaigns'), href: advertiser.campaign.index.url() },
        {
            title: t('Campaign'),
            href: advertiser.campaign.show.url(offer?.campaign_id),
        },
        { title: offer?.name, href: '' },
    ];

    const getLabelFromValue = (
        value: string,
        options: { value: string; label: string }[],
    ) => {
        return options.find((opt) => opt.value === value)?.label ?? value;
    };

    const handleActivate = () => {
        router.patch(advertiser.offers.activate.url(Number(offer?.id)));
    };

    const handleDeactivate = () => {
        router.patch(advertiser.offers.deactivate.url(Number(offer?.id)));
    };

    const handleDelete = () => {
        router.delete(advertiser.offers.delete.url(Number(offer?.id)));
    };

    return (
        <AppLayout>
            <Head title={offer?.name} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={offer?.name}
                    description={t('View and manage this offer')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex justify-end gap-2">
                            {can('manage_offers') && (
                                <>
                                    <Link
                                        href={advertiser.offers.edit.url(
                                            Number(offer?.id),
                                        )}
                                    >
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            {t('Edit')}
                                        </Button>
                                    </Link>

                                    {offer?.offer_status === 'A' ? (
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={handleDeactivate}
                                        >
                                            <PowerOff className="h-4 w-4" />
                                            {t('Deactivate')}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={handleActivate}
                                        >
                                            <Power className="h-4 w-4" />
                                            {t('Activate')}
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        className="gap-2"
                                        disabled={hasPublishers}
                                        onClick={() =>
                                            setDeleteDialogOpen(true)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        {t('Delete')}
                                    </Button>
                                    <ConfirmationDialog
                                        open={deleteDialogOpen}
                                        onOpenChange={setDeleteDialogOpen}
                                        title={t('Delete Offer')}
                                        description={t(
                                            'Are you sure you want to delete this offer? This action cannot be undone.',
                                        )}
                                        confirmLabel={t('Delete')}
                                        cancelLabel={t('Cancel')}
                                        variant="destructive"
                                        onConfirm={handleDelete}
                                    />
                                </>
                            )}
                        </div>
                    }
                />
                {hasPublishers && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800">
                        {t(
                            'This offer has active publishers and cannot be deleted. You can deactivate it instead.',
                        )}
                    </div>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={(tab) =>
                        router.get(
                            advertiser.offers.show.url(Number(offer.id)),
                            { tab },
                            { preserveScroll: true, preserveState: true },
                        )
                    }
                >
                    <TabsList
                        aria-label={t('Offer sections')}
                        className="h-auto w-full flex-wrap justify-start"
                    >
                        <TabsTrigger value="details">
                            {t('Offer details')}
                        </TabsTrigger>
                        <TabsTrigger value="materials">
                            {t('Promotional materials')} ({materials.total})
                        </TabsTrigger>
                        <TabsTrigger value="integration">
                            {t('Integration')}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <InfoCardSkeleton
                                title={t('Basic Information')}
                                description={t('Core offer details')}
                                icon={<Info className="h-5 w-5" />}
                                children={
                                    <>
                                        <InfoRow
                                            label={t('Status')}
                                            value={
                                                <StatusBadge
                                                    status={offer?.offer_status}
                                                />
                                            }
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Name')}
                                            value={offer?.name}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Description')}
                                            value={offer?.description ?? '-'}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Minimum Payout')}
                                            value={formatCurrency(
                                                Number(
                                                    offer?.minimum_payout ?? 0,
                                                ),
                                                offer.currency,
                                            )}
                                            icon={DollarSign}
                                        />
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Commission Settings')}
                                description={t(
                                    'Commission structure for this offer',
                                )}
                                icon={<DollarSign className="h-5 w-5" />}
                                children={
                                    <>
                                        {offer?.commissions &&
                                        offer?.commissions.length > 0 ? (
                                            offer?.commissions.map(
                                                (comm, idx) => (
                                                    <div key={comm.id}>
                                                        <InfoRow
                                                            label={
                                                                comm
                                                                    .commission_type
                                                                    ?.nice_name ??
                                                                `${t('Commission')} ${idx + 1}`
                                                            }
                                                            value={formatCommission(
                                                                comm.commission_value,
                                                                comm
                                                                    .commission_type
                                                                    ?.name,
                                                                offer.currency,
                                                            )}
                                                        />
                                                        {idx <
                                                            offer?.commissions!
                                                                .length -
                                                                1 && (
                                                            <Separator />
                                                        )}
                                                    </div>
                                                ),
                                            )
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {t('No commissions configured')}
                                            </span>
                                        )}
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Tracking Settings')}
                                description={t(
                                    'Conversion and cookie settings',
                                )}
                                icon={<Settings className="h-5 w-5" />}
                                children={
                                    <>
                                        <InfoRow
                                            label={t('Conversion Window')}
                                            value={`${offer?.conversion_window_hours ?? '-'} ${t('hours')}`}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Cookie Lifetime')}
                                            value={`${offer?.click_cookie_lifetime_hours ?? '-'} ${t('hours')}`}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Landing page URL')}
                                            value={offer?.preview_url ?? '-'}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Tracking URL Template')}
                                            value={
                                                offer?.tracking_url_template ??
                                                '-'
                                            }
                                        />
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Bonus Types')}
                                description={t(
                                    'Available bonuses for publishers',
                                )}
                                icon={<Gift className="h-5 w-5" />}
                                children={
                                    <>
                                        {typeof offer?.bonus === 'object' &&
                                        offer?.bonus?.bonuses &&
                                        offer?.bonus.bonuses.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {offer?.bonus.bonuses.map(
                                                    (bonus: string) => (
                                                        <span
                                                            key={bonus}
                                                            className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-800"
                                                        >
                                                            {getLabelFromValue(
                                                                bonus,
                                                                OFFER_BONUSES,
                                                            )}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {t('No bonuses configured')}
                                            </span>
                                        )}
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Allowed Traffic Sources')}
                                description={t('Permitted traffic types')}
                                icon={<CheckCircle className="h-5 w-5" />}
                                children={
                                    <>
                                        {offer?.allowed_traffic_sources
                                            ?.sources &&
                                        offer?.allowed_traffic_sources.sources
                                            .length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {offer?.allowed_traffic_sources.sources.map(
                                                    (source) => (
                                                        <span
                                                            key={source}
                                                            className="rounded-full bg-blue-100 px-2 py-1 text-sm text-blue-800"
                                                        >
                                                            {getLabelFromValue(
                                                                source,
                                                                TRAFFIC_SOURCES,
                                                            )}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {t(
                                                    'All traffic sources allowed',
                                                )}
                                            </span>
                                        )}
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Prohibited Traffic Sources')}
                                description={t('Restricted traffic types')}
                                icon={<XCircle className="h-5 w-5" />}
                                children={
                                    <>
                                        {offer?.prohibited_traffic_sources
                                            ?.sources &&
                                        offer?.prohibited_traffic_sources
                                            .sources.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {offer?.prohibited_traffic_sources.sources.map(
                                                    (source) => (
                                                        <span
                                                            key={source}
                                                            className="rounded-full bg-red-100 px-2 py-1 text-sm text-red-800"
                                                        >
                                                            {getLabelFromValue(
                                                                source,
                                                                TRAFFIC_SOURCES,
                                                            )}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {t(
                                                    'No prohibited traffic sources',
                                                )}
                                            </span>
                                        )}
                                    </>
                                }
                            />

                            <InfoCardSkeleton
                                title={t('Terms & Conditions')}
                                description={t(
                                    'Offer requirements and restrictions',
                                )}
                                icon={<FileText className="h-5 w-5" />}
                                className="md:col-span-2"
                                children={
                                    <>
                                        {offer?.terms?.terms &&
                                        offer?.terms.terms.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {offer?.terms.terms.map(
                                                    (term) => (
                                                        <span
                                                            key={term}
                                                            className="rounded-full bg-muted px-2 py-1 text-sm text-foreground"
                                                        >
                                                            {getLabelFromValue(
                                                                term,
                                                                OFFER_TERMS,
                                                            )}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                {t(
                                                    'No specific terms configured',
                                                )}
                                            </span>
                                        )}
                                    </>
                                }
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="materials">
                        <OfferMaterials
                            offerId={Number(offer.id)}
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
        </AppLayout>
    );
};

export default OfferShowPage;
