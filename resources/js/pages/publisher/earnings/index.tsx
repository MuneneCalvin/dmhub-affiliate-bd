import FinanceSummaryTable, {
    FinanceSummary,
} from '@/components/finance-summary';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { EarningsColumns } from '@/dev/columns/columns';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import {
    BreadcrumbItem,
    PublisherEarning,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, usePage } from '@inertiajs/react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

const EarningsIndex = () => {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('My Earnings'),
            href: '/publisher/earnings',
        },
    ];
    const { earnings, summary } = usePage<{
        earnings: {
            data: PublisherEarning[];
            current_page: number;
            last_page: number;
            per_page: number;
        };
        summary: FinanceSummary;
    }>().props;

    const [, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 50 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    return (
        <AppLayout>
            <Head title={t('My Earnings')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={t('My Earnings')}
                    description={t(
                        'Track your commission earnings from conversions',
                    )}
                    breadcrumbs={breadcrumbs}
                />
                <FinanceSummaryTable summary={summary} />
                <div className="w-full">
                    <CustomBaseTable
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
                            columns: EarningsColumns,
                            OtherTools: SearchTools,
                            data: earnings?.data ?? [],
                            pageCount: earnings?.last_page ?? 1,
                            title: t('Earnings History'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: earnings?.per_page ?? 50,
                            page: earnings?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default EarningsIndex;
