import { StackedBar } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { forwardRef, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { outcomeLabel, previewBreakdown, type FraudPreview } from './meta';

type PreviewCardProps = {
    preview: FraudPreview | null;
    previewing: boolean;
    previewError: string;
    onPreview: () => void;
    reason: string;
    onReasonChange: (reason: string) => void;
    dirty: boolean;
    saving: boolean;
    errors: string[];
};

/**
 * Navy card: compares the edited rules with the active ones on recorded
 * assessments (stacked bar of proposed outcomes) and saves the edit as a new
 * policy version with a required reason.
 */
export const PreviewCard = forwardRef<HTMLElement, PreviewCardProps>(
    function PreviewCard(
        {
            preview,
            previewing,
            previewError,
            onPreview,
            reason,
            onReasonChange,
            dirty,
            saving,
            errors,
        },
        ref,
    ) {
        const { t } = useTranslation();
        const titleId = useId();
        const breakdown = preview ? previewBreakdown(preview) : null;
        const delta = preview
            ? preview.proposed_eligible - preview.current_eligible
            : 0;
        const changedRows =
            preview?.rows.filter((row) => row.current !== row.proposed) ?? [];

        return (
            <section
                ref={ref}
                aria-labelledby={titleId}
                className="flex scroll-mt-24 flex-col gap-4 rounded-card bg-sidebar p-5 text-white shadow-card"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <h2 id={titleId} className="flex-1 text-base font-bold">
                        {t('Preview results')}
                    </h2>
                    {preview && (
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
                                delta > 0
                                    ? 'bg-success-soft text-success-ink'
                                    : delta < 0
                                      ? 'bg-warning-soft text-warning-ink'
                                      : 'bg-white/10 text-white',
                            )}
                        >
                            {t('{{delta}} auto-approvals', {
                                delta: `${delta > 0 ? '+' : ''}${delta}`,
                            })}
                        </span>
                    )}
                </div>
                <p className="text-[13px] text-sidebar-text">
                    {preview
                        ? t(preview.note)
                        : t(
                              'Compare your edits with the active rules on the last 30 days of recorded assessments. Nothing is applied.',
                          )}
                </p>

                {preview && breakdown && (
                    <div aria-live="polite" className="flex flex-col gap-4">
                        {preview.sample_size > 0 ? (
                            <StackedBar
                                variant="dark"
                                stacked
                                label={t('Proposed outcomes')}
                                segments={[
                                    {
                                        key: 'pass',
                                        label: t('Pass'),
                                        value: breakdown.pass,
                                        tone: 'success',
                                    },
                                    {
                                        key: 'review',
                                        label: t('Flagged for review'),
                                        value: breakdown.review,
                                        tone: 'warning',
                                    },
                                    {
                                        key: 'missing',
                                        label: t('Missing evidence'),
                                        value: breakdown.missing,
                                        tone: 'danger',
                                    },
                                ]}
                            />
                        ) : (
                            <p className="rounded-xl bg-white/5 p-3 text-[13px]">
                                {t('No recorded assessments to compare yet.')}
                            </p>
                        )}
                        <dl className="grid grid-cols-2 gap-2 text-[13px]">
                            {[
                                ['Assessments compared', preview.sample_size],
                                ['Eligible today', preview.current_eligible],
                                [
                                    'Eligible with changes',
                                    preview.proposed_eligible,
                                ],
                                ['Decisions that change', preview.changed],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="rounded-xl bg-white/5 px-3 py-2"
                                >
                                    <dt className="text-sidebar-text">
                                        {t(String(label))}
                                    </dt>
                                    <dd className="text-lg font-extrabold tabular-nums">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {changedRows.length > 0 && (
                            <details className="rounded-xl bg-white/5 text-[13px]">
                                <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">
                                    {t(
                                        'Show decisions that change ({{count}})',
                                        {
                                            count: changedRows.length,
                                        },
                                    )}
                                </summary>
                                <ul className="flex max-h-56 flex-col divide-y divide-white/10 overflow-y-auto px-3 pb-2">
                                    {changedRows.map((row) => (
                                        <li
                                            key={row.earning_id}
                                            className="flex flex-wrap items-center gap-x-2 py-2"
                                        >
                                            <Link
                                                href={`/finance/earnings/${row.earning_id}/fraud`}
                                                className="font-bold text-white underline underline-offset-2"
                                            >
                                                #{row.earning_id}
                                            </Link>
                                            <span className="text-sidebar-text">
                                                {t(outcomeLabel(row.current))} →{' '}
                                                <strong className="text-white">
                                                    {t(
                                                        outcomeLabel(
                                                            row.proposed,
                                                        ),
                                                    )}
                                                </strong>
                                            </span>
                                            {row.missing_evidence.length >
                                                0 && (
                                                <span className="w-full text-xs text-sidebar-text">
                                                    {t('Missing evidence')}:{' '}
                                                    {row.missing_evidence
                                                        .map((item) => t(item))
                                                        .join(', ')}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {previewError && (
                    <p
                        role="alert"
                        className="rounded-xl bg-danger-soft p-3 text-[13px] font-semibold text-danger-ink"
                    >
                        {previewError}
                    </p>
                )}

                <Button
                    type="button"
                    variant="translucent"
                    disabled={previewing}
                    onClick={onPreview}
                >
                    {previewing ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                        <FlaskConical aria-hidden="true" />
                    )}
                    {previewing ? t('Comparing…') : t('Run preview')}
                </Button>

                <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <Label htmlFor="policy-reason" className="text-white">
                            {t('Reason for policy change')}
                        </Label>
                        <span className="text-xs text-sidebar-text">
                            {dirty ? t('Unsaved changes') : t('No changes yet')}
                        </span>
                    </div>
                    <Input
                        id="policy-reason"
                        required
                        maxLength={500}
                        placeholder={t(
                            'e.g. Enforce honeypot after a week of clean shadow results',
                        )}
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                    />
                </div>
                {errors.length > 0 && (
                    <p
                        role="alert"
                        className="rounded-xl bg-danger-soft p-3 text-[13px] font-semibold text-danger-ink"
                    >
                        {errors.join(' ')}
                    </p>
                )}
                <Button
                    type="submit"
                    variant="inverse"
                    disabled={saving || !reason.trim()}
                >
                    {t('Save as new version')}
                </Button>
                <p className="text-xs text-sidebar-text">
                    {t(
                        'Saving creates a new version. Completed decisions are not changed; queued approvals recheck the latest policy before applying.',
                    )}
                </p>
            </section>
        );
    },
);
