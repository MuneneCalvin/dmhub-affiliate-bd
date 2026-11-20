import { SearchSelect, SelectField } from '@/components/app/form-controls';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TCountry, TCurrency, TModalPropsW, TNetwork } from '@/types';
import { TNetworkOnboardingTypes } from '@/types/schema_types';
import { COMMISSION_MODELS, FREQUENCY } from '@/utils/enums';
import { networkSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, usePage } from '@inertiajs/react';
import { Network } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function EditNetworkModal({
    componentProps,
    handleDialogContextSwitch,
}: Partial<TModalPropsW<TNetwork, { data?: TNetwork }>>) {
    // React Hook Form mutates formState.errors in place, so React Compiler
    // memoisation would hide new errors; opt this form out.
    'use no memo';
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
            <DialogHeader icon={<Network />} tone="partners" className="mb-5">
                <DialogTitle>{t('Edit A Network')}</DialogTitle>
                <DialogDescription>
                    {t('Update the network details and defaults.')}
                </DialogDescription>
            </DialogHeader>
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
                                <SearchSelect
                                    {...field}
                                    id="default_currency"
                                    label={t('Default Currency')}
                                    options={currencies.map((c) => ({
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
                                <SelectField
                                    {...field}
                                    id="default_commission_model"
                                    label={t('Default Commission Model')}
                                    options={COMMISSION_MODELS.map((model) => ({
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
                            <span className="block text-sm text-ink-muted">
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
                                <SelectField
                                    {...field}
                                    id="payment_frequency"
                                    label={t('Payment Frequency')}
                                    options={FREQUENCY.map((frequency) => ({
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
                                <SearchSelect
                                    {...field}
                                    id="country_iso"
                                    label={t('Country')}
                                    options={countries.map(
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
                        <Button type="submit">{t('Save')}</Button>
                    </DialogFooter>
                </div>
            </form>
        </div>
    );
}
