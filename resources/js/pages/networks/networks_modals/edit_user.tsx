/* eslint-disable @typescript-eslint/no-explicit-any */

import { Button } from '@/components/ui/button';
import { ReusableEmailInput, ReusableNormalSelect, ReusableTextInput } from '@/dev/core';
import { cn } from '@/lib/utils';
import { User } from '@/types';
import { router, useForm } from '@inertiajs/react';
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
    handleDialogContextSwitch
}: {
    componentProps: {
        user: User;
        networkId: number;
    },
    handleDialogContextSwitch: any
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
        router.post(`/networks/users/${user?.id}/update`, {
            ...data,
            network_id: networkId,
        }, {
            onSuccess: () => {
                handleDialogContextSwitch?.({ state: false });
            },
        });
    };

    const statusOptions = [
        { value: 'A', label: t('Active') },
        { value: 'D', label: t('Deactivated') },
        { value: 'P', label: t('Pending') },
    ];

    return (
        <div className=''>
            <h4 className='text-xl font-semibold'>
                {t('Edit Network User')}
            </h4>
            <form onSubmit={handleSubmit} className="w-full py-2 mt-4 space-y-4">
                <ReusableTextInput
                    id="first_name"
                    label={t('First Name')}
                    value={data.first_name}
                    onChange={(value: string) => setData('first_name', value)}
                    error={errors.first_name}
                    placeholder={t('eg. Donald')}
                    required
                />
                <ReusableTextInput
                    id="last_name"
                    label={t('Last Name')}
                    value={data.last_name}
                    onChange={(value: string) => setData('last_name', value)}
                    error={errors.last_name}
                    placeholder={t('eg. Trump')}
                    required
                />
                <ReusableEmailInput
                    id="email"
                    label={t('Email Address')}
                    value={data.email}
                    onChange={(value: string) => setData('email', value)}
                    error={errors.email}
                    placeholder="user@example.com"
                    required
                />
                <ReusableTextInput
                    id="title"
                    label={t('Title')}
                    value={data.title}
                    onChange={(value: string) => setData('title', value)}
                    error={errors.title}
                    placeholder={t('eg. Mr, Mrs, Eng')}
                    required
                />
                <ReusableNormalSelect
                    id="status"
                    label={t('Status')}
                    value={data.status}
                    onChange={(value: string) => setData('status', value)}
                    data={statusOptions}
                    placeholder={t('Select status')}
                    error={errors.status}
                />
                <div className="col-span-2 flex gap-4 justify-between mt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            handleDialogContextSwitch?.({ state: false })
                        }>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing} className={cn('bg-primary')}>
                        {processing ? t('Saving...') : t('Update User')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditNetworkUser;
