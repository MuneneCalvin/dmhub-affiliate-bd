import { FundingSheet } from '@/components/advertiser-funding-sheet';
import {
    DetailList,
    MutedCell,
    PageHeader,
    ResourceDirectory,
} from '@/components/app';
import { useFormatMoney } from '@/components/finance';
import { FormErrors, OptionCards } from '@/components/finance-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { useDirectoryQuery } from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Info,
    Landmark,
    Scale,
    Search,
    ShieldAlert,
    ShieldCheck,
    ShieldQuestion,
    ShieldX,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
        current_page: number;
        last_page: number;
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

const DESTRUCTIVE_OPERATIONS = ['reject', 'reversal', 'chargeback'];

function fraudView(assessment: FraudAssessment | null | undefined) {
    if (!assessment)
        return {
            label: 'Not checked',
            icon: ShieldQuestion,
            tone: 'text-ink-muted',
        };
    if (assessment.applied_at)
        return {
            label: 'Automatically approved',
            icon: ShieldCheck,
            tone: 'text-success-ink',
        };
    if (assessment.status === 'error')
        return {
            label: 'Check failed',
            icon: ShieldX,
            tone: 'text-danger-ink',
        };
    if (['queued', 'running', 'waiting'].includes(assessment.status))
        return {
            label: 'Checks running',
            icon: ShieldQuestion,
            tone: 'text-warning-ink',
        };
    if (assessment.recommendation === 'manual_review')
        return {
            label: 'Needs manual review',
            icon: ShieldAlert,
            tone: 'text-warning-ink',
        };
    return {
        label: 'Checks passed',
        icon: ShieldCheck,
        tone: 'text-success-ink',
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
                'inline-flex min-h-6 items-center gap-1.5 rounded text-xs font-semibold hover:underline',
                view.tone,
            )}
        >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {t(view.label)}
            {score !== null && score !== undefined && (
                <span className="text-ink-muted tabular-nums">· {score}</span>
            )}
        </Link>
    );
}

