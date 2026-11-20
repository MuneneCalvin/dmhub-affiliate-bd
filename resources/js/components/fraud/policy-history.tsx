import { EmptyState, SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { BarChart3, History, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type PolicyVersion } from './meta';

/** Saved versions, newest first; older ones can be restored as a new version. */
export function PolicyHistory({
    history,
    activeVersionId,
    onRestore,
}: {
    history: PolicyVersion[];
    activeVersionId: number | null;
    onRestore: (version: PolicyVersion) => void;
}) {
    const { t } = useTranslation();
    const formatDate = useDate();
    return (
        <SectionCard
            title={t('Policy history')}
            description={t('Every save is a new version')}
            icon={<History />}
            tone="analytics"
            flush
        >
            {history.length ? (
                <ol className="flex max-h-[420px] flex-col overflow-y-auto border-t border-border">
                    {history.map((version) => {
                        const active = version.id === activeVersionId;
                        return (
                            <li
                                key={version.id}
                                className="flex items-center gap-3 border-b border-border px-5 py-2.5 last:border-b-0"
                            >
                                <span
                                    className={cn(
                                        'rounded-lg px-2 py-0.5 text-xs font-extrabold tabular-nums',
                                        active
                                            ? 'bg-brand-soft text-brand-ink'
                                            : 'bg-surface-tint text-neutral-ink',
                                    )}
                                >
                                    {t('v{{version}}', {
                                        version: version.version,
                                    })}
                                </span>
                                <span className="min-w-0 flex-1 text-[13px]">
                                    {active && (
                                        <strong>{t('Current')} · </strong>
                                    )}
                                    <span className="[overflow-wrap:anywhere]">
                                        {version.reason}
                                    </span>
                                    <br />
                                    <span className="text-ink-muted">
                                        {formatDate(version.created_at)} ·{' '}
                                        {version.actor_name ??
                                            t('Operator #{{id}}', {
                                                id: version.actor_id,
                                            })}
                                    </span>
                                </span>
                                {!active && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        aria-label={t(
                                            'Restore version {{version}}',
                                            {
                                                version: version.version,
                                            },
                                        )}
                                        onClick={() => onRestore(version)}
                                    >
                                        {t('Restore')}
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <EmptyState
                    className="border-t border-border py-8"
                    icon={<History />}
                    tone="analytics"
                    title={t('No versions yet')}
                    description={t('No versions saved for this scope yet.')}
                />
            )}
        </SectionCard>
    );
}

/** Restoring copies an old configuration into a new version; reason required. */
export function RestoreDialog({
    version,
    onClose,
    onConfirm,
}: {
    version: PolicyVersion | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const close = () => {
        setReason('');
        onClose();
    };
    return (
        <Dialog open={!!version} onOpenChange={(open) => !open && close()}>
            <DialogContent>
                <form
                    className="flex flex-col gap-5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (reason.trim()) onConfirm(reason.trim());
                    }}
                >
                    <DialogHeader icon={<RotateCcw />} tone="analytics">
                        <DialogTitle>
                            {t('Restore version {{version}}?', {
                                version: version?.version,
                            })}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Its configuration is copied into a new version and becomes active. Unsaved edits are discarded.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="restore-reason">
                            {t('Reason for restoring')}
                        </Label>
                        <Textarea
                            id="restore-reason"
                            required
                            maxLength={500}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={close}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={!reason.trim()}>
                            <RotateCcw aria-hidden="true" />
                            {t('Restore as new version')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export type RuleStatistics = {
    sample_size: number;
    rules: {
        id: string;
        label: string;
        evaluated: number;
        flagged: number;
        sole_enforced_trigger: number;
        reviewer_disagreements: number;
        confirmed_legitimate: number;
        confirmed_fraud: number;
    }[];
};

const PERFORMANCE_COLUMNS: {
    key: Exclude<keyof RuleStatistics['rules'][number], 'id' | 'label'>;
    label: string;
    help: string;
}[] = [
    { key: 'evaluated', label: 'Evaluated', help: 'Times the rule ran.' },
    { key: 'flagged', label: 'Flagged', help: 'Times it raised a flag.' },
    {
        key: 'sole_enforced_trigger',
        label: 'Sole blocker',
        help: 'Only enforced rule that sent the commission to review.',
    },
    {
        key: 'reviewer_disagreements',
        label: 'Reviewer disagreed',
        help: 'A reviewer approved despite the flag. Not proof of a false positive.',
    },
    {
        key: 'confirmed_legitimate',
        label: 'Confirmed legitimate',
        help: 'Flagged, later classified as legitimate.',
    },
    {
        key: 'confirmed_fraud',
        label: 'Confirmed fraud',
        help: 'Flagged, later classified as fraud.',
    },
];

/** How often each rule ran, flagged and was confirmed (last 30 days). */
export function PerformanceTable({
    statistics,
}: {
    statistics: RuleStatistics;
}) {
    const { t } = useTranslation();
    return (
        <SectionCard
            title={t('Rule performance')}
            description={t(
                'Latest assessment per conversion from the last 30 days (up to 500). Current sample: {{sample}}. Confirmed outcomes need an operator classification; ordinary returns are excluded.',
                { sample: statistics.sample_size },
            )}
            icon={<BarChart3 />}
            tone="analytics"
        >
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Rule')}</TableHead>
                        {PERFORMANCE_COLUMNS.map((col) => (
                            <TableHead key={col.key} className="text-right">
                                {t(col.label)}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {statistics.rules.map((rule) => {
                        const rate = rule.evaluated
                            ? Math.round((rule.flagged / rule.evaluated) * 100)
                            : 0;
                        return (
                            <TableRow key={rule.id}>
                                <TableCell className="font-semibold">
                                    {t(rule.label)}
                                </TableCell>
                                {PERFORMANCE_COLUMNS.map((col) => (
                                    <TableCell
                                        key={col.key}
                                        className="text-right tabular-nums"
                                    >
                                        {rule[col.key]}
                                        {col.key === 'flagged' &&
                                            rule.evaluated > 0 && (
                                                <span className="ml-1 text-xs text-ink-muted">
                                                    ({rate}%)
                                                </span>
                                            )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                {PERFORMANCE_COLUMNS.map((col) => (
                    <div key={col.key}>
                        <dt className="inline font-bold">{t(col.label)}: </dt>
                        <dd className="inline text-ink-muted">{t(col.help)}</dd>
                    </div>
                ))}
            </dl>
        </SectionCard>
    );
}
