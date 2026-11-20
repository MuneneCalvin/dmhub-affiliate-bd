import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleDollarSign,
    Clock,
    HandCoins,
    LayoutGrid,
    Plus,
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
    useFormatMoney,
    type CancelTarget,
    type FinanceSummary,
    type PaymentTarget,
} from '@/components/finance';
import FinanceErrorNotice from '@/components/finance-error-notice';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import networks from '@/routes/networks';

type NetworkInvoice = {
    id: number;
    invoice_number: string;
    amount: string;
    currency: string;
    status: string;
    period_start?: string | null;
    period_end?: string | null;
    paid_at?: string | null;
    created_at: string;
    payment_reference?: string | null;
    network?: { id: number; network_name: string } | null;
};

type PageProps = {
    invoices: LaravelPage<NetworkInvoice>;
    is_super_admin: boolean;
    is_network: boolean;
    currencies: string[];
    status?: string;
    statusCounts?: Record<string, number>;
    totals?: FinanceSummary;
    can?: {
        generate?: boolean;
        approve?: boolean;
        reject?: boolean;
        pay?: boolean;
    };
};

export default function NetworkInvoiceIndex() {
    const { t } = useTranslation();
    const {
        invoices,
        is_super_admin,
        currencies,
        status = 'all',
        statusCounts = {},
        totals = {},
        can = {},
    } = usePage<PageProps>().props;
    const query = useDirectoryQuery();
    const money = useFormatMoney();
    const date = useDate();
    const [currency, setCurrency] = useState<string>(currencies[0] ?? 'EUR');
    const [generating, setGenerating] = useState(false);
    const [payment, setPayment] = useState<PaymentTarget | null>(null);
    const [cancel, setCancel] = useState<CancelTarget | null>(null);

    const title = is_super_admin ? t('Network invoices') : t('My invoices');

    const actions = (): DirectoryAction<NetworkInvoice>[] => [
        {
            label: t('Approve'),
            icon: <CheckCircle2 />,
            tone: 'success',
            hidden: (invoice) => !can.approve || invoice.status !== 'pending',
            onSelect: (invoice) =>
                router.post(
                    networks.invoices.approve.url(invoice.id),
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
                    url: networks.invoices.markPaid.url(invoice.id),
                    invoiceNumber: invoice.invoice_number,
                    payee: invoice.network?.network_name,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    askMethod: true,
                }),
        },
        {
            label: t('Cancel invoice'),
            icon: <XCircle />,
            destructive: true,
            hidden: (invoice) =>
                !can.reject ||
                !['pending', 'approved'].includes(invoice.status),
            onSelect: (invoice) =>
                setCancel({
                    url: networks.invoices.reject.url(invoice.id),
                    invoiceNumber: invoice.invoice_number,
                    mode: 'cancel',
                }),
        },
    ];

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={t('Manage and track network payouts')}
                    breadcrumbs={[
                        {
                            title: t('Finance'),
                            href: networks.invoices.index.url(),
                        },
                        { title, href: networks.invoices.index.url() },
                    ]}
                    icon={<ReceiptText />}
                    tone="finance"
                    actions={
                        can.generate && (
                            <div className="flex flex-wrap items-center gap-2.5">
                                <Select
                                    value={currency}
                                    onValueChange={setCurrency}
                                >
                                    <SelectTrigger
                                        aria-label={t('Currency')}
                                        className="w-28"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((code) => (
                                            <SelectItem key={code} value={code}>
                                                {code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    disabled={generating}
                                    onClick={() =>
                                        router.post(
                                            networks.invoices.store.url(),
                                            { currency },
                                            {
                                                preserveScroll: true,
                                                onStart: () =>
                                                    setGenerating(true),
                                                onFinish: () =>
                                                    setGenerating(false),
                                            },
                                        )
                                    }
                                >
                                    <Plus />
                                    {t('Generate Invoice')}
                                </Button>
                            </div>
                        )
                    }
                />
                <FinanceErrorNotice />

                <CurrencyTotals
                    summary={totals}
                    label={t('Invoice totals by currency')}
                />

                <ResourceDirectory<NetworkInvoice>
                    label={t('Invoices')}
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
                            label: t('Cancelled'),
                            count: statusCounts.rejected ?? 0,
                            tone: 'danger',
                            icon: <XCircle />,
                        },
                    ]}
                    statusValue={status}
                    onStatusChange={query.setStatus}
                    rows={invoices?.data ?? []}
                    rowKey={(invoice) => invoice.id}
                    nameHeader={t('Invoice')}
                    name={(invoice) => invoice.invoice_number}
                    subtitle={(invoice) =>
                        is_super_admin
                            ? invoice.network?.network_name
                            : date(invoice.created_at)
                    }
                    status={(invoice) => invoice.status}
                    statusLabel={(invoice) =>
                        invoice.status === 'rejected'
                            ? t('Cancelled')
                            : undefined
                    }
                    tone="finance"
                    columns={[
                        {
                            id: 'period',
                            header: t('Period'),
                            cell: (invoice) => (
                                <MutedCell>
                                    {invoice.period_start
                                        ? `${date(invoice.period_start)} – ${date(invoice.period_end)}`
                                        : '—'}
                                </MutedCell>
                            ),
                        },
                        {
                            id: 'paid',
                            header: t('Paid'),
                            cell: (invoice) => (
                                <MutedCell>
                                    {invoice.paid_at
                                        ? date(invoice.paid_at)
                                        : '—'}
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
                    actions={
                        can.approve || can.pay || can.reject
                            ? actions
                            : undefined
                    }
                    pagination={
                        invoices ? query.pagination(invoices) : undefined
                    }
                    emptyTitle={t('No invoices yet')}
                    emptyDescription={t(
                        'Generated network invoices appear here with their payment status.',
                    )}
                />
            </div>

            <RecordPaymentDialog
                target={payment}
                onClose={() => setPayment(null)}
            />
            <CancelInvoiceDialog
                target={cancel}
                onClose={() => setCancel(null)}
            />
        </AppLayout>
    );
}
