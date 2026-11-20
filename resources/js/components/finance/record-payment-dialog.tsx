import { useForm } from '@inertiajs/react';
import { HandCoins } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useFormatMoney } from './money';

export type PaymentTarget = {
    /** POST endpoint that records the payment. */
    url: string;
    invoiceNumber: string;
    /** Who is paid, shown under the title. */
    payee?: string | null;
    amount: string | number;
    currency: string;
    /** Network invoices also store a payment method. */
    askMethod?: boolean;
};

type Fields = {
    payment_reference: string;
    payment_evidence: string;
    payment_method: string;
};

/** Client checks mirroring the controller rules (required, max length). */
export function validatePayment(
    data: Pick<Fields, 'payment_reference' | 'payment_evidence'>,
    t: (key: string) => string,
): Partial<Record<keyof Fields, string>> {
    const errors: Partial<Record<keyof Fields, string>> = {};
    if (!data.payment_reference.trim()) {
        errors.payment_reference = t('Enter the bank reference.');
    } else if (data.payment_reference.length > 120) {
        errors.payment_reference = t(
            'The bank reference can be at most 120 characters.',
        );
    }
    if (!data.payment_evidence.trim()) {
        errors.payment_evidence = t('Add the receipt or reconciliation note.');
    } else if (data.payment_evidence.length > 1000) {
        errors.payment_evidence = t('The note can be at most 1000 characters.');
    }
    return errors;
}

/**
 * "Record payment" dialog: shows the amount due and records a completed bank
 * transfer with its unique reference and evidence. Closing it keeps nothing.
 */
export function RecordPaymentDialog({
    target,
    onClose,
    followUp,
}: {
    target: PaymentTarget | null;
    onClose: () => void;
    /** Action on the success toast (e.g. download the PDF, open the invoice). */
    followUp?: { label: string; onClick: () => void };
}) {
    const { t } = useTranslation();
    const money = useFormatMoney();
    const id = useId();
    const form = useForm<Fields>({
        payment_reference: '',
        payment_evidence: '',
        payment_method: t('Bank transfer'),
    });
    const [clientErrors, setClientErrors] = useState<
        Partial<Record<keyof Fields, string>>
    >({});
    const errors = form.errors as Partial<
        Record<keyof Fields | 'finance', string>
    >;
    const errorFor = (field: keyof Fields) =>
        clientErrors[field] ?? errors[field];

    const close = () => {
        if (form.processing) return;
        form.reset();
        form.clearErrors();
        setClientErrors({});
        onClose();
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!target) return;
        const found = validatePayment(form.data, t);
        setClientErrors(found);
        if (Object.keys(found).length) {
            const first = Object.keys(found)[0];
            document.getElementById(`${id}-${first}`)?.focus();
            return;
        }
        form.transform((data) =>
            target.askMethod
                ? data
                : {
                      payment_reference: data.payment_reference,
                      payment_evidence: data.payment_evidence,
                  },
        );
        const number = target.invoiceNumber;
        form.post(target.url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setClientErrors({});
                onClose();
                // Runs after the flash message effect, so this richer toast
                // replaces the generic server message (same id).
                window.setTimeout(() =>
                    toast.success(t('Payment recorded'), {
                        id: 'flash-success',
                        description: t('{{number}} is now marked paid.', {
                            number,
                        }),
                        action: followUp
                            ? {
                                  label: followUp.label,
                                  onClick: followUp.onClick,
                              }
                            : undefined,
                    }),
                );
            },
        });
    };

    const field = (name: keyof Fields) => ({
        id: `${id}-${name}`,
        'aria-invalid': Boolean(errorFor(name)) || undefined,
        'aria-describedby': errorFor(name) ? `${id}-${name}-error` : undefined,
    });

    return (
        <Dialog open={!!target} onOpenChange={(open) => !open && close()}>
            <DialogContent className="sm:max-w-[520px]">
                {target && (
                    <form noValidate onSubmit={submit} className="grid gap-5">
                        <DialogHeader icon={<HandCoins />} tone="finance">
                            <DialogTitle>{t('Record payment')}</DialogTitle>
                            <DialogDescription>
                                {[target.invoiceNumber, target.payee]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-finance-soft px-4 py-3.5">
                            <span className="font-semibold text-finance-ink">
                                {t('Amount due')}
                            </span>
                            <strong className="text-[22px] text-finance-ink tabular-nums">
                                {money(target.amount, target.currency)}
                            </strong>
                        </div>
                        <p className="-mt-2 text-[13px] text-ink-muted">
                            {t(
                                'Record a completed transfer with its unique bank reference and supporting receipt or reconciliation note.',
                            )}
                        </p>

                        <div className="grid gap-2">
                            <Label htmlFor={`${id}-payment_reference`}>
                                {t('Bank reference')}
                            </Label>
                            <Input
                                {...field('payment_reference')}
                                maxLength={120}
                                autoComplete="off"
                                placeholder={t('e.g. bank transaction ID')}
                                value={form.data.payment_reference}
                                onChange={(e) =>
                                    form.setData(
                                        'payment_reference',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                id={`${id}-payment_reference-error`}
                                message={errorFor('payment_reference')}
                            />
                        </div>
                        {target.askMethod && (
                            <div className="grid gap-2">
                                <Label htmlFor={`${id}-payment_method`}>
                                    {t('Method')}
                                </Label>
                                <Input
                                    {...field('payment_method')}
                                    maxLength={100}
                                    value={form.data.payment_method}
                                    onChange={(e) =>
                                        form.setData(
                                            'payment_method',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    id={`${id}-payment_method-error`}
                                    message={errorFor('payment_method')}
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor={`${id}-payment_evidence`}>
                                {t('Receipt or reconciliation note')}
                            </Label>
                            <Textarea
                                {...field('payment_evidence')}
                                rows={3}
                                maxLength={1000}
                                value={form.data.payment_evidence}
                                onChange={(e) =>
                                    form.setData(
                                        'payment_evidence',
                                        e.target.value,
                                    )
                                }
                            />
                            <InputError
                                id={`${id}-payment_evidence-error`}
                                message={errorFor('payment_evidence')}
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
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="success"
                                disabled={form.processing}
                            >
                                {form.processing
                                    ? t('Recording…')
                                    : t('Record payment')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
