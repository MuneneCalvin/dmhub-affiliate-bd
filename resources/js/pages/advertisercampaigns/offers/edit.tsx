import { GeneratedTrackingTemplate } from '@/components/generated-tracking-template';
import { OfferStepTabs } from '@/components/offer-step-tabs';
import { OfferThumbnailUpload } from '@/components/offer-thumbnail-upload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    CustomDialogComponent,
    ReusableCheckbox,
    ReusableNumberInput,
    ReusablePageTitle,
    ReusableSearchMultiSelect,
    ReusableSearchSelect,
    ReusableTextarea,
    ReusableTextInput,
} from '@/dev/core';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, CommissionType, TNetwork, TOffers } from '@/types';
import { OffersFormValueTypes } from '@/types/schema_types';
import { OFFER_BONUSES, OFFER_TERMS, TRAFFIC_SOURCES } from '@/utils/enums';
import { offersSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const OfferEditPage = () => {
    const { t } = useTranslation();
    const { offer, commissions } = usePage<{
        offer: TOffers;
        commissions: CommissionType[];
    }>().props;

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            networks?: TNetwork;
        }>();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Campaigns'),
            href: advertiser.campaign.index.url(),
        },
        {
            title: t('Offer'),
            href: advertiser.offers.show.url(Number(offer?.id)),
        },
        {
            title: t('Edit'),
            href: '',
        },
    ];

    const getCommissionValue = (
        index: number,
    ): { type: string; value: string } => {
        const comm = offer?.commissions?.[index];
        return {
            type: comm?.commission_type_id?.toString() ?? '',
            value: comm?.commission_value ?? '0.00',
        };
    };

    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
        trigger,
        setError,
    } = useForm<OffersFormValueTypes>({
        resolver: zodResolver(offersSchema),
        defaultValues: {
            name: offer?.name ?? '',
            description: offer?.description ?? '',
            terms: offer?.terms?.terms ?? [],
            commission_type_1: getCommissionValue(0).type,
            commission_value_1: getCommissionValue(0).value,
            commission_type_2: getCommissionValue(1).type,
            commission_value_2: getCommissionValue(1).value,
            minimum_payout: offer?.minimum_payout?.toString() ?? '0.00',
            bonus:
                typeof offer?.bonus === 'object'
                    ? (offer?.bonus?.bonuses ?? [])
                    : [],
            conversion_window_hours:
                offer?.conversion_window_hours?.toString() ?? '',
            click_cookie_lifetime_hours:
                offer?.click_cookie_lifetime_hours?.toString() ?? '',
            allowed_traffic_sources:
                offer?.allowed_traffic_sources?.sources ?? [],
            prohibited_traffic_sources:
                offer?.prohibited_traffic_sources?.sources ?? [],
            preview_url: offer?.preview_url ?? '',
            thumbnail: null,
        },
    });

    const STEP_FIELDS: Record<number, (keyof OffersFormValueTypes)[]> = {
        1: ['name', 'description'],
        2: [
            'commission_type_1',
            'commission_value_1',
            'commission_type_2',
            'commission_value_2',
            'minimum_payout',
            'bonus',
        ],
        3: [
            'conversion_window_hours',
            'click_cookie_lifetime_hours',
            'preview_url',
            'thumbnail',
        ],
        4: ['allowed_traffic_sources', 'prohibited_traffic_sources', 'terms'],
    };

    const changeStep = async (next: number) => {
        if (isSubmitting) return;
        if (next > currentStep) {
            for (let step = 1; step < next; step++) {
                if (!(await trigger(STEP_FIELDS[step]))) {
                    setCurrentStep(step);
                    return;
                }
            }
        }
        setCurrentStep(next);
    };
    const handleNext = () => changeStep(Math.min(currentStep + 1, 4));
    const showErrors = (validationErrors: Record<string, unknown>) => {
        const first = Object.entries(STEP_FIELDS).find(([, fields]) =>
            fields.some((field) => field in validationErrors),
        );
        if (first) setCurrentStep(Number(first[0]));
    };

    const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

    const onSubmit = (values: OffersFormValueTypes) => {
        setIsSubmitting(true);

        const payload = {
            ...values,
            terms: values.terms?.length ? { terms: values.terms } : null,
            bonus: values.bonus?.length ? { bonuses: values.bonus } : null,
            allowed_traffic_sources: values.allowed_traffic_sources?.length
                ? { sources: values.allowed_traffic_sources }
                : null,
            prohibited_traffic_sources: values.prohibited_traffic_sources
                ?.length
                ? { sources: values.prohibited_traffic_sources }
                : null,
        };

        router.post(advertiser.offers.update.url(Number(offer?.id)), payload, {
            forceFormData: true,
            onError: (serverErrors) => {
                Object.entries(serverErrors).forEach(([field, message]) =>
                    setError(field as keyof OffersFormValueTypes, { message }),
                );
                showErrors(serverErrors);
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout>
            <Head title={t('Edit Offer')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={t('Edit Offer')}
                    description={t('Update this offer')}
                    breadcrumbs={breadcrumbs}
                />

                <form
                    onSubmit={(event) => {
                        if (currentStep < 4) {
                            event.preventDefault();
                            void handleNext();
                            return;
                        }
                        void handleSubmit(onSubmit, showErrors)(event);
                    }}
                    className="@container mx-auto w-full max-w-5xl overflow-hidden rounded-xl border bg-card"
                >
                    <OfferStepTabs
                        step={currentStep}
                        onStepChange={changeStep}
                        disabled={isSubmitting}
                    >
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">
                                        {t('Basic Information')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t('Step 1 of 4: Set offer details.')}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableTextInput
                                                id="name"
                                                label={t('Offer Name')}
                                                required
                                                placeholder={t(
                                                    'Enter offer name',
                                                )}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errors.name?.message}
                                            />
                                        )}
                                    />

                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableTextarea
                                                id="description"
                                                label={t('Description')}
                                                rows={3}
                                                placeholder={t(
                                                    'Enter offer description',
                                                )}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={
                                                    errors.description?.message
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between border-t pt-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>

                                    <Button type="button" onClick={handleNext}>
                                        {t('Next')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">
                                        {t('Commission Settings')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'Step 2 of 4: Configure commission and bonus settings.',
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-6 @min-[640px]:grid-cols-2">
                                        <div>
                                            <Controller
                                                name="commission_type_1"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableSearchSelect
                                                        id="commission_type_1"
                                                        label={t(
                                                            'Primary Commission Type',
                                                        )}
                                                        data={commissions.map(
                                                            (
                                                                comm: CommissionType,
                                                            ) => ({
                                                                value: String(
                                                                    comm.id,
                                                                ),
                                                                label: comm.nice_name,
                                                            }),
                                                        )}
                                                        placeholder={t(
                                                            'Select commission type',
                                                        )}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors
                                                                .commission_type_1
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <Controller
                                                name="commission_value_1"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableNumberInput
                                                        id="commission_value_1"
                                                        label={t(
                                                            'Primary Commission Value',
                                                        )}
                                                        required
                                                        step={0.01}
                                                        placeholder="0.00"
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors
                                                                .commission_value_1
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <Controller
                                                name="commission_type_2"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableSearchSelect
                                                        id="commission_type_2"
                                                        label={t(
                                                            'Secondary Commission Type',
                                                        )}
                                                        data={commissions.map(
                                                            (
                                                                comm: CommissionType,
                                                            ) => ({
                                                                value: String(
                                                                    comm.id,
                                                                ),
                                                                label: comm.nice_name,
                                                            }),
                                                        )}
                                                        placeholder={t(
                                                            'Select commission type',
                                                        )}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors
                                                                .commission_type_2
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>

                                        <Controller
                                            name="commission_value_2"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableNumberInput
                                                    id="commission_value_2"
                                                    label={t(
                                                        'Secondary Commission Value',
                                                    )}
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors
                                                            .commission_value_2
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />

                                        <Controller
                                            name="minimum_payout"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableNumberInput
                                                    id="minimum_payout"
                                                    label={t('Minimum Payout')}
                                                    step={0.01}
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors.minimum_payout
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Bonus Types')}</Label>
                                        <div className="grid grid-cols-1 gap-3 @min-[480px]:grid-cols-2 @min-[720px]:grid-cols-3">
                                            {OFFER_BONUSES.map((bonus) => (
                                                <Controller
                                                    key={bonus.value}
                                                    name="bonus"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <ReusableCheckbox
                                                            id={`bonus_${bonus.value}`}
                                                            label={bonus.label}
                                                            checked={
                                                                field.value?.includes(
                                                                    bonus.value,
                                                                ) ?? false
                                                            }
                                                            onChange={(
                                                                checked,
                                                            ) => {
                                                                const currentValues =
                                                                    field.value ??
                                                                    [];
                                                                if (checked) {
                                                                    field.onChange(
                                                                        [
                                                                            ...currentValues,
                                                                            bonus.value,
                                                                        ],
                                                                    );
                                                                } else {
                                                                    field.onChange(
                                                                        currentValues.filter(
                                                                            (
                                                                                v: string,
                                                                            ) =>
                                                                                v !==
                                                                                bonus.value,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        {errors.bonus?.message && (
                                            <p className="text-sm text-red-600">
                                                {errors.bonus.message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>

                                    <Button type="button" onClick={handleNext}>
                                        {t('Next')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">
                                        {t('Tracking Settings')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'Step 3 of 4: Configure conversion and tracking URLs.',
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-6 @min-[640px]:grid-cols-2">
                                        <Controller
                                            name="conversion_window_hours"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableNumberInput
                                                    id="conversion_window_hours"
                                                    label={t(
                                                        'Conversion Window (Hours)',
                                                    )}
                                                    placeholder="24"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors
                                                            .conversion_window_hours
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />

                                        <Controller
                                            name="click_cookie_lifetime_hours"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableNumberInput
                                                    id="click_cookie_lifetime_hours"
                                                    label={t(
                                                        'Click Cookie Lifetime (Hours)',
                                                    )}
                                                    placeholder="720"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors
                                                            .click_cookie_lifetime_hours
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />
                                    </div>

                                    <Controller
                                        name="preview_url"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableTextInput
                                                id="preview_url"
                                                label={t('Landing page URL')}
                                                type="url"
                                                placeholder="https://example.com/landing"
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={
                                                    errors.preview_url?.message
                                                }
                                            />
                                        )}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'Visitors are redirected here after a tracked click. Use the actual form or checkout landing page; DM Hub adds referral_id and click_id to this URL.',
                                        )}
                                    </p>
                                    <Controller
                                        name="preview_url"
                                        control={control}
                                        render={({ field }) => (
                                            <GeneratedTrackingTemplate
                                                landingUrl={field.value ?? ''}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="thumbnail"
                                        control={control}
                                        render={({ field }) => (
                                            <OfferThumbnailUpload
                                                value={field.value}
                                                onChange={field.onChange}
                                                existingUrl={
                                                    offer?.thumbnail_url
                                                }
                                                error={
                                                    errors.thumbnail?.message
                                                }
                                            />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between border-t pt-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>

                                    <Button type="button" onClick={handleNext}>
                                        {t('Next')}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">
                                        {t('Traffic Settings')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t(
                                            'Step 4 of 4: Select traffic sources and terms.',
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <Controller
                                        name="allowed_traffic_sources"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableSearchMultiSelect
                                                id="allowed_traffic_sources"
                                                label={t(
                                                    'Allowed Traffic Sources',
                                                )}
                                                data={TRAFFIC_SOURCES}
                                                placeholder={t(
                                                    'Select allowed traffic sources...',
                                                )}
                                                value={field.value}
                                                onChange={field.onChange}
                                                multiple={true}
                                                error={
                                                    errors
                                                        .allowed_traffic_sources
                                                        ?.message
                                                }
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="prohibited_traffic_sources"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableSearchMultiSelect
                                                id="prohibited_traffic_sources"
                                                label={t(
                                                    'Prohibited Traffic Sources',
                                                )}
                                                data={TRAFFIC_SOURCES}
                                                placeholder={t(
                                                    'Select prohibited traffic sources...',
                                                )}
                                                value={field.value}
                                                onChange={field.onChange}
                                                multiple={true}
                                                error={
                                                    errors
                                                        .prohibited_traffic_sources
                                                        ?.message
                                                }
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="terms"
                                        control={control}
                                        render={({ field }) => (
                                            <ReusableSearchMultiSelect
                                                id="terms"
                                                label={t('Terms & Conditions')}
                                                data={OFFER_TERMS}
                                                placeholder={t(
                                                    'Select terms & conditions...',
                                                )}
                                                value={field.value}
                                                onChange={field.onChange}
                                                multiple={true}
                                                error={errors.terms?.message}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between border-t pt-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBack}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        {t('Back')}
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </OfferStepTabs>
                </form>

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className="sm:max-w-[700px]"
                >
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>
            </div>
        </AppLayout>
    );
};

export default OfferEditPage;
