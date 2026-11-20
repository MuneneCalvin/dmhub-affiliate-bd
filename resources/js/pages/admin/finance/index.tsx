import { FundingSheet } from '@/components/advertiser-funding-sheet';
import { FormErrors, OptionCards } from '@/components/finance-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Info,
    Landmark,
    Search,
    ShieldAlert,
    ShieldCheck,
    ShieldQuestion,
    ShieldX,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type FraudAssessment = {
    status: string;
    score: number | null;
    recommendation?: string | null;
    applied_at: string | null;
};
type Earning = {
    id: number;
    amount: string;
    currency: string | null;
    status: string;
    reversed_minor: number;
    ledger_transaction_id: number | null;
    commission_type?: string | null;
    base_value?: string | null;
    created_at?: string;
    review_reason?: string | null;
    conversion?: { order_code: string };
    publisher?: {
        business_name?: string | null;
        user?: { first_name?: string; last_name?: string } | null;
    } | null;
    publisher_campaign?: { campaign?: { name: string } };
    latest_fraud_assessment?: FraudAssessment | null;
};
type Advertiser = { id: number; business_name: string; currency: string };
type PageProps = {
    earnings: {
        data: Earning[];
        prev_page_url: string | null;
        next_page_url: string | null;
        from: number | null;
        to: number | null;
        total: number;
    };
    advertisers: Advertiser[];
    canFund: boolean;
    canAdjust: boolean;
    canManageFraud: boolean;
    statusCounts: Record<string, number> | [];
    filters: { status: string; search: string; fraud: string };
};

const STATUSES = [
    'pending',
    'approved',
    'locked',
    'payable',
    'paid',
    'rejected',
    'reversed',
] as const;

const STATUS_TONE: Record<string, string> = {
    pending:
        'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    approved:
        'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    locked: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
    payable:
        'bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20',
    paid: 'bg-muted text-foreground ring-border',
    rejected:
        'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    reversed:
        'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
};

const DESTRUCTIVE_OPERATIONS = ['reject', 'reversal', 'chargeback'];

function Pill({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
                className,
            )}
        >
            {children}
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const { t } = useTranslation();
    return (
        <Pill className={STATUS_TONE[status] ?? STATUS_TONE.paid}>
            <span className="inline-block first-letter:uppercase">
                {t(status)}
            </span>
        </Pill>
    );
}

function fraudView(assessment: FraudAssessment | null | undefined) {
    if (!assessment)
        return {
            label: 'Not checked',
            icon: ShieldQuestion,
            tone: 'text-muted-foreground',
        };
    if (assessment.applied_at)
        return {
            label: 'Automatically approved',
            icon: ShieldCheck,
            tone: 'text-emerald-700 dark:text-emerald-400',
        };
    if (assessment.status === 'error')
        return {
            label: 'Check failed',
            icon: ShieldX,
            tone: 'text-rose-700 dark:text-rose-400',
        };
    if (['queued', 'running', 'waiting'].includes(assessment.status))
        return {
            label: 'Checks running',
            icon: ShieldQuestion,
            tone: 'text-amber-700 dark:text-amber-400',
        };
    if (assessment.recommendation === 'manual_review')
        return {
            label: 'Needs manual review',
            icon: ShieldAlert,
            tone: 'text-amber-700 dark:text-amber-400',
        };
    return {
        label: 'Checks passed',
        icon: ShieldCheck,
        tone: 'text-emerald-700 dark:text-emerald-400',
    };
}

function FraudLink({ earning }: { earning: Earning }) {
    const { t } = useTranslation();
    const view = fraudView(earning.latest_fraud_assessment);
    const Icon = view.icon;
    const score = earning.latest_fraud_assessment?.score;
    return (
        <Link
            href={`/finance/earnings/${earning.id}/fraud`}
            className={cn(
                'inline-flex items-center gap-1.5 rounded text-xs font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                view.tone,
            )}
        >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {t(view.label)}
            {score !== null && score !== undefined && (
                <span className="text-muted-foreground tabular-nums">
                    · {score}
                </span>
            )}
        </Link>
    );
}

