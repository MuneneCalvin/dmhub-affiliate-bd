import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import type {
    FinanceDetail,
    FinanceRow,
    FinanceWorkspace,
    RefundPreview,
} from '@/types/campaign-finance';
import { Link, router, usePage, usePoll } from '@inertiajs/react';
import axios from 'axios';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Database,
    Download,
    ExternalLink,
    Info,
    LoaderCircle,
    Search,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-finance.css';

function Status({ row }: { row: FinanceRow }) {
    const { t } = useTranslation();
    return (
        <span className={`finance-status finance-status-${row.status}`}>
            {t(row.status_label)}
        </span>
    );
}

export function CampaignFinance() {
    const {
        props: { financeWorkspace: data },
        url,
    } = usePage<{ financeWorkspace: FinanceWorkspace }>();
    usePoll(60000, { only: ['financeWorkspace'] });
    const { t, i18n } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState(data.filters.search);
    const [syncedSearch, setSyncedSearch] = useState(data.filters.search);
    if (syncedSearch !== data.filters.search) {
        setSyncedSearch(data.filters.search);
        setSearch(data.filters.search);
    }
    const trigger = useRef<HTMLButtonElement | null>(null);
    const drawer = useRef<HTMLDivElement | null>(null);
    const money = (minor: number, compact = false) =>
        `${data.currency} ${new Intl.NumberFormat(i18n.language, { minimumFractionDigits: compact && minor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(minor / 100)}`;
    const change = (patch: Record<string, string | number | null>) => {
        setError('');
        router.get(
            url.split('?')[0],
            {
                tab: 'finance',
                ...data.filters,
                page: data.pagination.page,
                earning: data.selected?.id ?? null,
                ...patch,
            },
            {
                only: ['financeWorkspace'],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onError: (errors) => setError(Object.values(errors).join(' ')),
            },
        );
    };
    const exportUrl = (format: string) =>
        `${data.export_url}?${new URLSearchParams({ ...data.filters, format })}`;
    return (
        <section
            className="campaign-finance"
            aria-label={t('Campaign finance')}
            aria-busy={busy}
        >
            <div className="finance-heading">
                <div>
                    <h2>
                        {t(
                            data.publisher_view
                                ? 'Your earnings & payouts'
                                : 'Campaign finance',
                        )}
                    </h2>
                    <span className="finance-currency">{data.currency}</span>
                </div>
                <details className="finance-export">
                    <summary>
                        <Download size={16} />
                        {t('Export')}
                    </summary>
                    <div>
                        <a href={exportUrl('csv')}>{t('Download CSV')}</a>
                        <a href={exportUrl('xlsx')}>{t('Download Excel')}</a>
                        <small>{t('All rows matching your filters')}</small>
                    </div>
                </details>
            </div>
            {data.publisher_view && (
                <p className="finance-muted">
                    {t(
                        'Your assignment only. All amounts are in the campaign currency.',
                    )}
                </p>
            )}
            <dl className="finance-kpis">
                <div>
                    <dt>{t('Pending review')}</dt>
                    <dd>{money(data.summary.pending_minor, true)}</dd>
                </div>
                <div>
                    <dt>{t('Net approved commissions')}</dt>
                    <dd>{money(data.summary.approved_minor, true)}</dd>
                </div>
            </dl>
            <p className="finance-note">
                <Info size={18} />
                {t('Performance totals are not payout balances.')}
            </p>
            <div className="finance-toolbar">
                <div
                    className="finance-tabs"
                    role="group"
                    aria-label={t('Filter earnings by financial status')}
                >
                    {[
                        ['all', 'All earnings'],
                        ['pending', 'Pending review'],
                        ['approved', 'Approved'],
                        ['invoiced', 'Invoiced'],
                        ['paid', 'Paid'],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            disabled={busy}
                            aria-pressed={data.filters.status === key}
                            onClick={() =>
                                change({ status: key, page: 1, earning: null })
                            }
                        >
                            {t(label)}
                            {key === 'pending' && (
                                <span>{data.summary.pending_count}</span>
                            )}
                        </button>
                    ))}
                </div>
                <form
                    className="finance-search"
                    onSubmit={(event) => {
                        event.preventDefault();
                        change({ search, page: 1, earning: null });
                    }}
                >
                    <label className="sr-only" htmlFor="finance-order-search">
                        {t('Search order reference')}
                    </label>
                    <Search size={17} />
                    <input
                        id="finance-order-search"
                        type="search"
                        maxLength={100}
                        placeholder={t('Search order reference')}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={busy}
                        aria-label={t('Search')}
                    >
                        <ChevronRight size={18} />
                    </button>
                </form>
            </div>
            {error && (
                <p role="alert" className="finance-warning">
                    {error}
                </p>
            )}
            {busy && (
                <span className="finance-note" role="status">
                    <LoaderCircle size={16} className="animate-spin" />
                    {t('Loading earnings…')}
                </span>
            )}
            <div className="finance-table-scroll">
                <table className="finance-table">
                    <caption className="sr-only">
                        {t(
                            'Campaign earnings. Select an order to view its financial history.',
                        )}
                    </caption>
                    <thead>
                        <tr>
                            <th scope="col">{t('Order')}</th>
                            <th scope="col">
                                {t(data.publisher_view ? 'Offer' : 'Publisher')}
                            </th>
                            <th scope="col">{t('Commission')}</th>
                            <th scope="col">{t('Financial status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row) => (
                            <tr
                                key={row.id}
                                className={
                                    data.selected?.id === row.id
                                        ? 'selected'
                                        : ''
                                }
                                onClick={(event) => {
                                    trigger.current =
                                        event.currentTarget.querySelector(
                                            'button',
                                        );
                                    change({ earning: row.id });
                                }}
                            >
                                <th scope="row">
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            trigger.current =
                                                event.currentTarget;
                                            change({ earning: row.id });
                                        }}
                                        aria-label={t('View order {{order}}', {
                                            order: row.order,
                                        })}
                                    >
                                        {row.order}
                                    </button>
                                </th>
                                <td>
                                    {data.publisher_view
                                        ? row.offer
                                        : row.publisher}
                                </td>
                                <td>
                                    {money(row.commission_minor)}
                                    {row.reversed_minor > 0 && (
                                        <small>{t('After adjustments')}</small>
                                    )}
                                </td>
                                <td>
                                    <Status row={row} />
                                    {!row.ledger_backed && (
                                        <small>
                                            {t('Reconciliation required')}
                                        </small>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!data.rows.length && (
                            <tr>
                                <td colSpan={4} className="finance-empty">
                                    <strong>{t('No earnings found')}</strong>
                                    <p>
                                        {t(
                                            data.filters.search ||
                                                data.filters.status !== 'all'
                                                ? 'Try another order reference or financial status.'
                                                : 'Confirmed outcomes will appear here when commissions are recorded.',
                                        )}
                                    </p>
                                    {(data.filters.search ||
                                        data.filters.status !== 'all') && (
                                        <button
                                            onClick={() =>
                                                change({
                                                    status: 'all',
                                                    search: '',
                                                    page: 1,
                                                    earning: null,
                                                })
                                            }
                                        >
                                            {t('Clear filters')}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {data.pagination.total > 0 && (
                <div className="finance-pagination">
                    <span>
                        {t('{{from}}–{{to}} of {{total}} earnings', {
                            ...data.pagination,
                        })}
                    </span>
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={busy || data.pagination.page <= 1}
                            onClick={() =>
                                change({
                                    page: data.pagination.page - 1,
                                    earning: null,
                                })
                            }
                        >
                            <ChevronLeft size={15} />
                            {t('Previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                busy ||
                                data.pagination.page >=
                                    data.pagination.last_page
                            }
                            onClick={() =>
                                change({
                                    page: data.pagination.page + 1,
                                    earning: null,
                                })
                            }
                        >
                            {t('Next')}
                            <ChevronRight size={15} />
                        </Button>
                    </div>
                </div>
            )}
            <div className="finance-balance">
                <Database size={30} />
                <div>
                    <h3>
                        {t(
                            data.publisher_view
                                ? 'Your available payout balance'
                                : 'Advertiser available funds',
                        )}
                    </h3>
                    <p>
                        <strong>{money(data.balance_minor, true)}</strong>
                        <span>· {t('Shared across campaigns')}</span>
                    </p>
                    {data.publisher_view && (
                        <small>
                            {t('In this network and currency')} ·{' '}
                            {t('Payout threshold')}:{' '}
                            {money(data.threshold_minor ?? 0)}
                        </small>
                    )}
                </div>
                {data.payout_url && (
                    <Link
                        href={data.payout_url}
                        className="finance-primary-link"
                    >
                        {t('Request payout')}
                        <ExternalLink size={15} />
                    </Link>
                )}
            </div>
            {data.publisher_view && !data.payout_url && (
                <p className="finance-note">
                    <Info size={18} />
                    {data.balance_minor < 0
                        ? t(
                              'Future earnings will offset your outstanding recovery before another payout.',
                          )
                        : data.balance_minor < (data.threshold_minor ?? 0)
                          ? t(
                                '{{amount}} more is needed to reach your payout threshold.',
                                {
                                    amount: money(
                                        (data.threshold_minor ?? 0) -
                                            data.balance_minor,
                                    ),
                                },
                            )
                          : t(
                                'Payouts require an eligible available balance and payout permission.',
                            )}
                </p>
            )}
            <Sheet
                open={!!data.selected}
                onOpenChange={(open) => {
                    if (!open) change({ earning: null });
                }}
            >
                <SheetContent
                    className="finance-drawer"
                    ref={drawer}
                    onOpenAutoFocus={(event) => {
                        event.preventDefault();
                        drawer.current?.focus({ preventScroll: true });
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        trigger.current?.focus();
                    }}
                >
                    {data.selected && (
                        <FinanceDrawer
                            key={`${data.selected.id}:${data.selected.status}:${data.selected.reversed_minor}`}
                            row={data.selected}
                            money={money}
                            publisher={data.publisher_view}
                        />
                    )}
                </SheetContent>
            </Sheet>
        </section>
    );
}

function FinanceDrawer({
    row,
    money,
    publisher,
}: {
    row: FinanceDetail;
    money: (minor: number, compact?: boolean) => string;
    publisher: boolean;
}) {
    const { t, i18n } = useTranslation();
    const date = (value: string) =>
        `${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(value))} UTC`;
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const invoice = row.invoice;
    return (
        <>
            <header>
                <SheetTitle className="finance-drawer-title">
                    {t('Order')} {row.order}
                </SheetTitle>
                <SheetDescription className="finance-note">
                    {row.confirmed_at ? (
                        <>
                            <CheckCircle2 size={18} className="finance-check" />
                            {t('Merchant confirmed')} · {date(row.confirmed_at)}
                        </>
                    ) : (
                        t('Historical earning · confirmation time unavailable')
                    )}
                </SheetDescription>
            </header>
            <dl className="finance-facts">
                <div>
                    <dt>{t('Offer')}</dt>
                    <dd>{row.offer}</dd>
                </div>
                {!publisher && (
                    <div>
                        <dt>{t('Publisher')}</dt>
                        <dd>{row.publisher}</dd>
                    </div>
                )}
                <div>
                    <dt>{t('Sale value')}</dt>
                    <dd>
                        <strong>{money(row.sale_minor)}</strong>
                    </dd>
                </div>
                <div>
                    <dt>{t('Agreed rate')}</dt>
                    <dd>
                        {['CPS', 'RevShare'].includes(row.commission_type)
                            ? `${row.rate}%`
                            : `${money(row.original_minor)} · ${row.commission_type}`}
                    </dd>
                </div>
                <div>
                    <dt>{t('Original commission')}</dt>
                    <dd>
                        <strong>{money(row.original_minor)}</strong>
                    </dd>
                </div>
                {row.reversed_minor > 0 && (
                    <>
                        <div>
                            <dt>{t('Commission reversed')}</dt>
                            <dd>{money(row.reversed_minor)}</dd>
                        </div>
                        <div>
                            <dt>{t('Remaining net earning')}</dt>
                            <dd>
                                <strong>{money(row.commission_minor)}</strong>
                            </dd>
                        </div>
                    </>
                )}
                <div>
                    <dt>{t('Financial status')}</dt>
                    <dd>
                        <Status row={row} />
                    </dd>
                </div>
            </dl>
            {!row.ledger_backed && (
                <p className="finance-warning">
                    <TriangleAlert size={18} />
                    {t(
                        'This historical commission needs reconciliation before it can be reviewed, adjusted or paid.',
                    )}
                </p>
            )}
            <section className="finance-drawer-section">
                <h3>{t('History')}</h3>
                {row.history.length ? (
                    <ol className="finance-history">
                        {row.history.map((item, index) => (
                            <li key={`${item.at}:${index}`}>
                                <CheckCircle2 size={19} />
                                <div>
                                    <span>{t(item.label)}</span>
                                    {item.note && <small>{item.note}</small>}
                                </div>
                                <time dateTime={item.at}>{date(item.at)}</time>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="finance-muted">
                        {t('No recorded financial history yet.')}
                    </p>
                )}
            </section>
            <section className="finance-drawer-section">
                <h3>{t('Invoice')}</h3>
                {invoice ? (
                    <>
                        <div className="finance-invoice-link">
                            <strong>{invoice.number}</strong>
                            {invoice.url && (
                                <a
                                    href={invoice.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {t('Open full invoice')}
                                    <ExternalLink size={16} />
                                </a>
                            )}
                        </div>
                        <dl className="finance-invoice-totals">
                            <div>
                                <dt>{t('This campaign')}</dt>
                                <dd>{money(invoice.campaign_minor)}</dd>
                            </div>
                            {invoice.total_minor !== null && (
                                <div>
                                    <dt>{t('Full invoice')}</dt>
                                    <dd>{money(invoice.total_minor)}</dd>
                                </div>
                            )}
                            {!!invoice.recovery_minor && (
                                <div>
                                    <dt>
                                        {t('Recovery offset in full invoice')}
                                    </dt>
                                    <dd>{money(invoice.recovery_minor)}</dd>
                                </div>
                            )}
                        </dl>
                        <p className="finance-muted">
                            {t(
                                invoice.other_campaigns
                                    ? 'Includes earnings from other campaigns.'
                                    : !invoice.url
                                      ? 'Full invoice and payment evidence are restricted to the publisher and authorized operators.'
                                      : 'Invoice amounts reflect the earnings reserved when it was requested.',
                            )}
                        </p>
                        {invoice.payment_reference && (
                            <div className="finance-payment">
                                <span>{t('Payment reference')}</span>
                                <strong>{invoice.payment_reference}</strong>
                                {invoice.evidence && (
                                    <button
                                        onClick={() =>
                                            setEvidenceOpen(!evidenceOpen)
                                        }
                                        aria-expanded={evidenceOpen}
                                    >
                                        {t(
                                            evidenceOpen
                                                ? 'Hide evidence'
                                                : 'View evidence',
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                        {evidenceOpen && invoice.evidence && (
                            <div className="finance-evidence">
                                {/^https?:\/\/\S+$/i.test(invoice.evidence) ? (
                                    <a
                                        href={invoice.evidence}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {t('Open payment evidence')}
                                        <ExternalLink size={15} />
                                    </a>
                                ) : (
                                    invoice.evidence
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="finance-muted">
                        {t('This earning has not been included in an invoice.')}
                    </p>
                )}
            </section>
            {row.review_url && <CommissionReview url={row.review_url} />}
            {row.fraud_url && (
                <a className="text-sm underline" href={row.fraud_url}>
                    {t('View fraud checks and assessment history')}
                </a>
            )}
            {row.preview_url && <RefundAdjustment row={row} money={money} />}
            {['locked', 'payable'].includes(row.status) && !publisher && (
                <p className="finance-warning">
                    <TriangleAlert size={19} />
                    {t(
                        'Cancel the unpaid invoice before adjusting this earning. An authorized invoice operator can open the full invoice to resolve it.',
                    )}
                </p>
            )}
        </>
    );
}

function CommissionReview({ url }: { url: string }) {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = (decision: string) =>
        router.post(
            url,
            { decision, reason },
            {
                preserveScroll: true,
                onStart: () => {
                    setBusy(true);
                    setError('');
                },
                onFinish: () => setBusy(false),
                onError: (errors) => setError(Object.values(errors).join(' ')),
            },
        );
    return (
        <section className="finance-drawer-section">
            <h3>{t('Review commission')}</h3>
            <label className="finance-field">
                {t('Review reason')}
                <textarea
                    maxLength={500}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                />
            </label>
            {error && (
                <p role="alert" className="finance-warning">
                    {error}
                </p>
            )}
            <div className="finance-actions">
                <Button
                    variant="outline"
                    disabled={busy || !reason.trim()}
                    onClick={() => submit('reject')}
                >
                    {t('Reject commission')}
                </Button>
                <Button
                    disabled={busy || !reason.trim()}
                    onClick={() => submit('approve')}
                >
                    {t('Approve commission')}
                </Button>
            </div>
        </section>
    );
}

function RefundAdjustment({
    row,
    money,
}: {
    row: FinanceDetail;
    money: (minor: number) => string;
}) {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [reason, setReason] = useState('Partial refund (return)');
    const [preview, setPreview] = useState<RefundPreview | null>(null);
    const [reviewing, setReviewing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState('');
    const valid =
        /^\d{1,9}(\.\d{1,2})?$/.test(amount) &&
        Number(amount) > 0 &&
        Math.round(Number(amount) * 100) <=
            row.sale_minor - row.refunded_basis_minor;
    useEffect(() => {
        if (!valid) return;
        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setPreviewing(true);
            try {
                const response = await axios.post<RefundPreview>(
                    row.preview_url!,
                    { amount },
                    { signal: controller.signal },
                );
                setPreview(response.data);
            } catch (error) {
                if (!controller.signal.aborted)
                    setError(
                        axios.isAxiosError(error)
                            ? error.response?.data?.message ||
                                  t(
                                      'Could not preview the adjustment. Try again.',
                                  )
                            : t('Could not preview the adjustment. Try again.'),
                    );
            } finally {
                if (!controller.signal.aborted) setPreviewing(false);
            }
        }, 300);
        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [amount, row.preview_url, valid, t]);
    const submit = () => {
        if (!preview || !row.adjust_url) return;
        router.post(
            row.adjust_url,
            { amount, reference, reason, version: preview.version },
            {
                preserveScroll: true,
                onStart: () => {
                    setBusy(true);
                    setError('');
                },
                onFinish: () => setBusy(false),
                onError: (errors) => {
                    setError(Object.values(errors).join(' '));
                    setReviewing(false);
                    setPreview(null);
                },
            },
        );
    };
    return (
        <section className="finance-drawer-section">
            <h3>
                {t(reviewing ? 'Review adjustment' : 'Preview partial refund')}
            </h3>
            <div className="finance-refund-preview">
                <label className="finance-field">
                    {t('Refunded sale value')}
                    <input
                        inputMode="decimal"
                        value={amount}
                        readOnly={reviewing || busy}
                        placeholder="0.00"
                        onChange={(event) => {
                            setAmount(event.target.value);
                            setPreview(null);
                            setPreviewing(false);
                            setError('');
                        }}
                    />
                </label>
                <dl>
                    <div>
                        <dt>{t('Commission reversal')}</dt>
                        <dd>{preview ? money(preview.reversal_minor) : '—'}</dd>
                    </div>
                    <div>
                        <dt>{t('Remaining net earning')}</dt>
                        <dd>
                            {preview ? money(preview.remaining_minor) : '—'}
                        </dd>
                    </div>
                </dl>
            </div>
            {row.refunded_basis_minor > 0 && (
                <p className="finance-muted">
                    {t('Sale value already refunded')}:{' '}
                    {money(row.refunded_basis_minor)}
                </p>
            )}
            {amount && !valid && (
                <p className="finance-warning" role="alert">
                    {t(
                        'Enter a positive amount up to {{amount}} with at most two decimal places.',
                        {
                            amount: money(
                                row.sale_minor - row.refunded_basis_minor,
                            ),
                        },
                    )}
                </p>
            )}
            {previewing && (
                <p className="finance-note" role="status">
                    <LoaderCircle size={16} className="animate-spin" />
                    {t('Calculating adjustment…')}
                </p>
            )}
            {preview?.recovery && (
                <p className="finance-warning">
                    <TriangleAlert size={20} />
                    {t(
                        'Already paid: {{amount}} will become publisher recovery.',
                        { amount: money(preview.reversal_minor) },
                    )}
                </p>
            )}
            {row.adjust_url ? (
                <>
                    <div className="finance-refund-fields">
                        <label className="finance-field">
                            {t('Reference')}
                            <input
                                maxLength={120}
                                value={reference}
                                readOnly={reviewing || busy}
                                placeholder={t('Unique refund reference')}
                                onChange={(event) =>
                                    setReference(event.target.value)
                                }
                            />
                        </label>
                        <label className="finance-field">
                            {t('Reason')}
                            <select
                                value={reason}
                                disabled={reviewing || busy}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                            >
                                <option value="Partial refund (return)">
                                    {t('Partial refund (return)')}
                                </option>
                                <option value="Order cancelled">
                                    {t('Order cancelled')}
                                </option>
                                <option value="Price adjustment">
                                    {t('Price adjustment')}
                                </option>
                            </select>
                        </label>
                    </div>
                    {reviewing && preview && (
                        <p className="finance-note">
                            {t(
                                'Confirm a {{reversal}} commission reversal. The remaining net earning will be {{remaining}}.',
                                {
                                    reversal: money(preview.reversal_minor),
                                    remaining: money(preview.remaining_minor),
                                },
                            )}
                        </p>
                    )}
                    <div className="finance-actions">
                        {reviewing && (
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => setReviewing(false)}
                            >
                                {t('Back')}
                            </Button>
                        )}
                        <Button
                            disabled={
                                busy || !preview || !valid || !reference.trim()
                            }
                            onClick={() =>
                                reviewing ? submit() : setReviewing(true)
                            }
                        >
                            {busy && (
                                <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                />
                            )}
                            {t(
                                reviewing
                                    ? 'Confirm adjustment'
                                    : 'Review adjustment',
                            )}
                        </Button>
                    </div>
                </>
            ) : (
                <p className="finance-muted">
                    {t(
                        'Preview only. An authorized network operator can record adjustments.',
                    )}
                </p>
            )}
            {error && (
                <p className="finance-warning" role="alert">
                    {error}
                    <button
                        onClick={() =>
                            router.reload({ only: ['financeWorkspace'] })
                        }
                    >
                        {t('Refresh earning')}
                    </button>
                </p>
            )}
        </section>
    );
}
