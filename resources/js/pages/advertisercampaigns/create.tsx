/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ReusableCheckbox,
    ReusableNumberInput,
    ReusablePageTitle,
    ReusableSearchMultiSelect,
    ReusableSearchSelect,
    ReusableTextarea,
    ReusableTextInput
} from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, TCountry, TCurrency, TTerms } from '@/types';

import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, ArrowRight, CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

import { CampaignFormValues } from '@/types/schema_types';
import { campaignSchema } from '@/utils/form-schema';

import { format } from 'date-fns';
import { Controller, useForm } from 'react-hook-form';
import { CAMPAIGN_METADATA, DEVICES } from '@/utils/enums';
import { useState } from 'react';

const CreateCampaignPage = () => {
    const { t } = useTranslation();
    const { currencies, countries, terms } = usePage<{ currencies: TCurrency[]; countries: TCountry[]; terms: TTerms[] }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Campaigns'), href: advertiser.campaign.index.url() },
        { title: t('Create Campaigns'), href: advertiser.campaign.create.url() }
    ];

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        trigger,
    } = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            name: '',
            description: '',
            terms: [],
            total_budget: '',
            daily_budget: '',
            currency: 'EUR',
            geo_targeting: [],
            device_targeting: [],
            max_publishers: '',
            target_conversions: '',
            target_roi: '',
            metadata: [],
            start_date: undefined,
            end_date: undefined,
            no_end_date: false,
        }
    });

    const startDate = watch('start_date');
    const noEndDate = watch('no_end_date');

    const STEP_FIELDS: Record<number, (keyof CampaignFormValues)[]> = {
        1: ['name', 'description', 'start_date', 'end_date'],
        2: ['terms', 'currency', 'total_budget', 'daily_budget', 'target_conversions'],
        3: ['geo_targeting', 'device_targeting', 'metadata'],
    };

    const handleNext = async () => {
        const valid = await trigger(STEP_FIELDS[currentStep]);
        if (!valid) return;
        setCurrentStep((s) => Math.min(s + 1, 3));
    };

    const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

    const onSubmit = (values: CampaignFormValues) => {
        setIsSubmitting(true);

        const payload = {
            ...values,
            end_date: values.no_end_date ? new Date('2100-12-31') : values.end_date,
            terms: values.terms?.length ? JSON.stringify({ terms: values.terms }) : null,
            geo_targeting: values.geo_targeting?.length ? JSON.stringify({ countries: values.geo_targeting }) : null,
            device_targeting: values.device_targeting?.length ? JSON.stringify({ devices: values.device_targeting }) : null,
            metadata: values.metadata?.length ? JSON.stringify({ tags: values.metadata }) : null,
        };

        router.post(advertiser.campaign.store(), payload, {
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleNoEndDateChange = (checked: boolean) => {
        setValue('no_end_date', checked);
        if (checked) setValue('end_date', undefined);
    };

    return (
        <AppLayout>
            <Head title={t('Create Campaigns')} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Create Campaigns')}
                    description={t('Create Your Campaigns here')}
                    breadcrumbs={breadcrumbs}
                />

                <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-10">
                    {currentStep === 1 && (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">{t('Create Campaign')}</h3>
                                <p className="text-sm text-muted-foreground">{t('Step 1 of 3: Basic campaign details and dates.')}</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableTextInput
                                                id="name"
                                                label={t('Campaign Name')}
                                                required
                                                placeholder={t('Enter campaign name')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.name?.message}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="start_date"
                                        control={control}
                                        render={({ field }) => (
                                            <div className="space-y-2">
                                                <Label>{t('Start Date')} *</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(field.value, 'PPP') : t('Pick a date')}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="start" className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={(d) => field.onChange(d)}
                                                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                {errors.start_date && <p className="text-red-500 text-sm">{errors.start_date.message}</p>}
                                            </div>
                                        )}
                                    />

                                    <div className="space-y-2">
                                        {!noEndDate && (
                                            <Controller
                                                name="end_date"
                                                control={control}
                                                render={({ field }) => (
                                                    <div className="space-y-2">
                                                        <Label>{t('End Date')} *</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {field.value ? format(field.value, 'PPP') : t('Pick a date')}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent align="start" className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={field.value}
                                                                    onSelect={(d) => field.onChange(d)}
                                                                    disabled={(d) => {
                                                                        const today = new Date(new Date().setHours(0, 0, 0, 0));
                                                                        return d < today || (startDate && d < startDate);
                                                                    }}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        {errors.end_date && <p className="text-red-500 text-sm">{errors.end_date.message}</p>}
                                                    </div>
                                                )}
                                            />
                                        )}
                                        <ReusableCheckbox
                                            id="no_end_date"
                                            label={t('Never ending campaign')}
                                            checked={noEndDate ?? false}
                                            onChange={handleNoEndDateChange}
                                        />
                                    </div>
                                </div>

                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableTextarea
                                            id="description"
                                            label={t('Description')}
                                            required
                                            rows={3}
                                            placeholder={t('Enter campaign description')}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.description?.message}
                                        />
                                    )}
                                />
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('Back')}
                                </Button>

                                <Button
                                    type="button"
                                    onClick={handleNext}>
                                    {t('Next')}
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">{t('Terms')}</h3>
                                <p className="text-sm text-muted-foreground">{t('Step 2 of 3: Budget, currency, and campaign terms.')}</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Controller
                                        name="currency"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableSearchSelect
                                                id="currency"
                                                label={t('Currency')}
                                                required
                                                data={currencies.map((c: TCurrency) => ({
                                                    value: c.currency_code,
                                                    label: `${c.currency_code} - ${c.currency_name}`
                                                }))}
                                                placeholder={t('Select Currency')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.currency?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="total_budget"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableNumberInput
                                                id="total_budget"
                                                label={t('Total Budget')}
                                                required
                                                step={0.01}
                                                placeholder="0.00"
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.total_budget?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="daily_budget"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableNumberInput
                                                id="daily_budget"
                                                label={t('Daily Budget')}
                                                required
                                                step={0.01}
                                                placeholder="0.00"
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.daily_budget?.message}
                                            />
                                        )}
                                    />
                                </div>

                                <Controller
                                    name="target_conversions"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableNumberInput
                                            id="target_conversions"
                                            label={t('Target Conversions')}
                                            placeholder="0"
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.target_conversions?.message}
                                        />
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Controller
                                        name="max_publishers"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableNumberInput
                                                id="max_publishers"
                                                label={t('Max Publishers')}
                                                placeholder="0"
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.max_publishers?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="target_roi"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableNumberInput
                                                id="target_roi"
                                                label={t('Target ROI')}
                                                step={0.01}
                                                placeholder="0.00"
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.target_roi?.message}
                                            />
                                        )}
                                    />
                                </div>

                                <Controller
                                    name="terms"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableSearchMultiSelect
                                            id="terms"
                                            label={t('Terms')}
                                            data={(terms ?? []).map((term: TTerms) => ({
                                                value: term.description,
                                                label: term.description,
                                            }))}
                                            placeholder={t('Select terms...')}
                                            value={field.value}
                                            onChange={field.onChange}
                                            multiple
                                            error={errors.terms?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <Button type="button" variant="outline"
                                    onClick={handleBack}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('Back')}
                                </Button>

                                <Button type="button"
                                    onClick={handleNext}>
                                    {t('Next')}
                                    <ArrowRight />
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold">{t('Targeting')}</h3>
                                <p className="text-sm text-muted-foreground">{t('Step 3 of 3: Select audience targeting and tags.')}</p>
                            </div>

                            <div className="space-y-6">
                                <Controller
                                    name="geo_targeting"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableSearchMultiSelect
                                            id="geo_targeting"
                                            label={t('Geo Targeting')}
                                            data={countries.map((c: TCountry) => ({
                                                value: c.country_iso,
                                                label: c.country_name
                                            }))}
                                            placeholder={t('Select countries...')}
                                            value={field.value}
                                            onChange={field.onChange}
                                            multiple={true}
                                            error={errors.geo_targeting?.message}
                                        />
                                    )}
                                />

                                <div className="space-y-2">
                                    <Label>{t('Device Targeting')}</Label>
                                    <div className="flex flex-wrap gap-4">
                                        {DEVICES.map((device: any) => (
                                            <Controller
                                                key={device.value}
                                                name="device_targeting"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableCheckbox
                                                        id={`device_${device.value}`}
                                                        label={device.label}
                                                        checked={field.value?.includes(device.value) ?? false}
                                                        onChange={(checked) => {
                                                            const currentValues = field.value ?? [];
                                                            if (checked) {
                                                                field.onChange([...currentValues, device.value]);
                                                            } else {
                                                                field.onChange(currentValues.filter((v: string) => v !== device.value));
                                                            }
                                                        }}
                                                    />
                                                )}
                                            />
                                        ))}
                                    </div>
                                    {errors.device_targeting?.message && (
                                        <p className="text-sm text-red-600">{errors.device_targeting.message}</p>
                                    )}
                                </div>

                                <Controller
                                    name="metadata"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableSearchMultiSelect
                                            id="metadata"
                                            label={t('Campaign Tags')}
                                            data={CAMPAIGN_METADATA}
                                            placeholder={t('Select tags...')}
                                            value={field.value}
                                            onChange={field.onChange}
                                            multiple={true}
                                            error={errors.metadata?.message}
                                        />
                                    )}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <Button type="button" variant="outline" onClick={handleBack}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('Back')}
                                </Button>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('Create Campaign')}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
};

export default CreateCampaignPage;
