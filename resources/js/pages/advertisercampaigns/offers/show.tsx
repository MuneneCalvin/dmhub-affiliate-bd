import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, TOffers } from '@/types';
import { OFFER_BONUSES, OFFER_TERMS, TRAFFIC_SOURCES } from '@/utils/enums';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Edit, Trash2, Power, PowerOff, Info, DollarSign, Settings, Gift, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ReusablePageTitle, InfoCardSkeleton, InfoRow, ConfirmationDialog } from '@/dev/core';
import { useState } from 'react';

const OfferShowPage = () => {
    const { t } = useTranslation();
    const { offer, hasPublishers } = usePage<{ offer: TOffers; hasPublishers: boolean }>().props;
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Campaigns'), href: advertiser.campaign.index.url() },
        { title: t('Campaign'), href: advertiser.campaign.show.url(offer?.campaign_id) },
        { title: offer?.name, href: '' },
    ];

    const getLabelFromValue = (value: string, options: { value: string; label: string }[]) => {
        return options.find(opt => opt.value === value)?.label ?? value;
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
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={offer?.name}
                    description={t('View and manage this offer')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex gap-2 justify-end">
                            <Link href={advertiser.offers.edit.url(Number(offer?.id))}>
                                <Button variant="outline" className="gap-2">
                                    <Edit className="h-4 w-4" />
                                    {t('Edit')}
                                </Button>
                            </Link>

                            {offer?.offer_status === 'A' ? (
                                <Button variant="outline" className="gap-2" onClick={handleDeactivate}>
                                    <PowerOff className="h-4 w-4" />
                                    {t('Deactivate')}
                                </Button>
                            ) : (
                                <Button variant="outline" className="gap-2" onClick={handleActivate}>
                                    <Power className="h-4 w-4" />
                                    {t('Activate')}
                                </Button>
                            )}
                            <Button
                                variant="destructive"
                                className="gap-2"
                                disabled={hasPublishers}
                                onClick={() => setDeleteDialogOpen(true)}>
                                <Trash2 className="h-4 w-4" />
                                {t('Delete')}
                            </Button>
                            <ConfirmationDialog
                                open={deleteDialogOpen}
                                onOpenChange={setDeleteDialogOpen}
                                title={t("Delete Offer")}
                                description={t("Are you sure you want to delete this offer? This action cannot be undone.")}
                                confirmLabel={t("Delete")}
                                cancelLabel={t("Cancel")}
                                variant="destructive"
                                onConfirm={handleDelete}
                            />
                        </div>
                    } />
                {hasPublishers && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                        {t('This offer has active publishers and cannot be deleted. You can deactivate it instead.')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoCardSkeleton
                        title={t("Basic Information")}
                        description={t("Core offer details")}
                        icon={<Info className="h-5 w-5" />}
                        children={
                            <>
                                <InfoRow label={t("Status")} value={<StatusBadge status={offer?.offer_status} />} />
                                <Separator />
                                <InfoRow label={t("Name")} value={offer?.name} />
                                <Separator />
                                <InfoRow label={t("Description")} value={offer?.description ?? '-'} />
                                <Separator />
                                <InfoRow label={t("Minimum Payout")} value={`$${offer?.minimum_payout ?? '0.00'}`} icon={DollarSign} />
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Commission Settings")}
                        description={t("Commission structure for this offer")}
                        icon={<DollarSign className="h-5 w-5" />}
                        children={
                            <>
                                {offer?.commissions && offer?.commissions.length > 0 ? (
                                    offer?.commissions.map((comm, idx) => (
                                        <div key={comm.id}>
                                            <InfoRow
                                                label={comm.commission_type?.nice_name ?? `${t('Commission')} ${idx + 1}`}
                                                value={comm?.commission_value}
                                            />
                                            {idx < offer?.commissions!.length - 1 && <Separator />}
                                        </div>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground text-sm">{t('No commissions configured')}</span>
                                )}
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Tracking Settings")}
                        description={t("Conversion and cookie settings")}
                        icon={<Settings className="h-5 w-5" />}
                        children={
                            <>
                                <InfoRow label={t("Conversion Window")} value={`${offer?.conversion_window_hours ?? '-'} ${t('hours')}`} />
                                <Separator />
                                <InfoRow label={t("Cookie Lifetime")} value={`${offer?.click_cookie_lifetime_hours ?? '-'} ${t('hours')}`} />
                                <Separator />
                                <InfoRow label={t("Preview URL")} value={offer?.preview_url ?? '-'} />
                                <Separator />
                                <InfoRow label={t("Tracking URL Template")} value={offer?.tracking_url_template ?? '-'} />
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Bonus Types")}
                        description={t("Available bonuses for publishers")}
                        icon={<Gift className="h-5 w-5" />}
                        children={
                            <>
                                {typeof offer?.bonus === 'object' && offer?.bonus?.bonuses && offer?.bonus.bonuses.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {offer?.bonus.bonuses.map((bonus: string) => (
                                            <span
                                                key={bonus}
                                                className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                                {getLabelFromValue(bonus, OFFER_BONUSES)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">{t('No bonuses configured')}</span>
                                )}
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Allowed Traffic Sources")}
                        description={t("Permitted traffic types")}
                        icon={<CheckCircle className="h-5 w-5" />}
                        children={
                            <>
                                {offer?.allowed_traffic_sources?.sources && offer?.allowed_traffic_sources.sources.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {offer?.allowed_traffic_sources.sources.map((source) => (
                                            <span
                                                key={source}
                                                className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                            >
                                                {getLabelFromValue(source, TRAFFIC_SOURCES)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">{t('All traffic sources allowed')}</span>
                                )}
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Prohibited Traffic Sources")}
                        description={t("Restricted traffic types")}
                        icon={<XCircle className="h-5 w-5" />}
                        children={
                            <>
                                {offer?.prohibited_traffic_sources?.sources && offer?.prohibited_traffic_sources.sources.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {offer?.prohibited_traffic_sources.sources.map((source) => (
                                            <span
                                                key={source}
                                                className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                                            >
                                                {getLabelFromValue(source, TRAFFIC_SOURCES)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">{t('No prohibited traffic sources')}</span>
                                )}
                            </>
                        } />

                    <InfoCardSkeleton
                        title={t("Terms & Conditions")}
                        description={t("Offer requirements and restrictions")}
                        icon={<FileText className="h-5 w-5" />}
                        className="md:col-span-2"
                        children={
                            <>
                                {offer?.terms?.terms && offer?.terms.terms.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {offer?.terms.terms.map((term) => (
                                            <span
                                                key={term}
                                                className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
                                            >
                                                {getLabelFromValue(term, OFFER_TERMS)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">{t('No specific terms configured')}</span>
                                )}
                            </>
                        } />
                </div>
            </div>
        </AppLayout>
    );
};

export default OfferShowPage;
