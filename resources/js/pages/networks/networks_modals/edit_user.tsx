/* eslint-disable @typescript-eslint/no-explicit-any */

import {
    EmailField,
    SelectField,
    TextField,
} from '@/components/app/form-controls';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { User } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type EditNetworkUserForm = {
    first_name: string;
    last_name: string;
    email: string;
    title: string;
    status: string;
};

const EditNetworkUser = ({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps: {
        user: User;
        networkId: number;
    };
    handleDialogContextSwitch: any;
}) => {
    const { t } = useTranslation();
    const { user, networkId } = componentProps;

    const { data, setData, errors, processing } = useForm<EditNetworkUserForm>({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        title: user?.title || '',
        status: user?.status || 'A',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            `/networks/users/${user?.id}/update`,
            {
                ...data,
                network_id: networkId,
            },
            {
                onSuccess: () => {
                    handleDialogContextSwitch?.({ state: false });
                },
            },
        );
    };

    const statusOptions = [
        { value: 'A', label: t('Active') },
        { value: 'D', label: t('Deactivated') },
        { value: 'P', label: t('Pending') },
    ];

    return (
        <div className="">
            <DialogHeader icon={<UserRound />} tone="partners">
                <DialogTitle>{t('Edit Network User')}</DialogTitle>
                <DialogDescription>
                    {t('Update this person’s details and access status.')}
                </DialogDescription>
            </DialogHeader>
            <form
                onSubmit={handleSubmit}
                className="mt-4 w-full space-y-4 py-2"
            >
                <TextField
                    id="first_name"
                    label={t('First Name')}
                    value={data.first_name}
                    onChange={(value: string) => setData('first_name', value)}
                    error={errors.first_name}
                    placeholder={t('eg. Donald')}
                    required
                />
                <TextField
                    id="last_name"
                    label={t('Last Name')}
                    value={data.last_name}
                    onChange={(value: string) => setData('last_name', value)}
                    error={errors.last_name}
                    placeholder={t('eg. Trump')}
                    required
                />
                <EmailField
                    id="email"
                    label={t('Email Address')}
                    value={data.email}
                    onChange={(value: string) => setData('email', value)}
                    error={errors.email}
                    placeholder="user@example.com"
                    required
                />
                <TextField
                    id="title"
                    label={t('Title')}
                    value={data.title}
                    onChange={(value: string) => setData('title', value)}
                    error={errors.title}
                    placeholder={t('eg. Mr, Mrs, Eng')}
                    required
                />
                <SelectField
                    id="status"
                    label={t('Status')}
                    value={data.status}
                    onChange={(value: string) => setData('status', value)}
                    options={statusOptions}
                    placeholder={t('Select status')}
                    error={errors.status}
                />
                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                            handleDialogContextSwitch?.({ state: false })
                        }
                    >
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? t('Saving...') : t('Update User')}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
};

export default EditNetworkUser;
