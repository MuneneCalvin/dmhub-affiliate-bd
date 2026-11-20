import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleDollarSign,
    Clock,
    Download,
    HandCoins,
    LayoutGrid,
    ReceiptText,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    MutedCell,
    PageHeader,
    ResourceDirectory,
    type DirectoryAction,
} from '@/components/app';
import {
    CancelInvoiceDialog,
    CurrencyTotals,
    RecordPaymentDialog,
    publisherName,
    useFormatMoney,
    type CancelTarget,
    type FinanceSummary,
    type Invoice,
    type InvoiceAbilities,
    type PaymentTarget,
} from '@/components/finance';
import FinanceErrorNotice from '@/components/finance-error-notice';
import { Button } from '@/components/ui/button';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import adminInvoices from '@/routes/admin/invoices';

type PageProps = {
    invoices: LaravelPage<Invoice>;
    stats: FinanceSummary;
    statusCounts?: Record<string, number>;
    filters?: { status?: string };
    can?: InvoiceAbilities & { export?: boolean; all_networks?: boolean };
};

export default function AdminInvoicesIndex() {
    const { t } = useTranslation();
    const {
        invoices,
        stats,
        statusCounts = {},
        filters,
        can = {},
    } = usePage<PageProps>().props;
    const query = useDirectoryQuery();
    const money = useFormatMoney();
    const date = useDate();
    const [payment, setPayment] = useState<
        (PaymentTarget & { id: number }) | null
    >(null);
    const [cancel, setCancel] = useState<CancelTarget | null>(null);
    const allNetworks = Boolean(can.all_networks);

    const actions = (): DirectoryAction<Invoice>[] => [
        {
            label: t('Approve'),
            icon: <CheckCircle2 />,
            tone: 'success',
            hidden: (invoice) => !can.approve || invoice.status !== 'pending',
            onSelect: (invoice) =>
                router.post(
                    adminInvoices.approve.url(invoice.id),
                    {},
                    { preserveScroll: true },
                ),
        },
        {
            label: t('Record payment'),
            icon: <HandCoins />,
            tone: 'finance',
            hidden: (invoice) => !can.pay || invoice.status !== 'approved',
            onSelect: (invoice) =>
                setPayment({
                    id: invoice.id,
                    url: adminInvoices.markPaid.url(invoice.id),
                    invoiceNumber: invoice.invoice_number,
                    payee: publisherName(invoice),
                    amount: invoice.amount,
                    currency: invoice.currency,
                }),
        },
        {
            label: t('Download PDF'),
            icon: <Download />,
            tone: 'finance',
            onSelect: (invoice) => {
                window.location.href = adminInvoices.pdf.url(invoice.id);
            },
        },
        {
            label: t('Reject or cancel'),
            icon: <XCircle />,
            destructive: true,
            hidden: (invoice) =>
                !can.reject ||
                !['pending', 'approved'].includes(invoice.status),
            onSelect: (invoice) =>
                setCancel({
                    url: adminInvoices.reject.url(invoice.id),
                    invoiceNumber: invoice.invoice_number,
                    mode: invoice.status === 'pending' ? 'reject' : 'cancel',
                }),
        },
    ];

    return (
        <AppLayout>
            <Head title={t('Publisher invoices')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Publisher invoices')}
                    description={t(
                        'Review and manage publisher payout requests',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Finance'),
                            href: adminInvoices.index.url(),
                        },
                        {
                            title: t('Publisher invoices'),
                            href: adminInvoices.index.url(),
                        },
                    ]}
                    icon={<ReceiptText />}
                    tone="finance"
                    actions={
                        <Button variant="secondary" asChild>
                            <a href={adminInvoices.export.url()}>
                                <Download className="text-finance" />
                                {t('Export CSV')}
                            </a>
                        </Button>
                    }
                />
                <FinanceErrorNotice />

                <CurrencyTotals
                    summary={stats}
                    label={t('Invoice totals by currency')}
                />

                <ResourceDirectory<Invoice>
                    label={t('All Invoices')}
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All'),
                            count: statusCounts.all ?? 0,
                            tone: 'finance',
                            icon: <LayoutGrid />,
                        },
                        {
                            value: 'pending',
                            label: t('Pending'),
                            count: statusCounts.pending ?? 0,
                            tone: 'warning',
                            icon: <Clock />,
                        },
                        {
                            value: 'approved',
                            label: t('Approved'),
                            count: statusCounts.approved ?? 0,
                            tone: 'info',
                            icon: <CheckCircle2 />,
                        },
                        {
                            value: 'paid',
                            label: t('Paid'),
                            count: statusCounts.paid ?? 0,
                            tone: 'success',
                            icon: <CircleDollarSign />,
                        },
                        {
                            value: 'rejected',
                            label: t('Rejected'),
                            count: statusCounts.rejected ?? 0,
                            tone: 'danger',
                            icon: <XCircle />,
                        },
                    ]}
                    statusValue={filters?.status ?? 'all'}
                    onStatusChange={query.setStatus}
                    rows={invoices.data}
                    rowKey={(invoice) => invoice.id}
                    nameHeader={t('Publisher')}
                    name={(invoice) => publisherName(invoice) ?? '—'}
                    subtitle={(invoice) => invoice.invoice_number}
                    status={(invoice) => invoice.status}
                    tone="finance"
                    columns={[
                        ...(allNetworks
                            ? [
                                  {
                                      id: 'network',
                                      header: t('Network'),
                                      cell: (invoice: Invoice) => (
                                          <MutedCell>
                                              {invoice.network?.network_name}
                                          </MutedCell>
                                      ),
                                  },
                              ]
                            : []),
                        {
                            id: 'requested',
                            header: t('Requested'),
                            cell: (invoice) => (
                                <MutedCell>
                                    {date(
                                        invoice.requested_at ??
                                            invoice.created_at,
                                    )}
                                </MutedCell>
                            ),
                        },
                        {
                            id: 'amount',
                            header: t('Amount'),
                            align: 'end',
                            cell: (invoice) => (
                                <strong className="font-extrabold">
                                    {money(invoice.amount, invoice.currency)}
                                </strong>
                            ),
                        },
                    ]}
                    href={(invoice) => adminInvoices.show.url(invoice.id)}
                    actions={actions}
                    pagination={query.pagination(invoices)}
                    emptyTitle={t('No invoices yet')}
                    emptyDescription={t(
                        'Publisher payout requests appear here for review.',
                    )}
                />
            </div>

            <RecordPaymentDialog
                target={payment}
                onClose={() => setPayment(null)}
                followUp={
                    payment
                        ? {
                              label: t('View invoice'),
                              onClick: () =>
                                  router.visit(
                                      adminInvoices.show.url(payment.id),
                                  ),
                          }
                        : undefined
                }
            />
            <CancelInvoiceDialog
                target={cancel}
                onClose={() => setCancel(null)}
            />
        </AppLayout>
    );
}
