/* eslint-disable @typescript-eslint/no-explicit-any */

import { EmailField, TextField } from '@/components/app/form-controls';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { createusers } from '@/routes/networks';
import { TNetworkUserTypes } from '@/types/schema_types';
import { networkUsersSchema } from '@/utils/form-schema';
import { router, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const AddUsers = ({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps: any;
    handleDialogContextSwitch: any;
}) => {
    const { t } = useTranslation();
    const { data, setData, errors, setError, processing } =
        useForm<TNetworkUserTypes>({
            first_name: '',
            last_name: '',
            email: '',
            title: '',
            network_id: componentProps?.network?.id || '',
        });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const result = networkUsersSchema.safeParse(data);
        if (!result.success) {
            result.error.issues.forEach((err: any) => {
                if (err.path && err.path.length > 0) {
                    setError(
                        err.path[0] as keyof TNetworkUserTypes,
                        err.message,
                    );
                }
            });
            return;
        }
        router.post(createusers(), data);
        handleDialogContextSwitch?.({ state: false });
    };
    return (
        <div className="w-full">
            <DialogHeader icon={<UserPlus />} tone="partners">
                <DialogTitle>{t('Add Network Users')}</DialogTitle>
                <DialogDescription>
                    {t('They receive an email to sign in to this network.')}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <TextField
                    id="first_name"
                    label={t('First Name')}
                    value={data.first_name}
                    onChange={(value: string) => setData('first_name', value)}
                    error={errors.first_name}
                    placeholder="eg. Donald"
                />
                <TextField
                    id="last_name"
                    label={t('Last Name')}
                    value={data.last_name}
                    onChange={(value: string) => setData('last_name', value)}
                    error={errors.last_name}
                    placeholder="eg. Trump"
                />
                <EmailField
                    id="email"
                    label={t('Email Address')}
                    value={data.email}
                    onChange={(value: string) => setData('email', value)}
                    error={errors.email}
                    placeholder="network@example.com"
                />
                <TextField
                    id="title"
                    label={t('Title')}
                    value={data.title}
                    onChange={(value: string) => setData('title', value)}
                    error={errors.title}
                    placeholder="eg. Mr, Mrs, Eng"
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
                        {processing ? `${t('Saving...')}` : `${t('Add User')}`}
                    </Button>
                </DialogFooter>
            </form>
        </div>
    );
};

export default AddUsers;
