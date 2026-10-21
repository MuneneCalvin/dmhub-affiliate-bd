/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReusablePageTitle, StatCard } from '@/dev/core';
import { ActionColumn, InvoiceColumns } from '@/dev/columns/columns';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, PublisherInvoice, PublisherInvoiceSummary, PublisherPayoutRequest, SingleActionsHandler, TFilterOptions, TPaginationFilters } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { formatCurrency } from '@/utils/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { DollarSign, Plus, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

const InvoicesIndex = () => {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoices'),
            href: '/publisher/invoices',
        }
    ];
    const { invoices, summary, canRequest } = usePage<{
        invoices: { data: PublisherInvoice[]; current_page: number; last_page: number; per_page: number };
        summary: PublisherInvoiceSummary;
        canRequest: PublisherPayoutRequest;
    }>().props;

    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<PublisherInvoice>[] = [
        {
            label: t('View Details'),
            onSelect: (data) => {
                router.visit(publisher.invoices.show.url(data.id));
            }
        }
    ];

    return (
        <AppLayout>
            <Head title={t("Invoices")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("Invoices")}
                    description={t("Manage your payout invoices")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button
                            onClick={() => router.visit(publisher.invoices.create.url())}
                            disabled={!canRequest?.can_request}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Request Payout')}
                        </Button>
                    } />

                {!canRequest?.can_request && (
                    <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                            {t('Minimum payout threshold is')} <strong>{formatCurrency(canRequest?.min_payout || 0, 'USD')}</strong>.
                            {t(' You have')} <strong>{formatCurrency(canRequest?.available_amount || 0, 'USD')}</strong> {t('available.')}
                            {t(' You need')} <strong>{formatCurrency(canRequest?.remaining || 0, 'USD')}</strong> {t('more to request a payout.')}
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        title={t('Available')}
                        value={formatCurrency(canRequest?.available_amount || 0, 'USD')}
                        description={t('Ready for payout')}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-green-600"
                    />
                    <StatCard
                        title={t('Pending Invoices')}
                        value={formatCurrency(summary?.pending_amount || 0, 'USD')}
                        description={`${summary?.pending_count || 0} ${t('invoices')}`}
                        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-yellow-600"
                    />
                    <StatCard
                        title={t('Approved')}
                        value={formatCurrency(summary?.approved_amount || 0, 'USD')}
                        description={`${summary?.approved_count || 0} ${t('invoices')}`}
                        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-blue-600"
                    />
                    <StatCard
                        title={t('Total Paid')}
                        value={formatCurrency(summary?.paid_amount || 0, 'USD')}
                        description={`${summary?.paid_count || 0} ${t('invoices')}`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
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
