import { EmptyState, IdentityCell, SectionCard } from '@/components/app';
import InputError from '@/components/input-error';
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
import { Textarea } from '@/components/ui/textarea';
import { relativeTime } from '@/lib/relative-time';
import applications from '@/routes/applications';
import { Link, router } from '@inertiajs/react';
import { ArrowUpRight, Check, CheckCheck, FileText, X } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export type PendingApplication = {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    campaign_name: string;
    requested_offer_id: number | null;
    requested_offer_name?: string | null;
    applied_at: string | null;
    created_at: string | null;
};

type PendingApplicationsProps = {
    items: PendingApplication[];
    total: number;
    canReview: boolean;
    canApprove: boolean;
    canReject: boolean;
};

const nameOf = (item: PendingApplication) =>
    `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || item.email;

/**
 * Latest pending publisher applications with one-click approve (onto the offer
 * the publisher asked for) and reject with a reason, using the same endpoints
 * as the applications page.
 */
export function PendingApplications({
    items,
    total,
    canReview,
    canApprove,
    canReject,
}: PendingApplicationsProps) {
    const { t, i18n } = useTranslation();
    const [busy, setBusy] = useState<number | null>(null);
    const [rejecting, setRejecting] = useState<PendingApplication | null>(null);

    const approve = (item: PendingApplication) => {
        if (!item.requested_offer_id) return;
        router.post(
            applications.approve.url(item.id),
            { offer_id: item.requested_offer_id, return_to: 'dashboard' },
            {
                preserveScroll: true,
                onStart: () => setBusy(item.id),
                onFinish: () => setBusy(null),
            },
        );
    };

    return (
        <SectionCard
            title={t('Pending applications')}
            description={t('{{count}} waiting for a decision', {
                count: total,
            })}
            icon={<FileText />}
            tone="admin"
            action={
                canReview ? (
                    <Button asChild variant="ghost" size="sm">
                        <Link href={applications.index.url()}>
                            {t('View all')}
                            <ArrowUpRight aria-hidden="true" />
                        </Link>
                    </Button>
                ) : undefined
            }
        >
            {items.length ? (
                <ul className="flex flex-col">
                    {items.map((item) => {
                        const name = nameOf(item);
                        const when = item.applied_at ?? item.created_at;
                        return (
                            <li
                                key={item.id}
                                className="flex items-center gap-3 border-t border-border py-3 first:border-t-0 first:pt-0"
                            >
                                <IdentityCell
                                    className="flex-1"
                                    name={name}
                                    subtitle={[
                                        item.campaign_name,
                                        item.requested_offer_name,
                                        when
                                            ? relativeTime(when, i18n.language)
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                />
                                {canApprove && item.requested_offer_id ? (
                                    <Button
                                        type="button"
                                        variant="success"
                                        size="icon-sm"
                                        aria-label={t('Approve {{name}}', {
                                            name,
                                        })}
                                        disabled={busy !== null}
                                        onClick={() => approve(item)}
                                    >
                                        <Check aria-hidden="true" />
                                    </Button>
                                ) : (
                                    canReview && (
                                        <Button
                                            asChild
                                            variant="secondary"
                                            size="sm"
                                        >
                                            <Link
                                                href={applications.show.url(
                                                    item.id,
                                                )}
                                                aria-label={t(
                                                    'Review {{name}}',
                                                    { name },
                                                )}
                                            >
                                                {t('Review')}
                                            </Link>
                                        </Button>
                                    )
                                )}
                                {canReject && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon-sm"
                                        aria-label={t('Reject {{name}}', {
                                            name,
                                        })}
                                        disabled={busy !== null}
                                        onClick={() => setRejecting(item)}
                                    >
                                        <X aria-hidden="true" />
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <EmptyState
                    icon={<CheckCheck />}
                    tone="admin"
                    title={t('You’re all caught up')}
                    description={t(
                        'New publisher applications will appear here.',
                    )}
                />
            )}
            <RejectDialog
                application={rejecting}
                onClose={() => setRejecting(null)}
            />
        </SectionCard>
    );
}

function RejectDialog({
    application,
    onClose,
}: {
    application: PendingApplication | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const fieldId = useId();
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [processing, setProcessing] = useState(false);

    const close = () => {
        setReason('');
        setError(undefined);
        onClose();
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!application) return;
        router.post(
            applications.reject.url(application.id),
            { rejection_reason: reason, return_to: 'dashboard' },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (errors) => setError(errors.rejection_reason),
                onSuccess: close,
            },
        );
    };

    return (
        <Dialog
            open={application !== null}
            onOpenChange={(open) => !open && close()}
        >
            <DialogContent>
                <form onSubmit={submit} className="flex flex-col gap-5">
                    <DialogHeader icon={<X />} tone="danger">
                        <DialogTitle>{t('Reject application')}</DialogTitle>
                        <DialogDescription>
                            {application &&
                                t(
                                    '{{name}} applied to {{campaign}}. The publisher sees your reason.',
                                    {
                                        name: nameOf(application),
                                        campaign: application.campaign_name,
                                    },
                                )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor={fieldId}>{t('Rejection Reason')}</Label>
                        <Textarea
                            id={fieldId}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            rows={4}
                            maxLength={500}
                            required
                            aria-invalid={error ? true : undefined}
                        />
                        <InputError message={error} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={close}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing || !reason.trim()}
                        >
                            {t('Reject application')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
