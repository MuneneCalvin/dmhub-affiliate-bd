/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Head, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import {
    BreadcrumbItem,
    campaignsPageProps,
    SingleActionsHandler,
    TCampaign,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';

import {
    ActionColumn,
    AdvertiserCampaignsColumns,
} from '@/dev/columns/columns';
import { useDebounce } from '@/hooks';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';

const AdvertiserIndex = () => {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const can = (permission: string) =>
        Boolean(
            auth.user.is_super_admin || auth.permissions?.includes(permission),
        );
    const { campaigns } = usePage<campaignsPageProps>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Campaigns'),
            href: advertiser.campaign.index.url(),
        },
    ];

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<TCampaign>[] = [
        {
            label: t('View'),
            href: (data) => advertiser.campaign.show.url(data.id),
            onSelect: (data: any) => {
                router.visit(advertiser.campaign.show(data?.id));
            },
        },
    ];
    return (
        <AppLayout>
            <Head title={t('Campaigns')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={t('Campaigns')}
                    description={t(
                        'Explore your campaigns, offers, and next opportunities.',
                    )}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-4">
                            {can('create_campaigns') && (
                                <Button
                                    className="cursor-pointer rounded-xl px-4 py-2"
                                    onClick={() =>
                                        router.visit(
                                            advertiser.campaign.create(),
                                        )
                                    }
                                >
                                    <Plus size="medium" />
                                    <p className="text-lg leading-6 font-medium">
                                        {t('Create Campaign')}
                                    </p>
                                </Button>
                            )}
                        </div>
                    }
                />
                <div className="campaigns-directory w-full">
                    <CustomBaseTable
                        presentation="cards"
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
                            ...AdvertiserCampaignsColumns,
                            ActionColumn({ ActionsHandlerMapping }),
                        ]}
                        OtherTools={SearchTools}
                        data={campaigns?.results?.data ?? []}
                        pageCount={campaigns?.results?.last_page ?? 1}
                        title={t('Campaigns')}
                        showPagination
                        setPageSize={(pageSize) =>
                            optionsDispatcher({
                                payload: { pageSize },
                                type: 'pageSize',
                            })
                        }
                        pageSize={campaigns?.results?.per_page}
                        page={campaigns?.results?.current_page}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default AdvertiserIndex;
