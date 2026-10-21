import { Button } from '@/components/ui/button';
import { ReusablePageTitle, StatCard } from '@/dev/core';
import { ActionColumn, AdminInvoiceColumns } from '@/dev/columns/columns';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { AdminInvoice, AdminInvoiceStats, BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { formatCurrency } from '@/utils/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { DollarSign, Clock, CheckCircle, Download, FileText } from 'lucide-react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

const AdminInvoicesIndex = () => {
    const { t } = useTranslation();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoice Management'),
            href: '/admin/invoices',
        }
    ];
    const { invoices, stats } = usePage<{
        invoices: { data: AdminInvoice[]; current_page: number; last_page: number; per_page: number };
        stats: AdminInvoiceStats;
    }>().props;

    const [, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 20 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const ActionsHandlerMapping: SingleActionsHandler<AdminInvoice>[] = [
        {
            label: t('View Details'),
            onSelect: (data) => {
                router.visit(`/admin/invoices/${data?.id}`);
            }
        },
        {
            label: t('Approve'),
            onSelect: (data) => {
                if (data?.status === 'pending') {
                    router.post(`/admin/invoices/${data?.id}/approve`);
                }
            }
        },
        {
            label: t('Mark as Paid'),
            onSelect: (data) => {
                if (data?.status === 'approved') {
                    router.post(`/admin/invoices/${data?.id}/mark-paid`);
                }
            }
        }
    ];

    const columns = [
        ...AdminInvoiceColumns,
        ActionColumn<AdminInvoice>({ ActionsHandlerMapping }),
    ];

    return (
        <AppLayout>
            <Head title={t("Invoice Management")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("Invoice Management")}
                    description={t("Review and manage publisher payout requests")}
                    breadcrumbs={breadcrumbs}
                children={
                    <Button
                        variant="outline"
                        onClick={() => window.open('/admin/invoices/export', '_blank')}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('Export CSV')}
                    </Button>
                }/>
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        title={t('Pending Review')}
                        value={stats?.pending || 0}
                        description={formatCurrency(stats?.pending_amount || 0, 'USD')}
                        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-yellow-600"
                    />
                    <StatCard
                        title={t('Approved')}
                        value={stats?.approved || 0}
                        description={formatCurrency(stats?.approved_amount || 0, 'USD')}
                        icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-blue-600"
                    />
                    <StatCard
                        title={t('Paid This Month')}
                        value={formatCurrency(stats?.paid_this_month || 0, 'USD')}
                        description={t('Total disbursed')}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                        valueClassName="text-green-600"
                    />
                    <StatCard
                        title={t('Total Pending Amount')}
                        value={formatCurrency((stats?.pending_amount || 0) + (stats?.approved_amount || 0), 'USD')}
                        description={t('Awaiting payment')}
                        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
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
                                onChange: (data: string) =>
                                    optionsDispatcherDebounce({
                                        payload: { term: data },
                                        type: 'term',
                                    }),
                                placeholder: t('Search by invoice # or publisher'),
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
