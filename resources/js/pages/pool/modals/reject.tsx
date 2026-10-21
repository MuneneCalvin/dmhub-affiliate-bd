/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import networks from '@/routes/networks';
import { router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const RejectModal = ({ componentProps, handleDialogContextSwitch }: any) => {
    const { t } = useTranslation();
    const { advertiser, publisher, type } = componentProps;

    const entity = type === 'advertiser' ? advertiser : publisher;
    const entityName = type === 'advertiser'
        ? `${advertiser?.user?.first_name} ${advertiser?.user?.last_name} (${advertiser?.business_name})`
        : `${publisher?.user?.first_name} ${publisher?.user?.last_name}`;

    const { data, setData, processing, errors } = useForm({
        reason: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = type === 'advertiser'
            ? networks.pool.advertisers.reject(entity?.id)
            : networks.pool.publishers.reject(entity?.id);

        router.post(url, data, {
            preserveScroll: true,
            onSuccess: () => {
                handleDialogContextSwitch({state: false});
            },
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{t(`Reject ${type === 'advertiser' ? 'Advertiser' : 'Publisher'}`)}</DialogTitle>
                <DialogDescription>
                    {t('Reject')} <strong>{entityName}</strong> {t('from the pool')}
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="reason">{t('Rejection Reason')}</Label>
                    <Textarea
                        id="reason"
                        placeholder={t('Please provide a reason for rejecting this application...')}
                        value={data.reason}
                        onChange={(e) => setData('reason', e.target.value)}
                        rows={4}
                    />
                    {errors.reason && (
                        <p className="text-sm text-red-500">{errors.reason}</p>
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
                    disabled={processing}
                >
                    {processing ? t('Rejecting...') : t('Reject')}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default RejectModal;