const netCommission = (earning: Earning) =>
    Math.round(Number(earning.amount) * 100 - earning.reversed_minor) / 100;

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
    const money = useFormatMoney();
    const date = useDate();
    const query = useDirectoryQuery();
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
    const resetFilters = () => {
        setSearch('');
        visit({ search: '', fraud: 'all' });
    };

    return (
        <AppLayout>
            <Head title={t('Financial review')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Financial review')}
                    description={t(
                        'Review confirmed commissions, record returns, and reconcile funding.',
                    )}
                    breadcrumbs={[
                        { title: t('Finance'), href: '/finance' },
                        { title: t('Financial review'), href: '/finance' },
                    ]}
                    icon={<Scale />}
                    tone="finance"
                    actions={
                        <div className="flex flex-wrap gap-2.5">
                            {canManageFraud && (
                                <Button variant="secondary" asChild>
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
                    }
                />

                <SegmentedControl
                    label={t('Commission status')}
                    variant="filled"
                    tone="finance"
                    value={filters.status}
                    onValueChange={(status) => visit({ status })}
                    className="self-start border border-border bg-surface"
                    options={STATUSES.map((status) => ({
                        value: status,
                        label: t(
                            status.charAt(0).toUpperCase() + status.slice(1),
                        ),
                        count: counts[status] ?? 0,
                    }))}
                />

                <ResourceDirectory<Earning>
                    label={t('Commissions')}
                    searchable={false}
                    heading={
                        <form
                            role="search"
                            className="flex h-11 w-full max-w-[380px] min-w-0 items-center gap-2.5 rounded-control border border-border-strong bg-surface-muted px-3.5 focus-within:border-brand sm:w-[380px]"
                            onSubmit={(e) => {
                                e.preventDefault();
                                visit({ search });
                            }}
                        >
                            <Label htmlFor="order-search" className="sr-only">
                                {t('Order reference')}
                            </Label>
                            <Search
                                className="size-[18px] shrink-0 text-brand"
                                aria-hidden
                            />
                            <input
                                id="order-search"
                                type="search"
                                maxLength={100}
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
                                placeholder={t('Search order reference…')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label={t('Clear search')}
                                    className="-mr-2 inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-tint"
                                    onClick={() => {
                                        setSearch('');
                                        visit({ search: '' });
                                    }}
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </form>
                    }
                    toolbar={
                        <>
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
                                    <ShieldCheck className="text-ink-muted" />
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
                                <Button variant="ghost" onClick={resetFilters}>
                                    {t('Reset filters')}
                                </Button>
                            )}
                        </>
                    }
                    rows={earnings.data}
                    rowKey={(earning) => earning.id}
                    nameHeader={t('Order / campaign')}
                    name={(earning) => earning.conversion?.order_code ?? '—'}
                    subtitle={(earning) =>
                        [
                            earning.publisher_campaign?.campaign?.name,
                            earning.created_at
                                ? date(earning.created_at)
                                : null,
                        ]
                            .filter(Boolean)
                            .join(' · ') || undefined
                    }
                    status={(earning) => earning.status}
                    tone="finance"
                    columns={[
                        {
                            id: 'publisher',
                            header: t('Publisher'),
                            cell: (earning) => (
                                <MutedCell>{publisherName(earning)}</MutedCell>
                            ),
                        },
                        {
                            id: 'fraud',
                            header: t('Fraud checks'),
                            cell: (earning) => <FraudLink earning={earning} />,
                        },
                        {
                            id: 'net',
                            header: t('Net commission'),
                            align: 'end',
                            cell: (earning) =>
                                earning.currency ? (
                                    <>
                                        <strong className="font-extrabold">
                                            {money(
                                                netCommission(earning),
                                                earning.currency,
                                            )}
                                        </strong>
                                        {earning.reversed_minor > 0 && (
                                            <span className="block text-xs text-ink-muted line-through">
                                                {money(
                                                    earning.amount,
                                                    earning.currency,
                                                )}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-xs font-semibold text-danger-ink">
                                        {t('Requires reconciliation')}
                                    </span>
                                ),
                        },
                        {
                            id: 'review',
                            header: (
                                <span className="sr-only">{t('Review')}</span>
                            ),
                            align: 'end',
                            cell: (earning) => {
                                const blocked = blockedReason(
                                    earning,
                                    canAdjust,
                                );
                                return blocked ? (
                                    <span className="text-xs text-ink-muted">
                                        {t(blocked)}
                                    </span>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                            earning.status === 'pending'
                                                ? 'primary'
                                                : 'secondary'
                                        }
                                        onClick={() => setSelected(earning)}
                                    >
                                        {earning.status === 'pending'
                                            ? t('Review')
                                            : t('Adjust')}
                                    </Button>
                                );
                            },
                        },
                    ]}
                    pagination={query.pagination(earnings)}
                    emptyTitle={t('No commissions found')}
                    emptyDescription={t(
                        'No commissions match this status and order reference.',
                    )}
                    emptyAction={
                        hasFilters && (
                            <Button variant="secondary" onClick={resetFilters}>
                                {t('Reset filters')}
                            </Button>
                        )
                    }
                />

                <p className="flex gap-2 text-sm text-ink-muted">
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
    const money = useFormatMoney();
    const date = useDate();
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
                        <SheetHeader
                            icon={<Scale />}
                            tone="finance"
                            className="p-5"
                        >
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
                            <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface-muted p-4">
                                <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                                    <span className="text-sm text-ink-muted">
                                        {t('Net commission')}
                                    </span>
                                    <span className="text-2xl font-extrabold tabular-nums">
                                        {earning.currency
                                            ? money(
                                                  netCommission(earning),
                                                  earning.currency,
                                              )
                                            : '—'}
                                    </span>
                                </div>
                                <DetailList
                                    labelWidth={140}
                                    rows={[
                                        {
                                            label: t('Status'),
                                            value: (
                                                <StatusBadge
                                                    status={earning.status}
                                                />
                                            ),
                                        },
                                        {
                                            label: t('Fraud checks'),
                                            value: (
                                                <FraudLink earning={earning} />
                                            ),
                                        },
                                        {
                                            label: t('Campaign'),
                                            value: earning.publisher_campaign
                                                ?.campaign?.name,
                                        },
                                        {
                                            label: t('Publisher'),
                                            value: publisherName(earning),
                                        },
                                        !!earning.base_value &&
                                            !!earning.currency && {
                                                label: t('Sale amount'),
                                                value: money(
                                                    earning.base_value,
                                                    earning.currency,
                                                ),
                                            },
                                        earning.reversed_minor > 0 &&
                                            !!earning.currency && {
                                                label: t('Already adjusted'),
                                                value: (
                                                    <span className="text-danger-ink tabular-nums">
                                                        −
                                                        {money(
                                                            earning.reversed_minor /
                                                                100,
                                                            earning.currency,
                                                        )}
                                                    </span>
                                                ),
                                            },
                                        !!earning.created_at && {
                                            label: t('Recorded'),
                                            value: date(earning.created_at),
                                        },
                                    ]}
                                />
                            </div>

                            <fieldset className="space-y-2">
                                <legend className="mb-2 text-sm font-bold">
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
                                    <p className="text-xs text-ink-muted">
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
                                    <span className="text-xs text-ink-muted tabular-nums">
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

                        <SheetFooter className="flex-row justify-end gap-2 p-4">
                            <Button
                                type="button"
                                variant="secondary"
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
                                        : 'primary'
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
