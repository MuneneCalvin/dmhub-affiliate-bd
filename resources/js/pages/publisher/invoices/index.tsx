import FinanceSummaryTable, {
    FinanceSummary,
} from '@/components/finance-summary';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActionColumn, InvoiceColumns } from '@/dev/columns/columns';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import {
    BreadcrumbItem,
    PublisherInvoice,
    PublisherPayoutRequest,
    SingleActionsHandler,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Plus } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

const InvoicesIndex = () => {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoices'),
            href: '/publisher/invoices',
        },
    ];
    const { invoices, summary, canRequest } = usePage<{
        invoices: {
            data: PublisherInvoice[];
            current_page: number;
            last_page: number;
            per_page: number;
        };
        summary: FinanceSummary;
        canRequest: PublisherPayoutRequest;
    }>().props;

    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<PublisherInvoice>[] = [
        {
            label: t('View Details'),
            onSelect: (data) => {
                router.visit(publisher.invoices.show.url(data.id));
            },
        },
    ];

    return (
        <AppLayout>
            <Head title={t('Invoices')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={t('Invoices')}
                    description={t('Manage your payout invoices')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button
                            onClick={() =>
                                router.visit(publisher.invoices.create.url())
                            }
                            disabled={!canRequest?.can_request}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Request Payout')}
                        </Button>
                    }
                />

                {!canRequest?.can_request && (
                    <Alert
                        variant="default"
                        className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
                    >
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                            {t(
                                'No reviewed balance is currently above its payout threshold. Balances are kept separate by currency and liable network.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}
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
                            columns: [
                                ...InvoiceColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools: SearchTools,
                            data: invoices?.data ?? [],
                            pageCount: invoices?.last_page ?? 1,
                            title: t('Invoice History'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: invoices?.per_page ?? 25,
                            page: invoices?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default InvoicesIndex;
