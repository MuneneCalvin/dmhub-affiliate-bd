import FinanceErrorNotice from '@/components/finance-error-notice';
import FinanceSummaryTable, {
    FinanceSummary,
} from '@/components/finance-summary';
import RecordPayment from '@/components/record-payment';
import { Button } from '@/components/ui/button';
import { ActionColumn, AdminInvoiceColumns } from '@/dev/columns/columns';
import { ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import {
    AdminInvoice,
    BreadcrumbItem,
    SingleActionsHandler,
    TFilterOptions,
    TPaginationFilters,
} from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AdminInvoicesIndex = () => {
    const { t } = useTranslation();
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoice Management'),
            href: '/admin/invoices',
        },
    ];
    const { invoices, stats } = usePage<{
        invoices: {
            data: AdminInvoice[];
            current_page: number;
            last_page: number;
            per_page: number;
        };
        stats: FinanceSummary;
    }>().props;

    const [, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 20 },
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<AdminInvoice>[] = [
        {
            label: t('View Details'),
            onSelect: (data) => {
                router.visit(`/admin/invoices/${data?.id}`);
            },
        },
        {
            label: t('Approve'),
            onSelect: (data) => {
                if (data?.status === 'pending') {
                    router.post(`/admin/invoices/${data?.id}/approve`);
                }
            },
        },
        {
            label: t('Mark as Paid'),
            onSelect: (data) => {
                if (data?.status === 'approved') {
                    setPaymentUrl(`/admin/invoices/${data?.id}/mark-paid`);
                }
            },
        },
    ];

    const columns = [
        ...AdminInvoiceColumns,
        ActionColumn<AdminInvoice>({ ActionsHandlerMapping }),
    ];

    return (
        <AppLayout>
            <FinanceErrorNotice />
            <RecordPayment
                url={paymentUrl}
                onClose={() => setPaymentUrl(null)}
            />
            <Head title={t('Invoice Management')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={t('Invoice Management')}
                    description={t(
                        'Review and manage publisher payout requests',
                    )}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button
                            variant="outline"
                            onClick={() =>
                                window.open('/admin/invoices/export', '_blank')
                            }
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {t('Export CSV')}
                        </Button>
                    }
                />
                <FinanceSummaryTable summary={stats} />
                <div className="w-full">
                    <CustomBaseTable
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: { page },
                                    type: 'page',
                                }),
                            OtherToolsProps: {
                                onChange: (data: string) =>
                                    optionsDispatcherDebounce({
                                        payload: { term: data },
                                        type: 'term',
                                    }),
                                placeholder: t(
                                    'Search by invoice # or publisher',
                                ),
                                includeFilter: true,
                            },
                            columns,
                            OtherTools: SearchTools,
                            data: invoices?.data ?? [],
                            pageCount: invoices?.last_page ?? 1,
                            title: t('All Invoices'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: invoices?.per_page ?? 20,
                            page: invoices?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default AdminInvoicesIndex;
