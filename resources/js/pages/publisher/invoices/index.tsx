import { Head, Link, usePage } from '@inertiajs/react';
import { Download, Info, Plus, ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
    DirectoryHeading,
    MutedCell,
    PageHeader,
    ResourceDirectory,
} from '@/components/app';
import {
    CurrencyTotals,
    useFormatMoney,
    type FinanceSummary,
    type Invoice,
    type PayoutRequest,
} from '@/components/finance';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import publisher from '@/routes/publisher';

type Filter = 'all' | 'open' | 'paid' | 'rejected';

type PageProps = {
    invoices: LaravelPage<Invoice>;
    summary: FinanceSummary;
    canRequest: PayoutRequest;
    status: Filter;
    statusCounts: Record<Filter, number>;
};

export default function InvoicesIndex() {
    const { t } = useTranslation();
    const { invoices, summary, canRequest, status, statusCounts } =
        usePage<PageProps>().props;
    const query = useDirectoryQuery();
    const money = useFormatMoney();
    const date = useDate();

    const labels: Record<Filter, string> = {
        all: t('All'),
        open: t('Open'),
        paid: t('Paid'),
        rejected: t('Rejected'),
    };

    return (
        <AppLayout>
            <Head title={t('Invoices')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Invoices')}
                    description={t('Manage your payout invoices')}
                    breadcrumbs={[
                        { title: t('Finance'), href: publisher.earnings.url() },
                        {
                            title: t('Invoices'),
                            href: publisher.invoices.url(),
                        },
                    ]}
                    icon={<ReceiptText />}
                    tone="finance"
                    actions={
                        canRequest?.can_request ? (
                            <Button asChild>
                                <Link href={publisher.invoices.create.url()}>
                                    <Plus />
                                    {t('Request Payout')}
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled>
                                <Plus />
                                {t('Request Payout')}
                            </Button>
                        )
                    }
                />

                {!canRequest?.can_request && (
                    <Alert variant="info" role="note">
                        <Info />
                        <AlertDescription>
                            {t(
                                'No reviewed balance is currently above its payout threshold. Balances are kept separate by currency and liable network.',
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <CurrencyTotals
                    summary={summary}
                    label={t('Invoice totals by currency')}
                />

                <ResourceDirectory<Invoice>
                    label={t('Invoice History')}
                    heading={
                        <DirectoryHeading
                            icon={<ReceiptText />}
                            tone="finance"
                            title={t('Invoice History')}
                        />
                    }
                    toolbar={
                        <SegmentedControl
                            label={t('Invoice status')}
                            size="sm"
                            value={status}
                            onValueChange={(next) => query.setStatus(next)}
                            options={(
                                ['all', 'open', 'paid', 'rejected'] as const
                            ).map((value) => ({
                                value,
                                label: labels[value],
                                count: statusCounts?.[value] ?? 0,
                            }))}
                        />
                    }
                    searchable={false}
                    rows={invoices.data}
                    rowKey={(invoice) => invoice.id}
                    nameHeader={t('Invoice')}
                    name={(invoice) => invoice.invoice_number}
                    subtitle={(invoice) =>
                        invoice.period_start
                            ? `${date(invoice.period_start)} – ${date(invoice.period_end)}`
                            : date(invoice.created_at)
                    }
                    status={(invoice) => invoice.status}
                    tone="finance"
                    columns={[
                        {
                            id: 'network',
                            header: t('Network'),
                            cell: (invoice) => (
                                <MutedCell>
                                    {invoice.network?.network_name}
                                </MutedCell>
                            ),
                        },
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
                    href={(invoice) => publisher.invoices.show.url(invoice.id)}
                    actions={() => [
                        {
                            label: t('Download PDF'),
                            icon: <Download />,
                            tone: 'finance',
                            onSelect: (invoice) => {
                                window.location.href =
                                    publisher.invoices.pdf.url(invoice.id);
                            },
                        },
                    ]}
                    pagination={query.pagination(invoices)}
                    emptyTitle={t('No invoices yet')}
                    emptyDescription={t(
                        'Create an invoice once your approved balance reaches the minimum payout.',
                    )}
                />
            </div>
        </AppLayout>
    );
}
