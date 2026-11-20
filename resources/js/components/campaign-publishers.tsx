import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { SharedData } from '@/types';
import type {
    Enrollment,
    PublisherWorkspace,
} from '@/types/campaign-publishers';
import { termsText } from '@/utils/partner-terms';
import { Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock3,
    ExternalLink,
    Search,
    TriangleAlert,
    Users,
    XCircle,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-publishers.css';

type Group = 'applications' | 'assignments' | 'rejected';
const groupOf = (row: Enrollment): Group =>
    row.status === 'P'
        ? 'applications'
        : row.status === 'R'
          ? 'rejected'
          : 'assignments';
const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
function websiteUrl(value: string | null) {
    if (!value) return null;
    try {
        const url = new URL(
            /^https?:\/\//i.test(value) ? value : `https://${value}`,
        );
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}
export function EnrollmentRate({
    rates,
    currency,
}: {
    rates: Enrollment['rates'];
    currency: string;
}) {
    const { t, i18n } = useTranslation();
    return (
        <>
            {rates.length
                ? rates
                      .map((rate) => {
                          const value = new Intl.NumberFormat(
                              i18n.language,
                          ).format(Number(rate.value));
                          if (['CPS', 'RevShare'].includes(rate.type))
                              return t('{{value}}% of paid sale', { value });
                          const unit: Record<string, string> = {
                              CPL: 'per lead',
                              CPA: 'per acquisition',
                              Flat: 'flat fee',
                          };
                          return `${currency} ${value} ${t(unit[rate.type] || rate.type)}`;
                      })
                      .join(' · ')
                : t('Not agreed')}
        </>
    );
}
function Website({ value }: { value: string | null }) {
    const { t } = useTranslation();
    const href = websiteUrl(value);
    return href ? (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
        >
            {value?.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
            <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">{t('Opens in a new tab')}</span>
        </a>
    ) : (
        <span className="publisher-muted">{t('No website provided')}</span>
    );
}
function Status({ row }: { row: Enrollment }) {
    const { t } = useTranslation();
    const label = row.terminated_at
        ? 'Terminated'
        : row.status === 'P'
          ? !row.terms_current
              ? 'Terms changed'
              : 'Application pending'
          : row.status === 'R'
            ? 'Rejected'
            : row.status === 'A'
              ? 'Active'
              : 'Inactive';
    return (
        <span
            className={`publisher-status ${row.status === 'P' ? (row.terms_current ? 'pending' : 'warning') : row.status === 'A' && !row.terminated_at ? 'active' : 'neutral'}`}
        >
            {t(label)}
        </span>
    );
}
function EnrollmentDetails({
    row,
    currency,
}: {
    row: Enrollment;
    currency: string;
}) {
    const { t, i18n } = useTranslation();
    const date = (value: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
        }).format(new Date(value)) + ' UTC';
    const historyLabels: Record<string, string> = {
        applied: 'Application submitted',
        reapplied: 'Application resubmitted',
        approved: 'Application approved',
        rejected: 'Application rejected',
        terminated: 'Assignment terminated',
        legacy_state: 'Previous enrollment recorded',
    };
    return (
        <>
            <div className="publisher-identity publisher-detail-identity">
                <span className="publisher-avatar">{initials(row.name)}</span>
                <div>
                    <h3>{row.name || t('Publisher')}</h3>
                    <Website value={row.website} />
                </div>
            </div>
            <dl className="publisher-facts">
                <div>
                    <dt>
                        {t(
                            row.status === 'P' || row.status === 'R'
                                ? 'Requested offer'
                                : 'Assigned offer',
                        )}
                    </dt>
                    <dd>{row.offer || t('No offer selected')}</dd>
                </div>
                <div>
                    <dt>{t('Agreed rate')}</dt>
                    <dd>
                        <strong>
                            <EnrollmentRate
                                rates={row.rates}
                                currency={currency}
                            />
                        </strong>
                    </dd>
                </div>
                <div>
                    <dt>{t('Sources')}</dt>
                    <dd>
                        {row.sources.length
                            ? row.sources
                                  .map((source) => t(String(source)))
                                  .join(' · ')
                            : t('Not provided')}
                    </dd>
                </div>
                <div>
                    <dt>{t('Note')}</dt>
                    <dd className="publisher-prewrap">
                        {row.notes || t('No note provided')}
                    </dd>
                </div>
                {row.status !== 'P' && (
                    <div>
                        <dt>{t('Status')}</dt>
                        <dd>
                            <Status row={row} />
                        </dd>
                    </div>
                )}
            </dl>
            <div
                className={`publisher-notice ${row.terms_accepted_at && (row.status !== 'P' || row.terms_current) ? 'success' : 'warning'}`}
                role="status"
            >
                {row.terms_accepted_at &&
                (row.status !== 'P' || row.terms_current) ? (
                    <CheckCircle2 size={21} />
                ) : (
                    <TriangleAlert size={21} />
                )}
                <div>
                    <strong>
                        {t(
                            row.terms_accepted_at
                                ? row.status === 'P' && !row.terms_current
                                    ? 'Updated terms need acceptance'
                                    : 'Terms accepted'
                                : 'Terms not yet accepted',
                        )}
                    </strong>
                    {row.terms_accepted_at && (
                        <>
                            {' '}
                            ·{' '}
                            <time dateTime={row.terms_accepted_at}>
                                {date(row.terms_accepted_at)}
                            </time>
                        </>
                    )}
                </div>
            </div>
            {row.terms_snapshot && (
                <details className="publisher-terms">
                    <summary>{t('View accepted terms')}</summary>
                    <p>
                        {termsText(row.terms_snapshot.campaign_terms) ||
                            t('No additional campaign terms.')}
                    </p>
                    <p>
                        {termsText(row.terms_snapshot.offer_terms) ||
                            t('No additional offer terms.')}
                    </p>
                    <small>
                        {t('Terms version')}:{' '}
                        <code>{row.terms_version?.slice(0, 12)}</code>
                    </small>
                </details>
            )}
            {row.rejection_reason && (
                <div className="publisher-notice warning">
                    <XCircle size={20} />
                    <div>
                        <strong>{t('Rejection reason')}</strong>
                        <p className="publisher-prewrap">
                            {row.rejection_reason}
                        </p>
                    </div>
                </div>
            )}
            <section className="publisher-history">
                <h3>{t('History')}</h3>
                {row.history.length ? (
                    <ol>
                        {row.history.map((event) => (
                            <li key={event.id}>
                                <span className="publisher-history-icon">
                                    {event.action === 'rejected' ? (
                                        <XCircle size={20} />
                                    ) : (
                                        <CheckCircle2 size={20} />
                                    )}
                                </span>
                                <div>
                                    <p>
                                        {t(
                                            historyLabels[event.action] ||
                                                'Enrollment updated',
                                        )}
                                    </p>
                                    <time dateTime={event.at}>
                                        {date(event.at)}
                                    </time>
                                    {event.reason && (
                                        <p className="publisher-prewrap">
                                            {event.reason}
                                        </p>
                                    )}
                                    {['applied', 'reapplied'].includes(
                                        event.action,
                                    ) &&
                                        event.terms_accepted_at && (
                                            <p className="publisher-history-consent">
                                                {t('Terms accepted')} ·{' '}
                                                {event.terms_version?.slice(
                                                    0,
                                                    12,
                                                )}
                                            </p>
                                        )}
                                </div>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="publisher-muted">
                        {t('No recorded history yet.')}
                    </p>
                )}
            </section>
        </>
    );
}
function ReviewActions({
    row,
    workspace,
    campaignId,
}: {
    row: Enrollment;
    workspace: PublisherWorkspace;
    campaignId: number;
}) {
    const { t } = useTranslation();
    const [rejecting, setRejecting] = useState(false);
    const form = useForm({ decision: 'approve', rejection_reason: '' });
    const submit = (decision: string) => {
        form.transform((data) => ({ ...data, decision }));
        form.post(
            `/advertiser/campaigns/${campaignId}/publishers/${row.id}/review`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejecting(false);
                    form.reset();
                },
            },
        );
    };
    if (row.status !== 'P') return null;
    return (
        <div className="publisher-review-actions">
            {row.approval_blocker && (
                <p className="publisher-action-warning">
                    <TriangleAlert size={17} />
                    {t(row.approval_blocker)}
                </p>
            )}
            {Object.values(form.errors).length > 0 && (
                <div role="alert" className="publisher-form-errors">
                    {Object.values(form.errors).map((error) => (
                        <p key={error}>{t(error)}</p>
                    ))}
                </div>
            )}
            {!workspace.can_approve && !workspace.can_reject ? (
                <p className="publisher-muted">
                    {t('You have read-only access to publisher applications.')}
                </p>
            ) : rejecting ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        submit('reject');
                    }}
                >
                    <label htmlFor="rejection-reason">
                        {t('Rejection reason')}{' '}
                        <span aria-hidden="true">*</span>
                    </label>
                    <Textarea
                        id="rejection-reason"
                        value={form.data.rejection_reason}
                        onChange={(e) =>
                            form.setData('rejection_reason', e.target.value)
                        }
                        required
                        maxLength={500}
                        rows={4}
                        autoFocus
                        aria-invalid={!!form.errors.rejection_reason}
                        placeholder={t(
                            'Explain what the publisher needs to change.',
                        )}
                    />
                    <div className="publisher-action-buttons">
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                form.processing ||
                                !form.data.rejection_reason.trim()
                            }
                        >
                            {t(
                                form.processing
                                    ? 'Saving…'
                                    : 'Confirm rejection',
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => {
                                setRejecting(false);
                                form.clearErrors();
                            }}
                        >
                            {t('Cancel')}
                        </Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="publisher-action-buttons">
                        {workspace.can_approve && (
                            <Button
                                disabled={
                                    form.processing || !!row.approval_blocker
                                }
                                onClick={() => submit('approve')}
                            >
                                {t(
                                    form.processing
                                        ? 'Saving…'
                                        : 'Approve application',
                                )}
                            </Button>
                        )}
                        {workspace.can_reject && (
                            <Button
                                variant="outline"
                                disabled={form.processing}
                                onClick={() => setRejecting(true)}
                            >
                                {t('Reject')}
                            </Button>
                        )}
                    </div>
                    {workspace.can_reject && (
                        <p className="publisher-rejection-hint">
                            {t('Reason required on rejection')}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
export function CampaignPublishers({
    campaign,
}: {
    campaign: { id: number; name: string; currency: string };
}) {
    const {
        props: { publisherWorkspace: workspace },
        url,
    } = usePage<SharedData & { publisherWorkspace: PublisherWorkspace }>();
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const trigger = useRef<HTMLButtonElement | null>(null);
    usePoll(60000, { only: ['publisherWorkspace'] });
    const params = new URLSearchParams(url.split('?')[1]);
    const group: Group =
        params.get('group') === 'assignments'
            ? 'assignments'
            : params.get('group') === 'rejected'
              ? 'rejected'
              : 'applications';
    const selected = workspace.rows.find(
        (row) => row.id === Number(params.get('publisher')),
    );
    const navigate = (next: Group, id?: number) =>
        router.get(
            url.split('?')[0],
            {
                tab: 'publishers',
                group: next,
                ...(id ? { publisher: id } : {}),
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['publisherWorkspace'],
            },
        );
    const open = (row: Enrollment) => navigate(groupOf(row), row.id);
    const rows = workspace.rows.filter(
        (row) =>
            groupOf(row) === group &&
            `${row.name} ${row.website || ''}`
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
    );
    const pages = Math.max(1, Math.ceil(rows.length / 15));
    const currentPage = Math.min(page, pages);
    const assignments = workspace.rows.filter(
        (row) => groupOf(row) === 'assignments',
    );
    const active = assignments.filter(
        (row) => row.status === 'A' && !row.terminated_at,
    ).length;
    const occupied = workspace.rows.filter((row) =>
        ['A', 'I'].includes(row.status),
    ).length;
    const pending = workspace.rows.filter((row) => row.status === 'P');
    const changed = pending.filter((row) => !row.terms_current);
    const blocked = pending.filter(
        (row) => row.terms_current && row.approval_blocker,
    );
    const ready = pending.filter((row) => !row.approval_blocker);
    const shortDate = (value: string | null) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC',
              }).format(new Date(value))
            : '—';
    return (
        <section className="campaign-publishers">
            <header className="publishers-heading">
                <h2>{t('Publishers')}</h2>
                <p>
                    {t('Applications and assignments for {{campaign}}.', {
                        campaign: campaign.name,
                    })}
                </p>
            </header>
            <div
                className="publisher-tabs"
                role="group"
                aria-label={t('Publisher status')}
            >
                {(['applications', 'assignments', 'rejected'] as Group[]).map(
                    (key) => (
                        <button
                            key={key}
                            aria-pressed={group === key}
                            onClick={() => {
                                setPage(1);
                                navigate(key);
                            }}
                        >
                            {t(
                                {
                                    applications: 'Applications',
                                    assignments: 'Assignments',
                                    rejected: 'Rejected',
                                }[key],
                            )}
                            <span>
                                {
                                    workspace.rows.filter(
                                        (row) => groupOf(row) === key,
                                    ).length
                                }
                            </span>
                        </button>
                    ),
                )}
            </div>
            <p className="publisher-capacity">
                <strong>
                    {workspace.capacity
                        ? t('{{occupied}} of {{capacity}} places occupied', {
                              occupied,
                              capacity: workspace.capacity,
                          })
                        : t(
                              '{{occupied}} places occupied · Unlimited capacity',
                              { occupied, count: occupied },
                          )}
                </strong>
                <span>
                    {t('{{total}} active assignments', {
                        total: active,
                        count: active,
                    })}
                </span>
                <span>
                    {t('{{total}} inactive assignments', {
                        total: assignments.length - active,
                        count: assignments.length - active,
                    })}
                </span>
            </p>
            <div className="publisher-search">
                <Search size={20} aria-hidden="true" />
                <Input
                    aria-label={t('Search publisher or website')}
                    placeholder={t('Search publisher or website')}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                    }}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setPage(1);
                        }}
                    >
                        {t('Clear')}
                    </button>
                )}
            </div>
            <div className="publisher-table-wrap">
                <table className="publisher-table">
                    <thead>
                        <tr>
                            <th>{t('Publisher')}</th>
                            <th>{t('Website')}</th>
                            <th>
                                {t(
                                    group === 'assignments'
                                        ? 'Assigned offer'
                                        : 'Requested offer',
                                )}
                            </th>
                            <th>{t('Status')}</th>
                            <th>
                                {t(
                                    group === 'assignments'
                                        ? 'Approved on'
                                        : 'Applied on',
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows
                            .slice((currentPage - 1) * 15, currentPage * 15)
                            .map((row) => (
                                <tr
                                    key={row.id}
                                    className={
                                        selected?.id === row.id
                                            ? 'is-selected'
                                            : ''
                                    }
                                    onClick={() => open(row)}
                                >
                                    <th scope="row">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                trigger.current =
                                                    e.currentTarget;
                                                open(row);
                                            }}
                                            aria-label={t(
                                                'Review {{publisher}}',
                                                { publisher: row.name },
                                            )}
                                            className="publisher-identity"
                                        >
                                            <span
                                                className={`publisher-avatar tone-${row.id % 4}`}
                                            >
                                                {initials(row.name)}
                                            </span>
                                            <strong>
                                                {row.name || t('Publisher')}
                                            </strong>
                                        </button>
                                    </th>
                                    <td>
                                        <Website value={row.website} />
                                    </td>
                                    <td>
                                        {row.offer || t('No offer selected')}
                                    </td>
                                    <td>
                                        <Status row={row} />
                                    </td>
                                    <td className="publisher-date">
                                        {shortDate(
                                            group === 'assignments'
                                                ? row.approved_at
                                                : row.applied_at,
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
                {!rows.length && (
                    <div className="publisher-empty">
                        <Users size={30} />
                        <h3>
                            {t(
                                query
                                    ? 'No matching publishers'
                                    : group === 'applications'
                                      ? 'No applications to review'
                                      : group === 'assignments'
                                        ? 'No assignments yet'
                                        : 'No rejected applications',
                            )}
                        </h3>
                        <p>
                            {t(
                                query
                                    ? 'Try another publisher name or website.'
                                    : group === 'applications'
                                      ? 'New publisher applications will appear here.'
                                      : group === 'assignments'
                                        ? 'Approved publishers will appear here.'
                                        : 'Rejected applications and their reasons will appear here.',
                            )}
                        </p>
                    </div>
                )}
            </div>
            {pages > 1 && (
                <nav
                    className="publisher-pagination"
                    aria-label={t('Publisher table pagination')}
                >
                    <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                    >
                        {t('Previous')}
                    </Button>
                    <span>
                        {t('Page {{page}} of {{pages}}', {
                            page: currentPage,
                            pages,
                        })}
                    </span>
                    <Button
                        variant="outline"
                        disabled={currentPage === pages}
                        onClick={() => setPage(currentPage + 1)}
                    >
                        {t('Next')}
                    </Button>
                </nav>
            )}
            <div className="publisher-alerts" aria-label={t('Needs attention')}>
                {changed.length > 0 && (
                    <div className="publisher-notice warning" role="status">
                        <TriangleAlert size={23} />
                        <p>
                            {changed.length === 1
                                ? t(
                                      '{{publisher}} must accept the updated terms before approval.',
                                      { publisher: changed[0].name },
                                  )
                                : t(
                                      '{{total}} publishers must accept the updated terms before approval.',
                                      { total: changed.length },
                                  )}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => open(changed[0])}
                        >
                            {t('View application')}
                        </Button>
                    </div>
                )}
                {!!workspace.capacity &&
                    occupied >= workspace.capacity &&
                    pending.length > 0 && (
                        <div className="publisher-notice warning" role="status">
                            <TriangleAlert size={23} />
                            <p>
                                {t(
                                    'All publisher places are occupied. Pending applications cannot be approved until capacity is available.',
                                )}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => navigate('assignments')}
                            >
                                {t('View assignments')}
                            </Button>
                        </div>
                    )}
                {blocked.length > 0 &&
                    !(workspace.capacity && occupied >= workspace.capacity) && (
                        <div className="publisher-notice warning" role="status">
                            <TriangleAlert size={23} />
                            <p>
                                {t(
                                    '{{total}} applications need attention before approval.',
                                    {
                                        total: blocked.length,
                                        count: blocked.length,
                                    },
                                )}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => open(blocked[0])}
                            >
                                {t('View application')}
                            </Button>
                        </div>
                    )}
                {ready.length > 0 && group !== 'applications' && (
                    <div className="publisher-notice info" role="status">
                        <Clock3 size={23} />
                        <p>
                            {t('{{total}} applications are ready for review.', {
                                total: ready.length,
                                count: ready.length,
                            })}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => open(ready[0])}
                        >
                            {t('Review applications')}
                        </Button>
                    </div>
                )}
            </div>
            <Sheet
                open={!!selected}
                onOpenChange={(opened) => {
                    if (!opened) navigate(group);
                }}
            >
                <SheetContent
                    className="publisher-drawer"
                    onCloseAutoFocus={(event) => {
                        if (trigger.current?.isConnected) {
                            event.preventDefault();
                            trigger.current.focus();
                        }
                    }}
                >
                    <SheetHeader>
                        <SheetTitle>
                            {t(
                                selected?.status === 'P'
                                    ? 'Review application'
                                    : selected?.status === 'R'
                                      ? 'Rejected application'
                                      : 'Assignment details',
                            )}
                        </SheetTitle>
                        <SheetDescription>{campaign.name}</SheetDescription>
                    </SheetHeader>
                    {selected && (
                        <>
                            <div className="publisher-drawer-body">
                                <EnrollmentDetails
                                    row={selected}
                                    currency={campaign.currency}
                                />
                            </div>
                            <ReviewActions
                                key={selected.id}
                                row={selected}
                                workspace={workspace}
                                campaignId={campaign.id}
                            />
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </section>
    );
}
export function PublisherAssignment({
    campaign,
}: {
    campaign: { id: number; name: string; currency: string };
}) {
    const {
        props: { ownEnrollment },
    } = usePage<SharedData & { ownEnrollment: PublisherWorkspace }>();
    const { t } = useTranslation();
    const row = ownEnrollment.rows[0];
    return (
        <section className="campaign-publishers publisher-own-assignment">
            <header className="publishers-heading">
                <h2>{t('My assignment')}</h2>
                <p>
                    {t('Your partnership with {{campaign}}.', {
                        campaign: campaign.name,
                    })}
                </p>
            </header>
            {row && (
                <>
                    <EnrollmentDetails row={row} currency={campaign.currency} />
                    {['P', 'R'].includes(row.status) && (
                        <div className="publisher-notice info">
                            <Clock3 size={22} />
                            <p>
                                {t(
                                    row.status === 'R'
                                        ? 'Review the feedback and apply again when you are ready.'
                                        : row.terms_current
                                          ? 'Your application is awaiting review.'
                                          : 'Accept the updated terms so your application can be approved.',
                                )}
                            </p>
                            <Link
                                className="publisher-link-button"
                                href={`/publishers/${campaign.id}/campaign/application`}
                            >
                                {t(
                                    row.status === 'R'
                                        ? 'Reapply'
                                        : 'Review application terms',
                                )}
                            </Link>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
