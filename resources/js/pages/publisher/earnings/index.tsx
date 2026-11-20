import { Head, Link, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Coins,
    Download,
    FileText,
    Plus,
    ReceiptText,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    DirectoryHeading,
    EmptyState,
    MutedCell,
    PageHeader,
    ResourceDirectory,
    StatCard,
} from '@/components/app';
import {
    BalanceHero,
    availableFor,
    lineAmount,
    summaryTotal,
    useFormatMoney,
    type FinanceSummary,
    type Invoice,
    type PayoutRequest,
} from '@/components/finance';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import publisher from '@/routes/publisher';
import { type PublisherEarning } from '@/types';

type EarningRow = PublisherEarning & {
    conversion?: { order_code?: string | null } | null;
};

type PageProps = {
    earnings: LaravelPage<EarningRow>;
    summary: FinanceSummary;
    currencies: string[];
    currency: string | null;
    canRequest: PayoutRequest;
    invoices: Invoice[];
    payoutMethod: string | null;
    payoutThreshold: string | null;
};

type InvoiceFilter = 'all' | 'open' | 'paid';

const OPEN = ['pending', 'approved'];

export default function EarningsIndex() {
    const { t } = useTranslation();
    const {
        earnings,
        summary,
        currencies,
        currency,
        canRequest,
        invoices,
        payoutMethod,
        payoutThreshold,
    } = usePage<PageProps>().props;
    const query = useDirectoryQuery();
    const money = useFormatMoney();
    const date = useDate();
    const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');

    const title = t('Earnings & invoices');
    const breadcrumbs = [
        { title: t('Finance'), href: publisher.earnings.url() },
        { title: t('My earnings'), href: publisher.earnings.url() },
    ];

    if (!currency) {
        return (
            <AppLayout>
                <Head title={title} />
                <div className="workspace-page flex flex-col gap-6">
                    <PageHeader
                        title={title}
                        description={t(
                            'Commissions are kept separate per currency.',
                        )}
                        breadcrumbs={breadcrumbs}
                        icon={<Wallet />}
                        tone="finance"
                    />
                    <section className="rounded-card border border-border bg-surface shadow-card">
                        <EmptyState
                            icon={<Coins />}
                            tone="finance"
                            title={t('No earnings yet')}
                            description={t(
                                'Commissions appear here once your conversions are recorded.',
                            )}
                        />
                    </section>
                </div>
            </AppLayout>
        );
    }

    const available = availableFor(canRequest?.groups, currency);
    const approved = summaryTotal(summary, currency, ['approved']);
    const pending = summaryTotal(summary, currency, ['pending']);
    const paid = summaryTotal(summary, currency, ['paid']);
    const rejected = summaryTotal(summary, currency, ['rejected', 'reversed']);
    const remaining = available.groups.length
        ? Math.min(...available.groups.map((g) => Number(g.remaining)))
        : null;

    const visibleInvoices = invoices.filter((invoice) =>
        invoiceFilter === 'all'
            ? true
            : invoiceFilter === 'open'
              ? OPEN.includes(invoice.status)
              : invoice.status === 'paid',
    );
    const invoiceCount = (filter: InvoiceFilter) =>
        invoices.filter((invoice) =>
            filter === 'all'
                ? true
                : filter === 'open'
                  ? OPEN.includes(invoice.status)
                  : invoice.status === 'paid',
        ).length;

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={t(
                        'Commissions are kept separate per currency.',
                    )}
                    breadcrumbs={breadcrumbs}
                    icon={<Wallet />}
                    tone="finance"
                    actions={
                        currencies.length > 1 && (
                            <SegmentedControl
                                label={t('Currency')}
                                variant="filled"
                                tone="finance"
                                value={currency}
                                onValueChange={(next) =>
                                    query.visit({ currency: next, page: null })
                                }
                                options={currencies.map((code) => ({
                                    value: code,
                                    label: code,
                                }))}
                                className="border border-border bg-surface"
                            />
                        )
                    }
                />

                <div className="flex flex-wrap gap-[18px]">
                    <BalanceHero
                        className="flex-[1_1_400px]"
                        title={t('Available to invoice')}
                        value={money(available.amount, currency)}
                        caption={t('From {{count}} approved conversions', {
                            count: approved.count,
                        })}
                        actions={
                            <>
                                {available.canRequest ? (
                                    <Button asChild variant="inverse">
                                        <Link
                                            href={publisher.invoices.create.url()}
                                        >
                                            <Plus />
                                            {t('Create invoice')}
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button disabled variant="inverse">
                                        <Plus />
                                        {t('Create invoice')}
                                    </Button>
                                )}
                                <Button asChild variant="translucent">
                                    <Link href={publisher.invoices.url()}>
                                        <ReceiptText />
                                        {t('All invoices')}
                                    </Link>
                                </Button>
                            </>
                        }
                        footer={
                            <span className="flex flex-wrap gap-x-4 gap-y-1">
                                {!available.canRequest &&
                                    remaining !== null &&
                                    remaining > 0 && (
                                        <span>
                                            {t(
                                                '{{amount}} more needed to reach the minimum payout.',
                                                {
                                                    amount: money(
                                                        remaining,
                                                        currency,
                                                    ),
                                                },
                                            )}
                                        </span>
                                    )}
                                {payoutThreshold != null && (
                                    <span>
                                        {t('Minimum payout')}:{' '}
                                        {money(payoutThreshold, currency)}
                                    </span>
                                )}
                                {payoutMethod && (
                                    <span>
                                        {t('Payout method')}: {payoutMethod}
                                    </span>
                                )}
                            </span>
                        }
                    />
                    <section
                        aria-label={t('Commission breakdown')}
                        className="grid flex-[1_1_400px] grid-cols-1 gap-3.5 min-[30rem]:grid-cols-2"
                    >
                        <StatCard
                            label={t('Approved')}
                            value={money(approved.amount, currency)}
                            icon={<CheckCircle2 />}
                            tone="success"
                            hint={t('{{count}} conversions', {
                                count: approved.count,
                            })}
                        />
                        <StatCard
                            label={t('Pending review')}
                            value={money(pending.amount, currency)}
                            icon={<Clock />}
                            tone="warning"
                            hint={t('{{count}} conversions', {
                                count: pending.count,
                            })}
                        />
                        <StatCard
                            label={t('Paid all time')}
                            value={money(paid.amount, currency)}
                            icon={<ReceiptText />}
                            tone="brand"
                            hint={t('{{count}} conversions', {
                                count: paid.count,
                            })}
                        />
                        <StatCard
                            label={t('Rejected')}
                            value={money(rejected.amount, currency)}
                            icon={<XCircle />}
                            tone="danger"
                            hint={t('{{count}} conversions', {
                                count: rejected.count,
                            })}
                        />
                    </section>
                </div>

                <ResourceDirectory<Invoice>
                    label={t('Invoices')}
                    heading={
                        <DirectoryHeading
                            icon={<ReceiptText />}
                            tone="finance"
                            title={t('Invoices')}
                            description={t(
                                'Your latest {{currency}} invoices',
                                {
                                    currency,
                                },
                            )}
                        />
                    }
                    toolbar={
                        <SegmentedControl
                            label={t('Invoice status')}
                            size="sm"
                            value={invoiceFilter}
                            onValueChange={setInvoiceFilter}
                            options={(['all', 'open', 'paid'] as const).map(
                                (value) => ({
                                    value,
                                    label:
                                        value === 'all'
                                            ? t('All')
                                            : value === 'open'
                                              ? t('Open')
                                              : t('Paid'),
                                    count: invoiceCount(value),
                                }),
                            )}
                        />
                    }
                    rows={visibleInvoices}
                    rowKey={(invoice) => invoice.id}
                    nameHeader={t('Invoice')}
                    name={(invoice) => invoice.invoice_number}
                    subtitle={(invoice) =>
                        invoice.period_start
                            ? `${date(invoice.period_start)} – ${date(invoice.period_end)}`
                            : date(invoice.created_at)
                    }
                    status={(invoice) => invoice.status}
                    searchable={false}
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
                    emptyTitle={t('No invoices yet')}
                    emptyDescription={t(
                        'Create an invoice once your approved balance reaches the minimum payout.',
                    )}
                />

                <ResourceDirectory<EarningRow>
                    label={t('Earnings History')}
                    rows={earnings.data}
                    rowKey={(earning) => earning.id}
                    nameHeader={t('Campaign')}
                    name={(earning) =>
                        earning.publisher_campaign?.campaign?.name ??
                        t('Campaign')
                    }
                    subtitle={(earning) =>
                        [
                            earning.publisher_campaign?.offer?.name,
                            earning.conversion?.order_code,
                        ]
                            .filter(Boolean)
                            .join(' · ') || undefined
                    }
                    status={(earning) => earning.status}
                    tone="finance"
                    heading={
                        <DirectoryHeading
                            icon={<FileText />}
                            tone="finance"
                            title={t('Earnings History')}
                            description={currency}
                        />
                    }
                    columns={[
                        {
                            id: 'type',
                            header: t('Type'),
                            cell: (earning) => (
                                <MutedCell>{earning.commission_type}</MutedCell>
                            ),
                        },
                        {
                            id: 'date',
                            header: t('Date'),
                            cell: (earning) => (
                                <MutedCell>
                                    {date(earning.created_at)}
                                </MutedCell>
                            ),
                        },
                        {
                            id: 'invoice',
                            header: t('Invoice'),
                            cell: (earning) => (
                                <MutedCell>
                                    {earning.invoice?.invoice_number ?? '—'}
                                </MutedCell>
                            ),
                        },
                        {
                            id: 'amount',
                            header: t('Net commission'),
                            align: 'end',
                            cell: (earning) => (
                                <strong>
                                    {money(
                                        lineAmount(earning),
                                        earning.currency ?? currency,
                                    )}
                                </strong>
                            ),
                        },
                    ]}
                    pagination={query.pagination(earnings)}
                    emptyTitle={t('No earnings yet')}
                    emptyDescription={t(
                        'Commissions appear here once your conversions are recorded.',
                    )}
                />
            </div>
        </AppLayout>
    );
}
