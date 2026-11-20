import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function RecordPayment({
    url,
    onClose,
}: {
    url: string | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({ payment_reference: '', payment_evidence: '' });
    return (
        <Dialog
            open={!!url}
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('Record bank payment')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Record a completed transfer with its unique bank reference and supporting receipt or reconciliation note.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (url)
                            form.post(url, {
                                onSuccess: () => {
                                    form.reset();
                                    onClose();
                                },
                            });
                    }}
                >
                    <div className="space-y-2">
                        <Label htmlFor="payment-reference">
                            {t('Bank reference')}
                        </Label>
                        <Input
                            id="payment-reference"
                            required
                            maxLength={120}
                            value={form.data.payment_reference}
                            onChange={(e) =>
                                form.setData(
                                    'payment_reference',
                                    e.target.value,
                                )
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payment-evidence">
                            {t('Receipt or reconciliation note')}
                        </Label>
                        <Textarea
                            id="payment-evidence"
                            required
                            maxLength={1000}
                            value={form.data.payment_evidence}
                            onChange={(e) =>
                                form.setData('payment_evidence', e.target.value)
                            }
                        />
                    </div>
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p
                            key={key}
                            role="alert"
                            className="text-sm text-destructive"
                        >
                            {error}
                        </p>
                    ))}
                    <Button disabled={form.processing} type="submit">
                        {form.processing
                            ? t('Recording…')
                            : t('Record payment')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