const netCommission = (earning: Earning) =>
    Number(earning.amount) - earning.reversed_minor / 100;

const publisherName = (earning: Earning) => {
    const user = earning.publisher?.user;
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
    return earning.publisher?.business_name || name || null;
};

/** Explains why an earning can't be reviewed, or null when it can. */
function blockedReason(earning: Earning, canAdjust: boolean): string | null {
    if (!earning.ledger_transaction_id) return 'Requires reconciliation';
    if (['locked', 'payable'].includes(earning.status))
        return 'Cancel the invoice to adjust';
    if (['rejected', 'reversed'].includes(earning.status)) return 'Final';
    if (earning.status !== 'pending' && !canAdjust)
        return 'No adjust permission';
    return null;
}

export default function FinanceIndex() {
    const { t } = useTranslation();
    const {
        earnings,
        advertisers,
        canFund,
        canAdjust,
        canManageFraud,
        statusCounts,
        filters,
    } = usePage<PageProps>().props;
    const counts = statusCounts as Record<string, number>;
    const [selected, setSelected] = useState<Earning | null>(null);
    const [fundingOpen, setFundingOpen] = useState(false);
    const [search, setSearch] = useState(filters.search);

    const visit = (params: Partial<PageProps['filters']>) => {
        setSelected(null);
        router.get(
            '/finance',
            { ...filters, search, ...params },
            { preserveState: true, preserveScroll: true },
        );
    };

    const hasFilters = !!filters.search || filters.fraud !== 'all';

    return (
        <AppLayout>
            <Head title={t('Financial review')} />
            <div className="workspace-page flex flex-col gap-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <ReusablePageTitle
                        title={t('Financial review')}
                        description={t(
                            'Review confirmed commissions, record returns, and reconcile funding.',
                        )}
                        breadcrumbs={[
                            { title: t('Finance'), href: '/finance' },
                        ]}
                    />
                    <div className="flex flex-wrap gap-2">
                        {canManageFraud && (
                            <Button variant="outline" asChild>
                                <Link href="/finance/fraud">
                                    <SlidersHorizontal />
                                    {t('Manage fraud rules')}
                                </Link>
                            </Button>
                        )}
                        {canFund && (
                            <Button onClick={() => setFundingOpen(true)}>
                                <Landmark />
                                {t('Record funding')}
                            </Button>
                        )}
                    </div>
                </div>

                <section className="overflow-hidden rounded-xl border bg-card">
                    {/* Status tabs */}
                    <div
                        role="tablist"
                        aria-label={t('Status')}
                        className="flex gap-1 overflow-x-auto border-b px-2"
                    >
                        {STATUSES.map((status) => {
                            const active = filters.status === status;
                            const count = counts[status] ?? 0;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => visit({ status })}
                                    className={cn(
                                        '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        active
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <span className="inline-block first-letter:uppercase">
                                        {t(status)}
                                    </span>
                                    <span
                                        className={cn(
                                            'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                                            active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                        <form
                            role="search"
                            className="relative flex-1 sm:max-w-sm"
                            onSubmit={(e) => {
                                e.preventDefault();
                                visit({ search });
                            }}
                        >
                            <Label htmlFor="order-search" className="sr-only">
                                {t('Order reference')}
                            </Label>
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                id="order-search"
                                maxLength={100}
                                className="px-9"
                                placeholder={t('Search order reference…')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label={t('Clear search')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setSearch('');
                                        visit({ search: '' });
                                    }}
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </form>
                        <Select
                            value={filters.fraud ?? 'all'}
                            onValueChange={(fraud) =>
                                visit({
                                    fraud,
                                    status:
                                        fraud === 'automatic'
                                            ? 'approved'
                                            : filters.status,
                                })
                            }
                        >
                            <SelectTrigger
                                className="sm:w-60"
                                aria-label={t('Fraud checks')}
                            >
                                <ShieldCheck className="text-muted-foreground" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('All assessments')}
                                </SelectItem>
                                <SelectItem value="awaiting">
                                    {t('Awaiting checks or hold')}
                                </SelectItem>
                                <SelectItem value="manual_review">
                                    {t('Needs manual review')}
                                </SelectItem>
                                <SelectItem value="automatic">
                                    {t('Automatically approved')}
                                </SelectItem>
                                <SelectItem value="error">
                                    {t('Check failed')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch('');
                                    visit({ search: '', fraud: 'all' });
                                }}
                            >
                                {t('Reset filters')}
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground">
                                <tr className="text-left">
                                    <th className="px-4 py-2.5 font-medium">
                                        {t('Order / campaign')}
                                    </th>
                                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                                        {t('Publisher')}
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        {t('Status')}
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        {t('Net commission')}
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        <span className="sr-only">
                                            {t('Review')}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {earnings.data.map((earning) => {
                                    const blocked = blockedReason(
                                        earning,
                                        canAdjust,
                                    );
                                    const net = netCommission(earning);
                                    return (
                                        <tr
                                            key={earning.id}
                                            className={cn(
                                                'transition-colors hover:bg-muted/40',
                                                selected?.id === earning.id &&
                                                    'bg-muted/60',
                                            )}
                                        >
                                            <td className="max-w-[11rem] px-4 py-3 sm:max-w-xs">
                                                <p
                                                    className="truncate font-mono text-[13px]"
                                                    title={
                                                        earning.conversion
                                                            ?.order_code
                                                    }
                                                >
                                                    {earning.conversion
                                                        ?.order_code ?? '—'}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {earning.publisher_campaign
                                                        ?.campaign?.name ?? '—'}
                                                    {earning.created_at &&
                                                        ` · ${formatDate(earning.created_at)}`}
                                                </p>
                                            </td>
                                            <td className="hidden px-4 py-3 whitespace-nowrap md:table-cell">
                                                {publisherName(earning) ?? (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-start gap-1">
                                                    <StatusPill
                                                        status={earning.status}
                                                    />
                                                    <FraudLink
                                                        earning={earning}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                                {earning.currency ? (
                                                    <>
                                                        <span className="font-medium">
                                                            {formatCurrency(
                                                                net,
                                                                earning.currency,
                                                            )}
                                                        </span>
                                                        {earning.reversed_minor >
                                                            0 && (
                                                            <span className="block text-xs text-muted-foreground line-through">
                                                                {formatCurrency(
                                                                    earning.amount,
                                                                    earning.currency,
                                                                )}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-destructive">
                                                        {t(
                                                            'Requires reconciliation',
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                {blocked ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {t(blocked)}
                                                    </span>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={
                                                            earning.status ===
                                                            'pending'
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        onClick={() =>
                                                            setSelected(earning)
                                                        }
                                                    >
                                                        {earning.status ===
                                                        'pending'
                                                            ? t('Review')
                                                            : t('Adjust')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!earnings.data.length && (
                            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                                <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                                    <Search className="size-5 text-muted-foreground" />
                                </span>
                                <p className="font-medium">
                                    {t('No commissions found')}
                                </p>
                                <p className="max-w-sm text-sm text-muted-foreground">
                                    {t(
                                        'No commissions match this status and order reference.',
                                    )}
                                </p>
                                {hasFilters && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => {
                                            setSearch('');
                                            visit({ search: '', fraud: 'all' });
                                        }}
                                    >
                                        {t('Reset filters')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {earnings.total > 0 && (
                        <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
                            <span className="tabular-nums">
                                {t('Showing {{from}}–{{to}} of {{total}}', {
                                    from: earnings.from,
                                    to: earnings.to,
                                    total: earnings.total,
                                })}
                            </span>
                            <div className="flex gap-2">
                                <PageLink
                                    href={earnings.prev_page_url}
                                    label={t('Previous')}
                                    icon={<ChevronLeft />}
                                />
                                <PageLink
                                    href={earnings.next_page_url}
                                    label={t('Next')}
                                    icon={<ChevronRight />}
                                    iconAfter
                                />
                            </div>
                        </div>
                    )}
                </section>

                <p className="flex gap-2 text-sm text-muted-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {t(
                        'Locked or payable commissions require invoice cancellation before an adjustment. Paid adjustments are recovered from future payouts.',
                    )}
                </p>
            </div>

            <ReviewSheet
                earning={selected}
                canAdjust={canAdjust}
                onClose={() => setSelected(null)}
            />
            {canFund && (
                <FundingSheet
                    open={fundingOpen}
                    onOpenChange={setFundingOpen}
                    advertisers={advertisers}
                />
            )}
        </AppLayout>
    );
}

function PageLink({
    href,
    label,
    icon,
    iconAfter,
}: {
    href: string | null;
    label: string;
    icon: ReactNode;
    iconAfter?: boolean;
}) {
    if (!href)
        return (
            <Button variant="outline" size="sm" disabled>
                {!iconAfter && icon}
                {label}
                {iconAfter && icon}
            </Button>
        );
    return (
        <Button variant="outline" size="sm" asChild>
            <Link href={href} preserveScroll>
                {!iconAfter && icon}
                {label}
                {iconAfter && icon}
            </Link>
        </Button>
    );
}

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-all">
                {children}
            </dd>
        </div>
    );
}

type Operation = 'approve' | 'reject' | 'refund' | 'reversal' | 'chargeback';

function ReviewSheet({
    earning,
    canAdjust,
    onClose,
}: {
    earning: Earning | null;
    canAdjust: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [operation, setOperation] = useState<Operation>('approve');
    const [openedFor, setOpenedFor] = useState<number | null>(null);
    const review = useForm({
        decision: 'approve',
        kind: 'refund',
        amount: '',
        reference: '',
        reason: '',
    });

    // Reset the form whenever a different earning is opened.
    if (earning && openedFor !== earning.id) {
        setOpenedFor(earning.id);
        setOperation(earning.status === 'pending' ? 'approve' : 'refund');
        review.reset();
        review.clearErrors();
    }

    const descriptions: Record<Operation, string> = {
        approve: t('Confirm the commission so it can be invoiced.'),
        reject: t('Decline the full commission.'),
        refund: t('Reduce the commission for a partial order refund.'),
        reversal: t('Reverse the full remaining commission.'),
        chargeback: t('Reverse the commission after a payment dispute.'),
    };
    const available: Operation[] = !earning
        ? []
        : earning.status === 'pending'
          ? [
                'approve',
                'reject',
                ...(canAdjust ? (['refund', 'reversal'] as const) : []),
            ]
          : ['refund', 'reversal', 'chargeback'];
    const isReview = operation === 'approve' || operation === 'reject';
    const submitLabel: Record<Operation, string> = {
        approve: t('Approve commission'),
        reject: t('Reject commission'),
        refund: t('Record refund'),
        reversal: t('Record reversal'),
        chargeback: t('Record chargeback'),
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!earning) return;
        review.transform((data) =>
            isReview
                ? { decision: operation, reason: data.reason }
                : {
                      kind: operation,
                      amount: operation === 'refund' ? data.amount : null,
                      reference: data.reference,
                      reason: data.reason,
                  },
        );
        review.post(
            `/finance/earnings/${earning.id}/${isReview ? 'review' : 'adjust'}`,
            { preserveScroll: true, onSuccess: onClose },
        );
    };

    return (
        <Sheet open={!!earning} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full gap-0 sm:max-w-lg">
                {earning && (
                    <form onSubmit={submit} className="flex h-full flex-col">
                        <SheetHeader className="border-b p-5">
                            <SheetTitle>
                                {earning.status === 'pending'
                                    ? t('Review commission')
                                    : t('Adjust commission')}
                            </SheetTitle>
                            <SheetDescription className="font-mono text-xs break-all">
                                {earning.conversion?.order_code ?? '—'}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 space-y-6 overflow-y-auto p-5">
                            <div className="rounded-lg border bg-muted/30 px-4 py-2">
                                <div className="flex items-baseline justify-between gap-4 border-b py-3">
                                    <span className="text-sm text-muted-foreground">
                                        {t('Net commission')}
                                    </span>
                                    <span className="text-2xl font-semibold tabular-nums">
                                        {earning.currency
                                            ? formatCurrency(
                                                  netCommission(earning),
                                                  earning.currency,
                                              )
                                            : '—'}
                                    </span>
                                </div>
                                <dl className="divide-y">
                                    <DetailRow label={t('Status')}>
                                        <StatusPill status={earning.status} />
                                    </DetailRow>
                                    <DetailRow label={t('Fraud checks')}>
                                        <FraudLink earning={earning} />
                                    </DetailRow>
                                    <DetailRow label={t('Campaign')}>
                                        {earning.publisher_campaign?.campaign
                                            ?.name ?? '—'}
                                    </DetailRow>
                                    <DetailRow label={t('Publisher')}>
                                        {publisherName(earning) ?? '—'}
                                    </DetailRow>
                                    {earning.base_value && earning.currency && (
                                        <DetailRow label={t('Sale amount')}>
                                            <span className="tabular-nums">
                                                {formatCurrency(
                                                    earning.base_value,
                                                    earning.currency,
                                                )}
                                            </span>
                                        </DetailRow>
                                    )}
                                    {earning.reversed_minor > 0 &&
                                        earning.currency && (
                                            <DetailRow
                                                label={t('Already adjusted')}
                                            >
                                                <span className="text-destructive tabular-nums">
                                                    −
                                                    {formatCurrency(
                                                        earning.reversed_minor /
                                                            100,
                                                        earning.currency,
                                                    )}
                                                </span>
                                            </DetailRow>
                                        )}
                                    {earning.created_at && (
                                        <DetailRow label={t('Recorded')}>
                                            {formatDate(earning.created_at)}
                                        </DetailRow>
                                    )}
                                </dl>
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="mb-2 text-sm font-medium">
                                    {t('Decision')}
                                </legend>
                                <OptionCards
                                    name="review-operation"
                                    value={operation}
                                    onChange={(value) => {
                                        setOperation(value);
                                        review.clearErrors();
                                    }}
                                    options={available.map((value) => ({
                                        value,
                                        label: t(value),
                                        description: descriptions[value],
                                    }))}
                                />
                            </fieldset>

                            {operation === 'refund' && (
                                <div className="space-y-2">
                                    <Label htmlFor="refund-amount">
                                        {t('Sale amount refunded')} ·{' '}
                                        {earning.currency}
                                    </Label>
                                    <Input
                                        id="refund-amount"
                                        required
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={review.data.amount}
                                        onChange={(e) =>
                                            review.setData(
                                                'amount',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t(
                                            'Enter the additional order amount returned. The commission adjustment is calculated proportionally.',
                                        )}
                                    </p>
                                </div>
                            )}
                            {!isReview && (
                                <div className="space-y-2">
                                    <Label htmlFor="adjust-reference">
                                        {t('Refund or dispute reference')}
                                    </Label>
                                    <Input
                                        id="adjust-reference"
                                        required
                                        maxLength={120}
                                        value={review.data.reference}
                                        onChange={(e) =>
                                            review.setData(
                                                'reference',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                    <Label htmlFor="review-reason">
                                        {t('Reason and evidence')}
                                    </Label>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {review.data.reason.length}/500
                                    </span>
                                </div>
                                <Textarea
                                    id="review-reason"
                                    required
                                    rows={4}
                                    maxLength={500}
                                    value={review.data.reason}
                                    onChange={(e) =>
                                        review.setData('reason', e.target.value)
                                    }
                                />
                            </div>
                            <FormErrors errors={review.errors} />
                        </div>

                        <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={review.processing}
                                variant={
                                    DESTRUCTIVE_OPERATIONS.includes(operation)
                                        ? 'destructive'
                                        : 'default'
                                }
                            >
                                {review.processing
                                    ? t('Saving…')
                                    : submitLabel[operation]}
                            </Button>
                        </SheetFooter>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}
