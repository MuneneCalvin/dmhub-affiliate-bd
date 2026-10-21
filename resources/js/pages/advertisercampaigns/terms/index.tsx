/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { ActionColumn, AdvertiserCampaignTermsColumns } from '@/dev/columns/columns';
import { CustomDialogComponent, ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout'
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, SingleActionsHandler, TermsPageProps, TFilterOptions, TPaginationFilters, TTerms } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react'
import { Plus } from 'lucide-react';
import React, { useReducer } from 'react'
import { useTranslation } from 'react-i18next';
import CreateTerms from './create';

const TermsIndexPage = () => {
    const { t } = useTranslation();
    const { terms } = usePage<TermsPageProps>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Campaigns'),
            href: advertiser.terms.url(),
        },
    ];
    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 10 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            terms?: any,
        }>();

    const ActionsHandlerMapping: SingleActionsHandler<TTerms>[] = [
        {
            label: t('Delete'),
            onSelect: (data: any) => {
                router.delete(advertiser.terms.delete(data?.id));
                router.get(advertiser.terms.url());
            },
        }
    ];

    return (
        <AppLayout>
            <Head title={t('My Terms')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('My Terms')}
                    description={t('Manage Your Campaigns Terms')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-4">
                            <Button
                                className="rounded-xl px-4 py-2 cursor-pointer "
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: CreateTerms,
                                    })
                                }>
                                <Plus size="medium" />
                                <p className="font-medium leading-6 text-lg">
                                    {t('Create Terms')}
                                </p>
                            </Button>
                        </div>
                    }
                />

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
                            ...AdvertiserCampaignTermsColumns,
                            ActionColumn({ ActionsHandlerMapping }),
                        ]}
                        OtherTools={SearchTools}
                        data={terms?.data ?? []}
                        pageCount={terms?.last_page ?? 1  }
                        title={t('Campaign Terms')}
                        showPagination
                        setPageSize={(pageSize) =>
                            optionsDispatcher({
                                payload: { pageSize },
                                type: 'pageSize',
                            })
                        }
                        pageSize={terms?.per_page ?? 10}
                        page={terms?.current_page ?? 1}
                    />
                </div>
                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className='sm:max-w-[700px]'>
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>

            </div>
        </AppLayout>
    )
}

export default TermsIndexPage
