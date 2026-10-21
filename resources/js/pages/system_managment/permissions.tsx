/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionColumn, PermissionsColumns } from '@/dev/columns/columns';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters, TPermissions } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, usePage } from '@inertiajs/react';
import React, { useReducer } from 'react'
import { useTranslation } from 'react-i18next';

const Permissions = () => {
    const { t } = useTranslation();
    const { data } = usePage<TPermissions>().props;

    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 10 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('System Management'),
            href: '',
        },
        {
            title: t('Permissions'),
            href: '',
        },
    ];
    
    const ActionsHandlerMapping: SingleActionsHandler<TPermissions>[] = [];

    return (
        <AppLayout>
            <Head title={t("Permissions")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Permissions")}
                    description={t("Manage user access permissions")}
                    breadcrumbs={breadcrumbs}
                />
                <div className='w-full'>
                    <CustomBaseTable
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: {
                                        page,
                                    },
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
                            columns: [...PermissionsColumns,
                            ActionColumn({ ActionsHandlerMapping })
                            ],
                            data: data?.results ?? [],
                            pageCount: data?.pageCount ?? 1,
                            title: t('Permissions'),
                            OtherTools: SearchTools,
                            showPagination: true,
                            setPageSize: (page) =>
                                optionsDispatcher({
                                    payload: {
                                        page,
                                    },
                                    type: 'page',
                                }),
                            pageSize: filter?.pageSize,
                            page: filter?.page,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    )
}

export default Permissions;