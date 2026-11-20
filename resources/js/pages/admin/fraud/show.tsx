import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { FraudAssessment } from '@/types/fraud';
import { Head, Link, router, useForm } from '@inertiajs/react';

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
        created_at: string;
    }[];
    canManage: boolean;
};
export default function FraudDetail({
    earning,
    order,
    assessments,
    feedback,
    canManage,
}: Props) {
    const form = useForm({ outcome: 'unknown', reason: '' });
    return (
        <AppLayout>
            <Head title="Conversion fraud checks" />
            <div className="workspace-page space-y-6 p-4 md:p-6">
                <header className="space-y-2">
                    <Link href="/finance" className="text-sm underline">
                        Financial review
                    </Link>
                    <h1 className="text-2xl font-semibold">
                        Fraud checks · {order ?? `Commission #${earning.id}`}
                    </h1>
                    <p>
                        {earning.currency} {earning.amount} · {earning.status}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {canManage && (
                            <Link
                                className="text-sm underline"
                                href={`/finance/fraud?network_id=${earning.network_id}`}
                            >
                                Manage rules
                            </Link>
                        )}
                        {canManage && earning.status === 'pending' && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.post(
                                        `/finance/earnings/${earning.id}/fraud/reassess`,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Request fresh assessment
                            </Button>
                        )}
                        <Link
                            className="text-sm underline"
                            href={`/finance?status=${earning.status}`}
                        >
                            Open commission review
                        </Link>
                    </div>
                </header>
                {!assessments.data.length && (
                    <p>
                        No assessment has been recorded. Pending ledger-backed
                        conversions can be assessed using the current policy.
                    </p>
                )}
                {assessments.data.map((assessment) => (
                    <article
                        key={assessment.id}
                        className="space-y-4 rounded-xl border bg-card p-5"
                    >
                        <div>
                            <h2 className="text-lg font-semibold">
                                Assessment #{assessment.id} ·{' '}
                                {assessment.status}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {new Date(
                                    assessment.created_at,
                                ).toLocaleString()}{' '}
                                · Network version #
                                {assessment.policy_snapshot
                                    ?.network_version_id ?? 'default'}{' '}
                                · Campaign version #
                                {assessment.policy_snapshot
                                    ?.campaign_version_id ?? 'inherited'}
                            </p>
                        </div>
                        <p>
                            Recommendation:{' '}
                            {assessment.recommendation?.replaceAll('_', ' ') ??
                                'Awaiting checks'}{' '}
                            · Enforced score: {assessment.score ?? '—'} · Mode:{' '}
                            {assessment.policy_snapshot?.configuration.mode ??
                                'Awaiting policy'}
                        </p>
                        {assessment.applied_at && (
                            <p className="font-medium">
                                Automatically approved on{' '}
                                {new Date(
                                    assessment.applied_at,
                                ).toLocaleString()}
                                .
                            </p>
                        )}
                        {assessment.eligible_at && (
                            <p className="text-sm">
                                Hold ends:{' '}
                                {new Date(
                                    assessment.eligible_at,
                                ).toLocaleString()}
                            </p>
                        )}
                        {assessment.last_error && (
                            <p role="alert" className="text-destructive">
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr>
                                        {[
                                            'Rule',
                                            'Mode',
                                            'Result',
                                            'Score',
                                            'Explanation',
                                        ].map((title) => (
                                            <th key={title} className="p-2">
                                                {title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {assessment.results?.map((result) => (
                                        <tr
                                            className="border-t"
                                            key={result.id}
                                        >
                                            <td className="p-2">
                                                {result.label}
                                            </td>
                                            <td className="p-2">
                                                {result.mode}
                                            </td>
                                            <td className="p-2">
                                                {result.outcome.replaceAll(
                                                    '_',
                                                    ' ',
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {result.contribution}
                                            </td>
                                            <td className="p-2">
                                                {result.reason}
                                                <details>
                                                    <summary>
                                                        Observed values and
                                                        thresholds
                                                    </summary>
                                                    <pre className="mt-2 max-w-lg overflow-auto text-xs whitespace-pre-wrap">
                                                        {JSON.stringify(
                                                            {
                                                                observed:
                                                                    result.observed,
                                                                thresholds:
                                                                    result.settings,
                                                            },
                                                            null,
                                                            2,
                                                        )}
                                                    </pre>
                                                </details>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {assessment.evidence && (
                            <details>
                                <summary className="cursor-pointer text-sm">
                                    Assessment evidence
                                </summary>
                                <pre className="mt-3 overflow-auto text-xs whitespace-pre-wrap">
                                    {JSON.stringify(
                                        assessment.evidence,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </details>
                        )}
                    </article>
                ))}
                <div className="flex gap-4">
                    {assessments.prev_page_url && (
                        <Link href={assessments.prev_page_url}>Previous</Link>
                    )}
                    {assessments.next_page_url && (
                        <Link href={assessments.next_page_url}>Next</Link>
                    )}
                </div>
                <section className="space-y-4 rounded-xl border bg-card p-5">
                    <h2 className="text-lg font-semibold">
                        Record the verified outcome
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Classification helps measure rule quality. It does not
                        approve, reject or refund a commission. Use financial
                        review for those actions. A manual approval alone is not
                        a confirmed legitimate outcome.
                    </p>
                    <form
                        className="space-y-3"
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
                        <label className="block text-sm">
                            Outcome
                            <select
                                className="mt-1 block rounded-md border bg-background p-2"
                                aria-label="Outcome"
                                value={form.data.outcome}
                                onChange={(e) =>
                                    form.setData('outcome', e.target.value)
                                }
                            >
                                <option value="unknown">
                                    Unknown / remove previous classification
                                </option>
                                <option value="legitimate">
                                    Confirmed legitimate
                                </option>
                                <option value="fraud">Confirmed fraud</option>
                                <option value="ordinary_return">
                                    Ordinary return
                                </option>
                            </select>
                        </label>
                        <label className="block text-sm">
                            Evidence or reason
                            <textarea
                                className="mt-1 block w-full rounded-md border bg-background p-2"
                                required
                                maxLength={500}
                                value={form.data.reason}
                                onChange={(e) =>
                                    form.setData('reason', e.target.value)
                                }
                            />
                        </label>
                        {Object.values(form.errors).length > 0 && (
                            <p role="alert" className="text-destructive">
                                {Object.values(form.errors).join(' ')}
                            </p>
                        )}
                        <Button
                            disabled={
                                form.processing || !form.data.reason.trim()
                            }
                        >
                            Record outcome
                        </Button>
                    </form>
                    <ul className="divide-y text-sm">
                        {feedback.map((item) => (
                            <li key={item.id} className="py-3">
                                <strong>
                                    {item.outcome.replaceAll('_', ' ')}
                                </strong>{' '}
                                · {new Date(item.created_at).toLocaleString()} ·
                                Operator #{item.actor_id}
                                <p>{item.reason}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </AppLayout>
    );
}
