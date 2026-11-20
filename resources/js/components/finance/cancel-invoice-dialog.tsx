import { useForm } from '@inertiajs/react';
import { XCircle } from 'lucide-react';
import { useId, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export type CancelTarget = {
    /** POST endpoint taking `reason`. */
    url: string;
    invoiceNumber: string;
    /** `reject` for a pending invoice, `cancel` for an approved one. */
    mode: 'reject' | 'cancel';
};

/**
 * Asks for a reason, then rejects (pending) or cancels (approved) an invoice.
 * The reserved earnings return to the publisher's available balance.
 */
export function CancelInvoiceDialog({
    target,
    onClose,
}: {
    target: CancelTarget | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const id = useId();
    const form = useForm({ reason: '' });
    const errors = form.errors as { reason?: string; finance?: string };

    const close = () => {
        if (form.processing) return;
        form.reset();
        form.clearErrors();
        onClose();
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!target) return;
        form.post(target.url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    const reject = target?.mode === 'reject';

    return (
        <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
            <DialogContent className="sm:max-w-[520px]">
                {target && (
                    <form onSubmit={submit} className="grid gap-5">
                        <DialogHeader icon={<XCircle />} tone="danger">
                            <DialogTitle>
                                {reject
                                    ? t('Reject invoice {{number}}', {
                                          number: target.invoiceNumber,
                                      })
                                    : t('Cancel invoice {{number}}', {
                                          number: target.invoiceNumber,
                                      })}
                            </DialogTitle>
                            <DialogDescription>
                                {t(
                                    'The earnings on this invoice return to the available balance. The reason is kept on the invoice.',
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2">
                            <Label htmlFor={`${id}-reason`}>
                                {reject
                                    ? t('Rejection reason')
                                    : t('Cancellation reason')}
                            </Label>
                            <Textarea
                                id={`${id}-reason`}
                                required
                                rows={4}
                                maxLength={500}
                                value={form.data.reason}
                                onChange={(e) =>
                                    form.setData('reason', e.target.value)
                                }
                                aria-invalid={
                                    Boolean(errors.reason) || undefined
                                }
                                aria-describedby={
                                    errors.reason
                                        ? `${id}-reason-error`
                                        : undefined
                                }
                            />
                            <InputError
                                id={`${id}-reason-error`}
                                message={errors.reason}
                            />
                        </div>
                        {errors.finance && (
                            <Alert variant="danger">
                                <AlertDescription>
                                    {errors.finance}
                                </AlertDescription>
                            </Alert>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={close}
                                disabled={form.processing}
                            >
                                {t('Keep invoice')}
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={
                                    form.processing || !form.data.reason.trim()
                                }
                            >
                                {reject
                                    ? t('Reject invoice')
                                    : t('Cancel invoice')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
