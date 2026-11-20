import {
    BulkBar,
    BulkBarButton,
    DirectoryPager,
    EmptyState,
    PageHeader,
} from '@/components/app';
import { ApplicationDrawer } from '@/components/applications/application-drawer';
import { RejectApplicationsDialog } from '@/components/applications/reject-applications-dialog';
import {
    APPLICATION_STATUS,
    applicantName,
    siteLabel,
    type ApplicationRow,
} from '@/components/applications/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { relativeTime } from '@/lib/relative-time';
import { initialsFrom, toneClasses, toneFromName } from '@/lib/tones';
import { cn } from '@/lib/utils';
import applications from '@/routes/applications';
import { trafficSourceLabels } from '@/utils/campaign-display';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCheck, FileCheck2, Inbox, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
    applications: LaravelPage<ApplicationRow>;
    currentStatus: string;
    statusCounts: { P: number; A: number; R: number };
    can: { approve: boolean; reject: boolean };
};

export default function ApplicationsPage() {
    const { t, i18n } = useTranslation();
    const {
        applications: page,
        currentStatus,
        statusCounts,
        can,
    } = usePage<Props>().props;
    const query = useDirectoryQuery();
    const rows = page?.data ?? [];
    const [selected, setSelected] = useState<number[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<number[] | null>(null);
    const [processing, setProcessing] = useState(false);
    const open = rows.find((row) => row.id === openId) ?? null;
    const pendingRows = rows.filter((row) => row.status === 'P');
    const selectable = currentStatus === 'P' && (can.approve || can.reject);
    // Only rows still on this page and still pending can stay selected.
    const selection = selected.filter((id) =>
        pendingRows.some((row) => row.id === id),
    );
    const allSelected =
        pendingRows.length > 0 && selection.length === pendingRows.length;

    const toggle = (id: number, on: boolean) =>
        setSelected((current) =>
            on ? [...current, id] : current.filter((value) => value !== id),
        );

    const approve = (row: ApplicationRow) => {
        if (!row.requested_offer_id) return;
        setProcessing(true);
        router.post(
            applications.approve.url(row.id),
            { offer_id: row.requested_offer_id },
            {
                preserveScroll: true,
                onSuccess: () => setOpenId(null),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const approveSelected = () => {
        setProcessing(true);
        router.post(
            applications.bulkReview.url(),
            { ids: selection, decision: 'approve' },
            {
                preserveScroll: true,
                onSuccess: () => setSelected([]),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const rejectTarget =
        rejecting?.length === 1
            ? rows.find((row) => row.id === rejecting[0])
            : undefined;

    return (
        <AppLayout>
            <Head title={t('Publisher applications')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Publisher applications')}
                    description={t(
                        'Review and manage publisher campaign applications',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: applications.index.url(),
                        },
                        {
                            title: t('Applications'),
                            href: applications.index.url(),
                        },
                    ]}
                    icon={<FileCheck2 />}
                    tone="admin"
                />

                <SegmentedControl
                    className="self-start"
                    label={t('Status')}
                    variant="filled"
                    value={currentStatus}
                    onValueChange={(status) => {
                        setSelected([]);
                        query.visit({ status, page: null });
                    }}
                    options={[
                        {
                            value: 'P',
                            label: t('Pending'),
                            count: statusCounts?.P,
                            tone: 'warning',
                        },
                        {
                            value: 'A',
                            label: t('Approved'),
                            count: statusCounts?.A,
                            tone: 'success',
                        },
                        {
                            value: 'R',
                            label: t('Rejected'),
                            count: statusCounts?.R,
                            tone: 'danger',
                        },
                    ]}
                />

                <section
                    aria-label={t('Applications')}
                    className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
                >
                    {selectable && pendingRows.length > 0 && (
                        <div className="flex items-center gap-3.5 border-b border-border bg-surface-muted px-[18px] py-2.5">
                            <Checkbox
                                checked={
                                    allSelected
                                        ? true
                                        : selection.length > 0
                                          ? 'indeterminate'
                                          : false
                                }
                                onCheckedChange={(on) =>
                                    setSelected(
                                        on === true
                                            ? pendingRows.map((row) => row.id)
                                            : [],
                                    )
                                }
                                aria-label={t('Select all on this page')}
                            />
                            <span className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                                {t('Select all on this page')}
                            </span>
                        </div>
                    )}
                    {rows.length === 0 ? (
                        <EmptyState
                            icon={<Inbox />}
                            tone="admin"
                            title={t('No applications here')}
                            description={t(
                                currentStatus === 'P'
                                    ? 'New applications from publishers will appear here.'
                                    : 'Reviewed applications will appear here.',
                            )}
                        />
                    ) : (
                        <ul>
                            {rows.map((row, index) => {
                                const name = applicantName(row);
                                const isOpen = row.id === openId;
                                const checked = selection.includes(row.id);
                                return (
                                    <li
                                        key={row.id}
                                        className={cn(
                                            'flex flex-wrap items-center gap-x-3.5 gap-y-2 px-[18px] py-3 transition-colors sm:flex-nowrap',
                                            index > 0 &&
                                                'border-t border-border',
                                            isOpen
                                                ? 'bg-brand-soft/60 shadow-[inset_4px_0_0_var(--brand-base)]'
                                                : checked
                                                  ? 'bg-surface-muted'
                                                  : 'hover:bg-surface-muted',
                                        )}
                                    >
                                        {selectable && (
                                            <Checkbox
                                                checked={checked}
                                                disabled={row.status !== 'P'}
                                                onCheckedChange={(on) =>
                                                    toggle(row.id, on === true)
                                                }
                                                aria-label={t(
                                                    'Select {{name}}',
                                                    {
                                                        name,
                                                    },
                                                )}
                                            />
                                        )}
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                'inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-extrabold',
                                                toneClasses[toneFromName(name)]
                                                    .soft,
                                            )}
                                        >
                                            {initialsFrom(name)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setOpenId(row.id)}
                                            aria-haspopup="dialog"
                                            className="flex min-h-11 min-w-0 flex-1 flex-col items-start overflow-hidden text-left"
                                        >
                                            <span className="sr-only">
                                                {t('Review')}{' '}
                                            </span>
                                            <strong className="truncate text-sm">
                                                {name}
                                            </strong>
                                            <span className="truncate text-xs text-ink-muted">
                                                {siteLabel(row.website_url) ||
                                                    row.email}
                                            </span>
                                        </button>
                                        <span className="flex w-[170px] min-w-0 flex-col max-sm:order-last max-sm:w-full max-sm:pl-[54px]">
                                            <span className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
                                                {t('Campaign')}
                                            </span>
                                            <span className="truncate font-semibold">
                                                {row.campaign_name}
                                            </span>
                                        </span>
                                        <span className="hidden max-w-[150px] truncate rounded-full bg-analytics-soft px-2.5 py-0.5 text-xs font-bold text-analytics-ink capitalize md:inline">
                                            {trafficSourceLabels(
                                                row.traffic_sources,
                                                t('Not provided'),
                                            )}
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2.5 max-sm:order-last max-sm:w-full max-sm:pl-[54px]">
                                            {currentStatus !== 'P' && (
                                                <StatusBadge
                                                    status={
                                                        APPLICATION_STATUS[
                                                            row.status
                                                        ] ?? row.status
                                                    }
                                                />
                                            )}
                                            <span className="text-xs text-ink-muted sm:w-24 sm:text-right">
                                                {relativeTime(
                                                    row.applied_at ??
                                                        row.created_at,
                                                    i18n.language,
                                                )}
                                            </span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <BulkBar
                        count={selection.length}
                        onClear={() => setSelected([])}
                        actions={
                            <>
                                {can.approve && (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={approveSelected}
                                        disabled={processing}
                                    >
                                        <CheckCheck />
                                        {t('Approve all')}
                                    </Button>
                                )}
                                {can.reject && (
                                    <BulkBarButton
                                        onClick={() => setRejecting(selection)}
                                        disabled={processing}
                                    >
                                        <X />
                                        {t('Reject')}
                                    </BulkBarButton>
                                )}
                            </>
                        }
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-3.5">
                        <span
                            role="status"
                            className="text-[13px] text-ink-muted"
                        >
                            {page?.total
                                ? t('Showing {{from}}–{{to}} of {{total}}', {
                                      from: page.from ?? 0,
                                      to: page.to ?? 0,
                                      total: page.total,
                                  })
                                : t('Showing {{count}} on this page', {
                                      count: 0,
                                  })}
                        </span>
                        {page && (
                            <DirectoryPager
                                page={page.current_page}
                                pageCount={page.last_page}
                                onPageChange={(next) => {
                                    setSelected([]);
                                    query.visit({ page: next });
                                }}
                            />
                        )}
                    </div>
                </section>
            </div>

            <ApplicationDrawer
                application={open}
                onOpenChange={(next) => !next && setOpenId(null)}
                onApprove={approve}
                onReject={(row) => setRejecting([row.id])}
                canApprove={can.approve}
                canReject={can.reject}
                processing={processing}
            />
            <RejectApplicationsDialog
                open={rejecting !== null}
                onOpenChange={(next) => !next && setRejecting(null)}
                ids={rejecting ?? []}
                applicantName={rejectTarget && applicantName(rejectTarget)}
                onDone={() => {
                    setSelected([]);
                    setOpenId(null);
                }}
            />
        </AppLayout>
    );
}
