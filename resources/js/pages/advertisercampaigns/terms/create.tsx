/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { ReusableModalHeader, ReusableTextarea } from '@/dev/core';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import { TCampaignTermsTypes } from '@/types/schema_types';
import { campaignTermsSchema } from '@/utils/form-schema';
import { router, useForm } from '@inertiajs/react';
import React from 'react'
import { useTranslation } from 'react-i18next';

const CreateTerms = ({
    handleDialogContextSwitch
}: {
    handleDialogContextSwitch: any
}) => {
    const { t } = useTranslation();
    const { data, setData, errors, setError, processing } = useForm<TCampaignTermsTypes>({
        description: '',
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const result = campaignTermsSchema.safeParse(data);
        if (!result.success) {
            result.error.issues.forEach((err: any) => {
                if (err.path && err.path.length > 0) {
                    setError(err.path[0] as keyof TCampaignTermsTypes, err.message);
                }
            });
            return;
        }
        router.post(advertiser.terms.create(), data);
        handleDialogContextSwitch?.({ state: false })
        router.get(advertiser.terms.url());
    };
    return (
        <div className='w-full p-4'>
            <ReusableModalHeader title={t("Add New Terms")} className="text-left text-primary" />
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <ReusableTextarea
                    id="description"
                    label={t("Description")}
                    value={data.description}
                    onChange={(value: string) => setData('description', value)}
                    error={errors.description}
                    placeholder={t('e.g. No Adult sites')}
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
                        {processing ? `${t('Saving...')}` : `${t('Save')}`}
                    </Button>
                </div>
            </form>
        </div>
    )
}

export default CreateTerms
