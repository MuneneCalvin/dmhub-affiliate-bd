import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ReusableModalHeader,
    ReusableNormalSelect,
    ReusableSearchSelect,
} from '@/dev/core';
import { TCountry, TCurrency, TModalPropsW, TNetwork } from '@/types';
import { TNetworkOnboardingTypes } from '@/types/schema_types';
import { COMMISSION_MODELS, FREQUENCY } from '@/utils/enums';
import { networkSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, usePage } from '@inertiajs/react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function EditNetworkModal({
    componentProps,
    handleDialogContextSwitch,
}: Partial<TModalPropsW<TNetwork, { data?: TNetwork }>>) {
    const { t } = useTranslation();

    const { currencies } = usePage<{ currencies: TCurrency[] }>().props;
    const { countries } = usePage<{ countries: TCountry[] }>().props;
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<TNetworkOnboardingTypes>({
        resolver: zodResolver(networkSchema),
        defaultValues: {
            network_name: componentProps?.data?.network_name ?? '',
            owner_email: componentProps?.data?.owner_email ?? '',
            default_currency: componentProps?.data?.default_currency ?? '',
            requires_prepaid_funding: Boolean(
                componentProps?.data?.requires_prepaid_funding,
            ),
            default_commission_model:
                (
                    { '0': 'P', percentage: 'P', fixed: 'F' } as Record<
                        string,
                        string
                    >
                )[componentProps?.data?.default_commission_model ?? ''] ??
                componentProps?.data?.default_commission_model ??
                'P',
            default_commission_value:
                componentProps?.data?.default_commission_value ?? '',
            min_payment_threshold:
                componentProps?.data?.min_payment_threshold ?? '',
            payment_frequency: componentProps?.data?.payment_frequency ?? '',
            pay_day_of_month: componentProps?.data?.pay_day_of_month ?? 1,
            pay_day_of_week: componentProps?.data?.pay_day_of_week ?? 1,
            logo_url: componentProps?.data?.logo_url ?? '',
            support_email: componentProps?.data?.support_email ?? '',
            support_phone: componentProps?.data?.support_phone ?? '',
            country_iso: componentProps?.data?.country_iso ?? '',
        },
    });
    const onSubmit = (data: TNetworkOnboardingTypes) => {
        router.post(`/networks/update/${componentProps?.data?.id}`, data, {
            onSuccess: async () => {
                await componentProps?.refetchNetwork?.();
                handleDialogContextSwitch?.({ state: false });
            },
            onError: (errors) => {
                toast.warning('Update failed:', errors);
            },
        });
    };

    return (
        <div className="w-full">
            <ReusableModalHeader
                title={t('Edit A Network')}
                className="text-left text-primary"
            />
            <form
                className="flex flex-col gap-6"
                onSubmit={handleSubmit(onSubmit)}
            >
                <div className="grid gap-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="network_name">
                                {t('Network Name')}
                            </Label>
                            <Input
                                {...register('network_name')}
                                id="network_name"
                                placeholder={t('Enter network name')}
                            />
                            <InputError
                                message={errors.network_name?.message}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="owner_email">
                                {t('Owner Email')}
                            </Label>
                            <Input
                                {...register('owner_email')}
                                id="owner_email"
                                placeholder="owner@example.com"
                            />
                            <InputError message={errors.owner_email?.message} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Controller
                            name="default_currency"
                            control={control}
                            render={({ field }) => (
                                <ReusableSearchSelect
                                    {...field}
                                    id="default_currency"
                                    label={t('Default Currency')}
                                    data={currencies.map((c) => ({
                                        value: c.currency_code,
                                        label: c.currency_name,
                                    }))}
                                    placeholder={t('Select Currency')}
                                    error={errors.default_currency?.message}
                                />
                            )}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Controller
                            name="default_commission_model"
                            control={control}
                            render={({ field }) => (
                                <ReusableNormalSelect
                                    {...field}
                                    id="default_commission_model"
                                    label={t('Default Commission Model')}
                                    data={COMMISSION_MODELS.map((model) => ({
                                        value: String(model.key),
                                        label: t(model.value),
                                    }))}
                                    placeholder={`${t('Percentage')} | ${t('Fixed')} `}
                                    error={
                                        errors.default_commission_model?.message
                                    }
                                />
                            )}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="default_commission_value">
                            {t('Default Commission Value')}
                        </Label>
                        <Input
                            {...register('default_commission_value')}
                            id="default_commission_value"
                            placeholder="0.00"
                            type="number"
                            step="any"
                        />
                        <InputError
                            message={errors.default_commission_value?.message}
                        />
                    </div>
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            {...register('requires_prepaid_funding')}
                            className="mt-1"
                        />
                        <span>
                            {t('Require prepaid advertiser funds')}
                            <span className="block text-sm text-muted-foreground">
                                {t(
                                    'Off by default. Campaigns can run and accrue commissions before funding. Negative balances show amounts owed; payouts require recorded cash.',
                                )}
                            </span>
                        </span>
                    </label>

                    <div className="grid gap-2">
                        <Label htmlFor="min_payment_threshold">
                            {t('Minimum Payment Threshold')}
                        </Label>
                        <Input
                            {...register('min_payment_threshold')}
                            id="min_payment_threshold"
                            placeholder="0.00"
                            type="number"
                            step="any"
                            max={5}
                        />
                        <InputError
                            message={errors.min_payment_threshold?.message}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Controller
                            name="payment_frequency"
                            control={control}
                            render={({ field }) => (
                                <ReusableNormalSelect
                                    {...field}
                                    id="payment_frequency"
                                    label={t('Payment Frequency')}
                                    data={FREQUENCY.map((frequency) => ({
                                        value: String(frequency.key),
                                        label: t(frequency.value),
                                    }))}
                                    placeholder={`${t('Weekly')} | ${t('Monthly')} `}
                                    error={errors.payment_frequency?.message}
                                />
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="pay_day_of_month">
                                {t('Pay Day of Month')}
                            </Label>
                            <Input
                                {...register('pay_day_of_month', {
                                    valueAsNumber: true,
                                })}
                                id="pay_day_of_month"
                                type="number"
                                min={1}
                                max={31}
                            />
                            <InputError
                                message={errors.pay_day_of_month?.message}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="pay_day_of_week">
                                {t('Pay Day of Week')}
                            </Label>
                            <Input
                                {...register('pay_day_of_week', {
                                    valueAsNumber: true,
                                })}
                                id="pay_day_of_week"
                                type="number"
                                min={0}
                                max={6}
                            />
                            <InputError
                                message={errors.pay_day_of_week?.message}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="logo_url">{t('Logo URL')}</Label>
                        <Input
                            {...register('logo_url')}
                            id="logo_url"
                            type="url"
                        />
                        <InputError message={errors.logo_url?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="support_email">
                            {t('Support Email')}
                        </Label>
                        <Input
                            {...register('support_email')}
                            id="support_email"
                            type="email"
                        />
                        <InputError message={errors.support_email?.message} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="support_phone">
                            {t('Support Phone')}
                        </Label>
                        <Input
                            {...register('support_phone')}
                            id="support_phone"
                            type="tel"
                        />
                        <InputError message={errors.support_phone?.message} />
                    </div>
                    <div className="grid gap-2">
                        <Controller
                            name="country_iso"
                            control={control}
                            render={({ field }) => (
                                <ReusableSearchSelect
                                    {...field}
                                    id="country_iso"
                                    label={t('Country')}
                                    data={countries.map(
                                        (country: TCountry) => ({
                                            value: String(country.country_iso),
                                            label: country.country_name,
                                        }),
                                    )}
                                    placeholder={t('Select country')}
                                    error={errors.country_iso?.message}
                                />
                            )}
                        />
                    </div>
                    <div className="flex w-full items-center justify-between gap-12">
                        <Button
                            className="cursor-pointer border-red-100 text-red-600"
                            {...{
                                variant: 'outline',
                                type: 'button',
                                onClick: () =>
                                    handleDialogContextSwitch?.({
                                        state: false,
                                    }),
                            }}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" className="mt-2 w-50">
                            {t('Submit')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
