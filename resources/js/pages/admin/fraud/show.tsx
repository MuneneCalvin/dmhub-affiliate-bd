import {
    DetailList,
    EmptyState,
    FormField,
    PageHeader,
    SectionCard,
} from '@/components/app';
import { outcomeLabel } from '@/components/fraud/meta';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import type { FraudAssessment } from '@/types/fraud';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ClipboardCheck,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
    earning: {
        id: number;
        status: string;
        currency: string;
        amount: string;
        network_id: number;
    };
    order: string | null;
    assessments: {
        data: FraudAssessment[];
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    feedback: {
        id: number;
        outcome: string;
        reason: string;
        actor_id: number;
        actor_name?: string | null;
        created_at: string;
    }[];
    canManage: boolean;
};

const RESULT_STATUS: Record<string, string> = {
    passed: 'approved',
    flagged: 'flagged',
    unavailable: 'neutral',
};
const FEEDBACK_LABELS: Record<string, string> = {
    unknown: 'Unknown / remove previous classification',
    legitimate: 'Confirmed legitimate',
    fraud: 'Confirmed fraud',
    ordinary_return: 'Ordinary return',
};
const humanize = (value: string) => value.replaceAll('_', ' ');

function AssessmentCard({ assessment }: { assessment: FraudAssessment }) {
    const { t } = useTranslation();
    const formatDate = useDate();
    const snapshot = assessment.policy_snapshot;
    return (
        <SectionCard
            title={t('Assessment #{{id}}', { id: assessment.id })}
            description={formatDate(assessment.created_at)}
            icon={<ShieldCheck />}
            tone="admin"
            action={
                <StatusBadge
                    status={assessment.status}
                    label={t(humanize(assessment.status))}
                />
            }
            bodyClassName="flex flex-col gap-4"
        >
            <DetailList
                labelWidth={180}
                rows={[
                    {
                        label: t('Recommendation'),
                        value: assessment.recommendation
                            ? t(outcomeLabel(assessment.recommendation))
                            : t('Awaiting checks'),
                    },
                    {
                        label: t('Enforced score'),
                        value: assessment.score ?? '—',
                    },
                    {
                        label: t('Automation mode'),
                        value: snapshot?.configuration.mode
                            ? t(humanize(snapshot.configuration.mode))
                            : t('Awaiting policy'),
                    },
                    {
                        label: t('Policy versions'),
                        value: t(
                            'Network #{{network}} · Campaign #{{campaign}}',
                            {
                                network:
                                    snapshot?.network_version_id ??
                                    t('default'),
                                campaign:
                                    snapshot?.campaign_version_id ??
                                    t('inherited'),
                            },
                        ),
                    },
                    ...(assessment.eligible_at
                        ? [
                              {
                                  label: t('Hold ends'),
                                  value: formatDate(assessment.eligible_at),
                              },
                          ]
                        : []),
                    ...(assessment.applied_at
                        ? [
                              {
                                  label: t('Automatically approved'),
                                  value: formatDate(assessment.applied_at),
                              },
                          ]
                        : []),
                ]}
            />
            {assessment.last_error && (
                <p
                    role="alert"
                    className="rounded-xl bg-danger-soft p-3 text-[13px] font-semibold text-danger-ink"
                >
                    {assessment.last_error}
                </p>
            )}
            {!!assessment.reasons?.length && (
                <ul className="list-disc pl-5 text-sm">
                    {assessment.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
            )}
            {!!assessment.results?.length && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Rule')}</TableHead>
                            <TableHead>{t('Mode')}</TableHead>
                            <TableHead>{t('Result')}</TableHead>
                            <TableHead className="text-right">
                                {t('Score')}
                            </TableHead>
                            <TableHead>{t('Explanation')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assessment.results.map((result) => (
                            <TableRow key={result.id}>
                                <TableCell className="font-semibold">
                                    {t(result.label)}
                                </TableCell>
                                <TableCell>
                                    {t(humanize(result.mode))}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge
                                        status={
                                            RESULT_STATUS[result.outcome] ??
                                            result.outcome
                                        }
                                        label={t(humanize(result.outcome))}
                                    />
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {result.contribution}
                                </TableCell>
                                <TableCell className="min-w-64 whitespace-normal">
                                    {result.reason}
                                    <details className="mt-1">
                                        <summary className="cursor-pointer text-xs font-semibold text-brand-ink">
                                            {t(
                                                'Observed values and thresholds',
                                            )}
                                        </summary>
                                        <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-surface-muted p-2 text-xs whitespace-pre-wrap">
                                            {JSON.stringify(
                                                {
                                                    observed: result.observed,
                                                    thresholds: result.settings,
                                                },
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </details>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
            {assessment.evidence && (
                <details className="rounded-xl bg-surface-muted">
                    <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold">
                        {t('Assessment evidence')}
                    </summary>
                    <pre className="overflow-auto px-3 pb-3 text-xs whitespace-pre-wrap">
                        {JSON.stringify(assessment.evidence, null, 2)}
                    </pre>
                </details>
            )}
        </SectionCard>
    );
}

export default function FraudDetail({
    earning,
    order,
    assessments,
    feedback,
    canManage,
}: Props) {
    const { t } = useTranslation();
    const formatDate = useDate();
    const form = useForm({ outcome: 'unknown', reason: '' });
    const title = order ?? t('Commission #{{id}}', { id: earning.id });

    return (
        <AppLayout>
            <Head title={t('Conversion fraud checks')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Fraud checks · {{title}}', { title })}
                    description={
                        <span className="inline-flex flex-wrap items-center gap-2">
                            <span className="font-semibold tabular-nums">
                                {earning.currency} {earning.amount}
                            </span>
                            <StatusBadge
                                status={earning.status}
                                label={t(humanize(earning.status))}
                            />
                        </span>
                    }
                    breadcrumbs={[
                        { title: t('Financial review'), href: '/finance' },
                        {
                            title: t('Fraud checks'),
                            href: `/finance/earnings/${earning.id}/fraud`,
                        },
                    ]}
                    icon={<ShieldAlert />}
                    tone="admin"
                    actions={
                        <>
                            {canManage && (
                                <Button variant="secondary" asChild>
                                    <Link
                                        href={`/finance/fraud?network_id=${earning.network_id}`}
                                    >
                                        <SlidersHorizontal
                                            className="text-admin"
                                            aria-hidden="true"
                                        />
                                        {t('Manage rules')}
                                    </Link>
                                </Button>
                            )}
                            {canManage && earning.status === 'pending' && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() =>
                                        router.post(
                                            `/finance/earnings/${earning.id}/fraud/reassess`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RefreshCw
                                        className="text-analytics"
                                        aria-hidden="true"
                                    />
                                    {t('Request fresh assessment')}
                                </Button>
                            )}
                            <Button asChild>
                                <Link
                                    href={`/finance?status=${earning.status}`}
                                >
                                    {t('Open commission review')}
                                </Link>
                            </Button>
                        </>
                    }
                />

                <div className="flex flex-col items-start gap-[18px] xl:flex-row">
                    <div className="flex w-full min-w-0 flex-col gap-[18px] xl:flex-[2]">
                        {assessments.data.length ? (
                            assessments.data.map((assessment) => (
                                <AssessmentCard
                                    key={assessment.id}
                                    assessment={assessment}
                                />
                            ))
                        ) : (
                            <EmptyState
                                icon={<ShieldCheck />}
                                tone="admin"
                                title={t('No assessment yet')}
                                description={t(
                                    'No assessment has been recorded. Pending ledger-backed conversions can be assessed using the current policy.',
                                )}
                            />
                        )}
                        {(assessments.prev_page_url ||
                            assessments.next_page_url) && (
                            <nav
                                aria-label={t('Pagination')}
                                className="flex gap-2"
                            >
                                {assessments.prev_page_url && (
                                    <Button variant="secondary" asChild>
                                        <Link href={assessments.prev_page_url}>
                                            {t('Previous')}
                                        </Link>
                                    </Button>
                                )}
                                {assessments.next_page_url && (
                                    <Button variant="secondary" asChild>
                                        <Link href={assessments.next_page_url}>
                                            {t('Next')}
                                        </Link>
                                    </Button>
                                )}
                            </nav>
                        )}
                    </div>

                    <SectionCard
                        className="w-full xl:sticky xl:top-24 xl:flex-1"
                        title={t('Record the verified outcome')}
                        description={t(
                            'Classification helps measure rule quality. It does not approve, reject or refund a commission. Use financial review for those actions. A manual approval alone is not a confirmed legitimate outcome.',
                        )}
                        icon={<ClipboardCheck />}
                        tone="analytics"
                        bodyClassName="flex flex-col gap-4"
                    >
                        <form
                            className="flex flex-col gap-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post(
                                    `/finance/earnings/${earning.id}/fraud/feedback`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => form.reset(),
                                    },
                                );
                            }}
                        >
                            <FormField
                                id="feedback-outcome"
                                label={t('Outcome')}
                                error={form.errors.outcome}
                            >
                                <Select
                                    value={form.data.outcome}
                                    onValueChange={(value) =>
                                        form.setData('outcome', value)
                                    }
                                >
                                    <SelectTrigger id="feedback-outcome">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FEEDBACK_LABELS).map(
                                            ([value, label]) => (
                                                <SelectItem
                                                    key={value}
                                                    value={value}
                                                >
                                                    {t(label)}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField
                                id="feedback-reason"
                                label={t('Evidence or reason')}
                                error={form.errors.reason}
                            >
                                <Textarea
                                    id="feedback-reason"
                                    required
                                    maxLength={500}
                                    value={form.data.reason}
                                    onChange={(e) =>
                                        form.setData('reason', e.target.value)
                                    }
                                />
                            </FormField>
                            <Button
                                type="submit"
                                disabled={
                                    form.processing || !form.data.reason.trim()
                                }
                            >
                                {t('Record outcome')}
                            </Button>
                        </form>
                        {feedback.length > 0 && (
                            <ul className="flex flex-col divide-y divide-border border-t border-border text-sm">
                                {feedback.map((item) => (
                                    <li key={item.id} className="py-3">
                                        <strong>
                                            {t(
                                                FEEDBACK_LABELS[item.outcome] ??
                                                    humanize(item.outcome),
                                            )}
                                        </strong>
                                        <p className="text-xs text-ink-muted">
                                            {formatDate(item.created_at)} ·{' '}
                                            {item.actor_name ??
                                                t('Operator #{{id}}', {
                                                    id: item.actor_id,
                                                })}
                                        </p>
                                        <p className="mt-1">{item.reason}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>
                </div>
            </div>
        </AppLayout>
    );
}
