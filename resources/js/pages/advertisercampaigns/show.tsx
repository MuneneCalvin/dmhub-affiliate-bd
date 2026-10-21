/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TOffers, TPaginationFilters } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Activity, Calendar, DollarSign, Pencil, Plus, Target, TrendingUp } from 'lucide-react';
import { useReducer } from 'react'
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/utils/utils';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { ActionColumn, OffersColumns } from '@/dev/columns/columns';
import { useTranslation } from 'react-i18next';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { useDebounce } from '@/hooks';
import { StatusBadge } from '@/dev/statusBadge';

const CampaignShowPage = () => {
    const { campaign, offers } = usePage<any>().props;
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Campaigns'),
            href: advertiser.campaign.index.url(),
        },
        {
            title: `${campaign?.name}`,
            href: advertiser.campaign.show.url(campaign?.id),
        },
    ];

    const [, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );

    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const handleActivate = (offer: TOffers) => {
        router.patch(advertiser.offers.activate.url(Number(offer.id)));
    };

    const handleDeactivate = (offer: TOffers) => {
        router.patch(advertiser.offers.deactivate.url(Number(offer.id)));
    };

    const ActionsHandlerMapping: SingleActionsHandler<TOffers>[] = [
        {
            label: t('View'),
            onSelect: (offer: TOffers) => {
                router.visit(advertiser.offers.show.url(Number(offer.id)));
            },
        },
        {
            label: t('Edit'),
            onSelect: (offer: TOffers) => {
                router.visit(advertiser.offers.edit.url(Number(offer.id)));
            },
        },
        {
            label: t('Activate'),
            onSelect: handleActivate,
            conditional: (offer: TOffers) => offer.offer_status !== 'A',
        },
        {
            label: t('Deactivate'),
            onSelect: handleDeactivate,
            conditional: (offer: TOffers) => offer.offer_status === 'A',
        },
    ];
    return (
        <AppLayout>
            <Head title={campaign?.name} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={campaign?.name}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            <Button variant="outline"
                                onClick={() => {
                                    router.visit(advertiser.campaign.edit.url(campaign?.id))
                                }}>
                                <Pencil className="h-5 w-5" />
                                {t('Edit')}
                            </Button>
                            <Button className="bg-gray-700 text-white"
                                onClick={() => {
                                    router.visit(advertiser.offers.index.url(campaign?.id))
                                }}>
                                <Plus className="h-5 w-5" />
                                {t('Create Offers')}
                            </Button>
                        </div>
                    }
                />
                <div className="w-full">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <InfoCardSkeleton
                            title={t("Campaign Information")}
                            description={t("Basic campaign details")}
                            icon={<Activity className="h-5 w-5" />}
                            children={
                                <>
                                    <InfoRow label={t("Campaign Name")} value={campaign?.name} />
                                    <Separator />
                                    <InfoRow label={t("Network")} value={campaign?.network_name} />
                                    <Separator />
                                    <InfoRow label={t("Status")} value={<StatusBadge status={(campaign?.campaign_status)} />} />
                                </>
                            } />

                        <InfoCardSkeleton
                            title={t("Budget Information")}
                            description={t("Budget allocation and spending")}
                            icon={<DollarSign className="h-5 w-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t("Total Budget")}
                                        value={formatCurrency(campaign?.total_budget, campaign?.currency)}
                                        icon={DollarSign}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Daily Budget")}
                                        value={formatCurrency(campaign?.daily_budget, campaign?.currency)}
                                    />
                                    <Separator />
                                    <InfoRow label={t("Currency")} value={campaign?.currency} />
                                </>
                            } />

                        <InfoCardSkeleton
                            title={t("Performance Targets & Timelines")}
                            description={t("Campaign goals and objectives")}
                            icon={<Target className="h-5 w-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t("Target Conversions")}
                                        value={campaign?.target_conversions}
                                        icon={Target}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Target ROI")}
                                        value={`${campaign?.target_roi}%`}
                                        icon={TrendingUp}
                                    />
                                    <InfoRow
                                        label={t("Start Date")}
                                        value={formatDate(campaign?.start_date)}
                                        icon={Calendar}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("End Date")}
                                        value={formatDate(campaign?.end_date)}
                                        icon={Calendar}
                                    />
                                </>
                            } />
                    </div>
                </div>
                <div className="w-full">
                    <div className="w-full">
                        <CustomBaseTable
                            onPageChange={(page) =>
                                optionsDispatcher({
                                    payload: { page },
                                    type: 'page',
                                })
                            }
                            OtherToolsProps={{
                                onChange: (term: any) =>
                                    optionsDispatcherDebounce({
                                        payload: { term },
                                        type: 'term',
                                    }),
                                placeholder: t('Search'),
                                includeFilter: true,
                            }}
                            columns={[
                                ...OffersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ]}
                            OtherTools={SearchTools}
                            data={offers ?? []}
                            pageCount={offers?.results?.last_page ?? 1}
                            title={t('Offers')}
                            showPagination
                            setPageSize={(pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                })
                            }
                            pageSize={offers?.results?.per_page}
                            page={offers?.results?.current_page}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}

export default CampaignShowPage;