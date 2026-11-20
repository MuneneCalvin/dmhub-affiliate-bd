import { IconTile, MetricTile } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCount } from '@/lib/format';
import { initialsFrom } from '@/lib/tones';
import applications from '@/routes/applications';
import { trafficSourceLabels } from '@/utils/campaign-display';
import { Link } from '@inertiajs/react';
import { Check, CheckCircle2, ExternalLink, FileCheck2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
    APPLICATION_STATUS,
    applicantName,
    siteLabel,
    type ApplicationRow,
} from './types';

/**
 * Review drawer for one application: partner summary, details, the
 * publisher's message, and Reject / Approve for pending applications.
 */
export function ApplicationDrawer({
    application,
    onOpenChange,
    onApprove,
    onReject,
    canApprove = true,
    canReject = true,
    processing = false,
}: {
    application: ApplicationRow | null;
    onOpenChange: (open: boolean) => void;
    onApprove: (application: ApplicationRow) => void;
    onReject: (application: ApplicationRow) => void;
    canApprove?: boolean;
    canReject?: boolean;
    processing?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const count = useCount();
    const a = application;
    const dateTime = (value: string | null | undefined) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              }).format(new Date(value))
            : '—';

    return (
        <Sheet open={a !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 sm:max-w-[460px]">
                {a && (
                    <>
                        <SheetHeader icon={<FileCheck2 />} tone="admin">
                            <SheetTitle>{t('Application details')}</SheetTitle>
                            <SheetDescription asChild>
                                <div>
                                    <StatusBadge
                                        status={
                                            APPLICATION_STATUS[a.status] ??
                                            a.status
                                        }
                                        label={
                                            a.status === 'P'
                                                ? t('Pending review')
                                                : undefined
                                        }
                                    />
                                </div>
                            </SheetDescription>
                        </SheetHeader>
                        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                            <div className="flex items-center gap-3.5">
                                <IconTile
                                    size={56}
                                    tone="brand"
                                    variant="solid"
                                    className="text-lg font-extrabold"
                                >
                                    <span>
                                        {initialsFrom(applicantName(a))}
                                    </span>
                                </IconTile>
                                <div className="min-w-0">
                                    <h3 className="truncate text-xl font-extrabold">
                                        {applicantName(a)}
                                    </h3>
                                    {a.website_url &&
                                    /^https?:\/\//i.test(a.website_url) ? (
                                        <a
                                            href={a.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[13px] font-semibold text-brand-ink hover:underline"
                                        >
                                            {siteLabel(a.website_url)}
                                        </a>
                                    ) : (
                                        <span className="text-[13px] text-ink-muted">
                                            {a.email}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div
                                className="grid grid-cols-3 gap-2.5"
                                aria-label={t('Partner summary')}
                                role="group"
                            >
                                <MetricTile
                                    tone="brand"
                                    label={t('Campaigns')}
                                    value={count(a.partner_summary?.campaigns)}
                                />
                                <MetricTile
                                    tone="partners"
                                    label={t('Approval rate')}
                                    value={
                                        a.partner_summary?.approval_rate == null
                                            ? '—'
                                            : `${a.partner_summary.approval_rate}%`
                                    }
                                />
                                <MetricTile
                                    tone="finance"
                                    label={t('Pending')}
                                    value={count(a.partner_summary?.pending)}
                                />
                            </div>

                            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-3 text-[13px]">
                                <dt className="text-ink-muted">
                                    {t('Campaign')}
                                </dt>
                                <dd className="font-bold">{a.campaign_name}</dd>
                                <dt className="text-ink-muted">
                                    {t('Requested offer')}
                                </dt>
                                <dd className="font-semibold">
                                    {a.requested_offer_name ||
                                        a.offer_name ||
                                        '—'}
                                </dd>
                                <dt className="text-ink-muted">
                                    {t('Promotion type')}
                                </dt>
                                <dd>
                                    <span className="rounded-lg bg-analytics-soft px-2 py-0.5 text-xs font-extrabold text-analytics-ink capitalize">
                                        {trafficSourceLabels(
                                            a.traffic_sources,
                                            t('Not provided'),
                                        )}
                                    </span>
                                </dd>
                                <dt className="text-ink-muted">
                                    {t('Monthly visitors')}
                                </dt>
                                <dd className="font-bold tabular-nums">
                                    {a.monthly_visitors
                                        ? count(a.monthly_visitors)
                                        : '—'}
                                </dd>
                                <dt className="text-ink-muted">{t('Email')}</dt>
                                <dd className="break-all">{a.email}</dd>
                                <dt className="text-ink-muted">
                                    {t('Applied')}
                                </dt>
                                <dd>
                                    {dateTime(a.applied_at ?? a.created_at)}
                                </dd>
                                <dt className="text-ink-muted">{t('Terms')}</dt>
                                <dd>
                                    {a.terms_accepted_at ? (
                                        <span className="inline-flex items-center gap-1.5 font-bold text-success-ink">
                                            <Check
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            {t('Accepted')}
                                        </span>
                                    ) : (
                                        <span className="text-ink-muted">
                                            {t('Not accepted')}
                                        </span>
                                    )}
                                </dd>
                                {a.status === 'R' && a.rejection_reason && (
                                    <>
                                        <dt className="text-ink-muted">
                                            {t('Rejection reason')}
                                        </dt>
                                        <dd>{a.rejection_reason}</dd>
                                    </>
                                )}
                            </dl>

                            <div className="flex flex-col gap-1.5">
                                <span className="text-[13px] font-bold">
                                    {t('Message from publisher')}
                                </span>
                                <p className="rounded-[14px] bg-canvas p-3.5 text-[13px] break-words whitespace-pre-wrap text-ink">
                                    {a.applied_notes || t('No message.')}
                                </p>
                            </div>

                            <Link
                                href={applications.show.url(a.id)}
                                className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-brand-ink hover:underline"
                            >
                                {t('Open full application')}
                                <ExternalLink
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                        {a.status === 'P' && (canApprove || canReject) && (
                            <SheetFooter className="flex-row">
                                {canReject && (
                                    <Button
                                        type="button"
                                        variant="soft"
                                        className="flex-1 bg-danger-soft text-danger-ink hover:bg-danger-soft/80"
                                        onClick={() => onReject(a)}
                                        disabled={processing}
                                    >
                                        <X />
                                        {t('Reject')}
                                    </Button>
                                )}
                                {canApprove && (
                                    <Button
                                        type="button"
                                        variant="success"
                                        className="flex-[2]"
                                        onClick={() => onApprove(a)}
                                        disabled={
                                            processing || !a.requested_offer_id
                                        }
                                        title={
                                            a.requested_offer_id
                                                ? undefined
                                                : t(
                                                      'Open the full application to choose an offer.',
                                                  )
                                        }
                                    >
                                        <CheckCircle2 />
                                        {t('Approve publisher')}
                                    </Button>
                                )}
                            </SheetFooter>
                        )}
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
