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
import applications from '@/routes/applications';
import { useForm } from '@inertiajs/react';
import { XCircle } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Asks for a rejection reason and rejects one application (`applications.reject`)
 * or several at once (`applications.bulk-review`).
 */
export function RejectApplicationsDialog({
    open,
    onOpenChange,
    ids,
    applicantName,
    onDone,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ids: number[];
    /** Shown in the description when one application is rejected. */
    applicantName?: string;
    onDone?: () => void;
}) {
    const { t } = useTranslation();
    const fieldId = useId();
    const form = useForm({ rejection_reason: '' });
    const bulk = ids.length > 1;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
                onDone?.();
            },
        };
        if (bulk) {
            form.transform((data) => ({
                ...data,
                ids,
                decision: 'reject',
            }));
            form.post(applications.bulkReview.url(), options);
        } else {
            form.transform((data) => data);
            form.post(applications.reject.url(ids[0]), options);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => !form.processing && onOpenChange(next)}
        >
            <DialogContent className="sm:max-w-[520px]">
                <form onSubmit={submit} className="grid gap-5">
                    <DialogHeader icon={<XCircle />} tone="danger">
                        <DialogTitle>
                            {bulk
                                ? t('Reject {{count}} applications', {
                                      count: ids.length,
                                  })
                                : t('Reject application')}
                        </DialogTitle>
                        <DialogDescription>
                            {bulk || !applicantName
                                ? t(
                                      'The publishers see this reason and can apply again later.',
                                  )
                                : t(
                                      '{{name}} sees this reason and can apply again later.',
                                      { name: applicantName },
                                  )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor={fieldId}>{t('Rejection reason')}</Label>
                        <Textarea
                            id={fieldId}
                            rows={4}
                            maxLength={500}
                            required
                            placeholder={t(
                                'Please provide a reason for rejecting this application...',
                            )}
                            value={form.data.rejection_reason}
                            onChange={(e) =>
                                form.setData('rejection_reason', e.target.value)
                            }
                            aria-invalid={Boolean(form.errors.rejection_reason)}
                            aria-describedby={
                                form.errors.rejection_reason
                                    ? `${fieldId}-error`
                                    : undefined
                            }
                        />
                        <InputError
                            id={`${fieldId}-error`}
                            message={form.errors.rejection_reason}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            disabled={form.processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                form.processing ||
                                !form.data.rejection_reason.trim()
                            }
                        >
                            {form.processing
                                ? t('Rejecting...')
                                : bulk
                                  ? t('Reject selected')
                                  : t('Reject application')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
