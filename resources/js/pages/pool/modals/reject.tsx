import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import networks from '@/routes/networks';
import { useForm } from '@inertiajs/react';
import { XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PoolEntity = {
    id: number;
    business_name?: string | null;
    user?: { first_name?: string | null; last_name?: string | null } | null;
};

type Props = {
    componentProps: {
        advertiser?: PoolEntity;
        publisher?: PoolEntity;
        type: 'advertiser' | 'publisher';
    };
    handleDialogContextSwitch: (value: unknown) => void;
};

const RejectModal = ({ componentProps, handleDialogContextSwitch }: Props) => {
    const { t } = useTranslation();
    const { advertiser, publisher, type } = componentProps;
    const entity = (type === 'advertiser' ? advertiser : publisher)!;
    const person = [entity?.user?.first_name, entity?.user?.last_name]
        .filter(Boolean)
        .join(' ');
    const entityName =
        entity?.business_name && person
            ? `${person} (${entity.business_name})`
            : entity?.business_name || person;

    const form = useForm({ reason: '' });
    const close = () => handleDialogContextSwitch({});

    return (
        <form
            className="grid gap-5"
            onSubmit={(event) => {
                event.preventDefault();
                const url =
                    type === 'advertiser'
                        ? networks.pool.advertisers.reject.url(entity.id)
                        : networks.pool.publishers.reject.url(entity.id);
                form.post(url, { preserveScroll: true, onSuccess: close });
            }}
        >
            <DialogHeader icon={<XCircle />} tone="danger">
                <DialogTitle>
                    {t(
                        type === 'advertiser'
                            ? 'Reject advertiser'
                            : 'Reject publisher',
                    )}
                </DialogTitle>
                <DialogDescription>
                    {t('Remove {{name}} from the pool.', { name: entityName })}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
                <Label htmlFor="pool-reject-reason">
                    {t('Rejection reason')}
                </Label>
                <Textarea
                    id="pool-reject-reason"
                    placeholder={t(
                        'Please provide a reason for rejecting this application...',
                    )}
                    value={form.data.reason}
                    onChange={(e) => form.setData('reason', e.target.value)}
                    rows={4}
                    maxLength={500}
                    aria-invalid={Boolean(form.errors.reason)}
                    aria-describedby={
                        form.errors.reason ? 'pool-reject-error' : undefined
                    }
                />
                <InputError
                    id="pool-reject-error"
                    message={form.errors.reason}
                />
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={close}>
                    {t('Cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="destructive"
                    disabled={form.processing}
                >
                    {form.processing ? t('Rejecting...') : t('Reject')}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default RejectModal;
