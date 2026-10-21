/* eslint-disable @typescript-eslint/no-explicit-any */

import { Button } from '@/components/ui/button';
import { ReusableEmailInput, ReusableModalHeader, ReusableTextInput } from '@/dev/core';
import { cn } from '@/lib/utils';
import { createusers } from '@/routes/networks';
import { TNetworkUserTypes } from '@/types/schema_types';
import { networkUsersSchema } from '@/utils/form-schema';
import { router, useForm } from '@inertiajs/react';
import React from 'react'
import { useTranslation } from 'react-i18next';

const AddUsers = ({
    componentProps,
    handleDialogContextSwitch
}: {
    componentProps: any,
    handleDialogContextSwitch: any
}) => {
    const { t } = useTranslation();
    const { data, setData, errors, setError, processing } = useForm<TNetworkUserTypes>({
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
                    setError(err.path[0] as keyof TNetworkUserTypes, err.message);
                }
            });
            return;
        }
        router.post(createusers(), data);
        handleDialogContextSwitch?.({ state: false })
    };
    return (
        <div className='w-full'>
            <ReusableModalHeader title={t("Add Network Users")} className="text-left text-primary" />
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <ReusableTextInput
                    id="first_name"
                    label={t("First Name")}
                    value={data.first_name}
                    onChange={(value: string) => setData('first_name', value)}
                    error={errors.first_name}
                    placeholder='eg. Donald'
                />
                <ReusableTextInput
                    id="last_name"
                    label={t("Last Name")}
                    value={data.last_name}
                    onChange={(value: string) => setData('last_name', value)}
                    error={errors.last_name}
                    placeholder='eg. Trump'
                />
                <ReusableEmailInput
                    id="email"
                    label={t("Email Address")}
                    value={data.email}
                    onChange={(value: string) => setData('email', value)}
                    error={errors.email}
                    placeholder='network@example.com'
                />
                <ReusableTextInput
                    id="title"
                    label={t("Title")}
                    value={data.title}
                    onChange={(value: string) => setData('title', value)}
                    error={errors.title}
                    placeholder='eg. Mr, Mrs, Eng'
                />
                <div className="col-span-2 flex gap-4 justify-between mt-2">
                    <Button
                        type="button"
                        className={cn('bg-destructive')}
                        onClick={() =>
                            handleDialogContextSwitch?.({ state: false })
                        }>
                        {t('Clear')}
                    </Button>
                    <Button type="submit" disabled={processing} className={cn('bg-primary')}>
                        {processing ? `${t('Saving...')}` : `${t('Add User')}`}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default AddUsers;