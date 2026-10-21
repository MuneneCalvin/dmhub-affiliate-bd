/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import applications from '@/routes/applications';
import { RejectApplicationModalProps } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const RejectApplicationModal = ({ componentProps, handleDialogContextSwitch }: RejectApplicationModalProps) => {
    const { t } = useTranslation();
    const { application } = componentProps;

    const { data, setData, processing, errors } = useForm({
        rejection_reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(applications.reject.url(application.id), data, {
            preserveScroll: true,
            onSuccess: () => {
                handleDialogContextSwitch(null);
            },
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{t('Reject Application')}</DialogTitle>
                <DialogDescription>
                    {t('Reject the application from')} <strong>{application.first_name} {application.last_name}</strong> {t('for')} <strong>{application.offer_name}</strong>
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="rejection_reason">{t('Rejection Reason')}</Label>
                    <Textarea
                        id="rejection_reason"
                        placeholder={t('Please provide a reason for rejecting this application...')}
                        value={data.rejection_reason}
                        onChange={(e) => setData('rejection_reason', e.target.value)}
                        rows={4}
                        required
                    />
                    {errors.rejection_reason && (
                        <p className="text-sm text-red-500">{errors.rejection_reason}</p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogContextSwitch(null)}
                >
                    {t('Cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={processing || !data.rejection_reason.trim()}
                >
                    {processing ? t('Rejecting...') : t('Reject Application')}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default RejectApplicationModal;
