import { PartnerDiscoveryDialog } from '@/components/partner-discovery-dialog';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { ActionColumn, AdvertisersColumns } from '@/dev/columns/columns';
import {
    CustomDialogComponent,
    ReusablePageTitle,
    useConfirmationDialog,
} from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import advertisers, { show } from '@/routes/advertisers';
import {
    BreadcrumbItem,
    SingleActionsHandler,
    TAdvertiser,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { ChangeNetworkModal } from './modals/change-network';
import CreateAdvertiser from './modals/create';
import EditAdvertiser from './modals/edit';

const Advertisers_page = () => {
    const { t } = useTranslation();
    const { advrts: initialAdvrts } = usePage<{ advrts: any }>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Advertisers'),
            href: advertisers.index.url(),
        },
    ];
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            advertisers?: TAdvertiser;
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<TAdvertiser>[] = [
        {
            label: t('View'),
            href: (data) => show.url(data.user_id),
            onSelect: (data: TAdvertiser) => {
                router.visit(show.url(data?.user_id));
            },
        },
        {
            label: t('Edit'),
            onSelect: (data: TAdvertiser) => {
                handleDialogContextSwitch({
                    Component: EditAdvertiser,
                    componentProps: { data },
                });
            },
        },
        {
            label: t('Change Network'),
            onSelect: (data: TAdvertiser) => {
                console.log('Selected Advertiser for Network Change:', data); // Debug log
                handleDialogContextSwitch({
                    Component: ChangeNetworkModal,
                    componentProps: {
                        entityId: data?.id,
                        currentNetworkId: data?.network_id ?? data?.netId,
                        data: data,
                    },
                });
            },
        },
        {
            label: t('Deactivate'),
            onSelect: (data: any) => {
                confirm({
                    title: t('Deactivate Advertiser'),
                    description: `${t('Are you sure you want to deactivate')} ${data?.business_name}?`,
                    confirmLabel: t('Deactivate'),
                    cancelLabel: t('Cancel'),
                    variant: 'destructive',
                    onConfirm: () => {
                        router.post(
                            advertisers.deactivate.url(data?.id),
                            {},
                            {
                                preserveScroll: true,
                            },
                        );
                    },
                });
            },
        },
    ];
    return (
        <AppLayout>
            <Head title={t('Advertisers')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={t('Advertisers')}
                    description={t(
                        'Meet your advertisers and keep partnerships moving.',
                    )}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex flex-wrap items-center gap-3">
                            <PartnerDiscoveryDialog kind="advertisers" />
                            <Button
                                className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: CreateAdvertiser,
                                        componentProps: {
                                            handleDialogContextSwitch,
                                        },
                                    })
                                }
                            >
                                <Plus size="medium" />
                                <p className="text-lg leading-6 font-medium">
                                    {t('Add Advertisers')}
                                </p>
                            </Button>
                        </div>
                    }
                />
                <div className="w-full">
                    <CustomBaseTable
                        presentation="cards"
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: { page },
                                    type: 'page',
                                }),
                            OtherToolsProps: {
                                onChange: (data: any) =>
                                    optionsDispatcherDebounce({
                                        payload: { term: data },
                                        type: 'term',
                                    }),
                                placeholder: t('Search'),
                                includeFilter: true,
                            },
                            columns: [
                                ...AdvertisersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools: SearchTools,
                            data: initialAdvrts?.data ?? [],
                            pageCount: initialAdvrts?.last_page ?? 1,
                            title: t('Advertisers'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: initialAdvrts?.per_page,
                            page: initialAdvrts?.current_page,
                        }}
                    />
                </div>
                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className="sm:max-w-[700px]"
                >
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>

                <ConfirmDialog />
            </div>
        </AppLayout>
    );
};
export default Advertisers_page;
