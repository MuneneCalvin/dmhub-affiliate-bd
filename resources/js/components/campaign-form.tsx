import {
    DetailList,
    IconTile,
    PageHeader,
    Stepper,
    TagInput,
    type StepItem,
} from '@/components/app';
import { MultiSelect } from '@/components/app/form-controls';
import { CampaignFunding } from '@/components/campaign-funding';
import { CampaignPreviewCard, campaignStatusKey } from '@/components/campaigns';
import { CountryTargeting } from '@/components/country-targeting';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { useDate, useMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import { TCampaign, TCountry, TCurrency, TTerms } from '@/types';
import { CampaignFormValues } from '@/types/schema_types';
import { CAMPAIGN_METADATA, DEVICES } from '@/utils/enums';
import { campaignSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    ArrowLeft,
    ArrowRight,
    CalendarIcon,
    CheckCircle2,
    Globe2,
    Info,
    Loader2,
    Megaphone,
    Monitor,
    RefreshCw,
    Rocket,
    Save,
    Smartphone,
    Tablet,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    Controller,
    useForm,
    useWatch,
    type FieldErrors,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/** Fields validated by each wizard step (the last step only reviews). */
export const STEP_FIELDS: (keyof CampaignFormValues | 'advertiser_id')[][] = [
    [
        'name',
        'advertiser_id',
        'currency',
        'description',
        'start_date',
        'end_date',
        'no_end_date',
    ],
    ['geo_targeting', 'device_targeting', 'metadata'],
    [
        'total_budget',
        'daily_budget',
        'max_publishers',
        'target_conversions',
        'target_roi',
        'terms',
    ],
    [],
];

/** Index of the first step with an error, or null. */
export function firstStepWithError(errors: object): number | null {
    const keys = Object.keys(errors);
    const step = STEP_FIELDS.findIndex((fields) =>
        fields.some((field) =>
            keys.some((key) => key === field || key.startsWith(`${field}.`)),
        ),
    );
    return step === -1 ? null : step;
}

const deviceIcons: Record<string, LucideIcon> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
};

function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={id} className="text-[13px] font-semibold text-danger-ink">
            {message}
        </p>
    );
}

function RequiredMark() {
    return (
        <span aria-hidden="true" className="text-admin-ink">
            {' '}
            *
        </span>
    );
}

function CampaignDate({
    id,
    label,
    required = false,
    value,
    onChange,
    min,
    allowPast = false,
    error,
}: {
    id: string;
    label: string;
    required?: boolean;
    value?: Date;
    onChange: (value: Date | undefined) => void;
    min?: Date;
    allowPast?: boolean;
    error?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>
                {label}
                {required && <RequiredMark />}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="secondary"
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className={cn(
                            'w-full justify-start bg-surface-muted font-medium',
                            !value && 'text-ink-muted',
                        )}
                    >
                        <CalendarIcon
                            className="text-analytics"
                            aria-hidden="true"
                        />
                        {value ? format(value, 'PPP') : t('Pick a date')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={value}
                        onSelect={(date) => {
                            onChange(date);
                            setOpen(false);
                        }}
                        disabled={(date) =>
                            min
                                ? date < min
                                : !allowPast &&
                                  date <
                                      new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    />
                </PopoverContent>
            </Popover>
            <FieldError id={`${id}-error`} message={error} />
        </div>
    );
}

/** A labelled control with optional hint and error, on the wizard grid. */
function FormRow({
    id,
    label,
    required,
    hint,
    error,
    wide,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={cn('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
            <Label htmlFor={id}>
                {label}
                {required && <RequiredMark />}
            </Label>
            {children}
            {hint && (
                <p id={`${id}-hint`} className="text-xs text-ink-muted">
                    {hint}
                </p>
            )}
            <FieldError id={`${id}-error`} message={error} />
        </div>
    );
}

export type CampaignAdvertiser = {
    id: number;
    business_name: string;
    available_budget: string;
    currency: string;
};

export type CampaignFormProps = {
    currencies: TCurrency[];
    countries: TCountry[];
    terms: TTerms[];
    advertisers?: CampaignAdvertiser[];
    canSelectAdvertiser?: boolean;
    campaign?: TCampaign;
    /** Edit page: the campaign's advertiser (not changeable). */
    advertiserName?: string | null;
    selectedAdvertiserId?: number | null;
    funding?: { available_budget: string; currency: string } | null;
};

const CampaignForm = ({
    currencies,
    countries,
    terms,
    advertisers = [],
    canSelectAdvertiser = false,
    campaign,
    advertiserName,
    funding,
    selectedAdvertiserId,
}: CampaignFormProps) => {
    // React Hook Form mutates formState.errors in place, so React Compiler
    // memoisation would hide new errors; opt this form out.
    'use no memo';
    const { t } = useTranslation();
    const serverErrors = usePage().props.errors as Record<string, string>;
    const formatDate = useDate();
    const isEditing = !!campaign;
    const title = isEditing ? t('Edit campaign') : t('Create campaign');
    const noInitialEndDate = Number(campaign?.end_date?.slice(0, 4)) >= 2100;
    const [advertiserId, setAdvertiserId] = useState(
        String(selectedAdvertiserId ?? advertisers[0]?.id ?? ''),
    );
    const [advertiserError, setAdvertiserError] = useState<string>();
    const [campaignStatus, setCampaignStatus] = useState(
        campaign?.campaign_status ?? 'A',
    );
    const [currentStep, setCurrentStep] = useState(
        () => firstStepWithError(serverErrors) ?? 0,
    );
    // Move keyboard and screen reader focus to the new step's title when the
    // step changes (not on first render).
    const stepTitleRef = useRef<HTMLHeadingElement>(null);
    const stepFieldsRef = useRef<HTMLFieldSetElement>(null);
    // After a failed step check, focus the first invalid field once the
    // errors have rendered.
    const focusFirstInvalid = () =>
        requestAnimationFrame(() =>
            stepFieldsRef.current
                ?.querySelector<HTMLElement>('[aria-invalid="true"]')
                ?.focus(),
        );
    const shownStep = useRef(currentStep);
    useEffect(() => {
        if (shownStep.current === currentStep) return;
        shownStep.current = currentStep;
        stepTitleRef.current?.focus();
    }, [currentStep]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        trigger,
    } = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignSchema),
        defaultValues: {
            name: campaign?.name ?? '',
            description: campaign?.description ?? '',
            terms: campaign?.terms?.terms ?? [],
            total_budget:
                campaign && Number(campaign.total_budget) > 0
                    ? campaign.total_budget
                    : '',
            daily_budget:
                campaign && Number(campaign.daily_budget) > 0
                    ? campaign.daily_budget
                    : '',
            currency:
                campaign?.currency ??
                advertisers.find((item) => item.id === selectedAdvertiserId)
                    ?.currency ??
                advertisers[0]?.currency ??
                'EUR',
            geo_targeting: campaign?.geo_targeting?.countries ?? [],
            device_targeting: campaign?.device_targeting?.devices ?? [],
            max_publishers: campaign?.max_publishers?.toString() ?? '',
            target_conversions: campaign?.target_conversions?.toString() ?? '',
            target_roi: campaign?.target_roi ?? '',
            metadata: campaign?.metadata?.tags ?? [],
            start_date: campaign?.start_date
                ? parseISO(campaign.start_date.slice(0, 10))
                : undefined,
            end_date:
                !noInitialEndDate && campaign?.end_date
                    ? parseISO(campaign.end_date.slice(0, 10))
                    : undefined,
            no_end_date: noInitialEndDate,
        },
    });
    const values = useWatch({ control }) as CampaignFormValues;
    const selectedAdvertiser = advertisers.find(
        (item) => String(item.id) === advertiserId,
    );
    const advertiserLabel = isEditing
        ? advertiserName
        : selectedAdvertiser?.business_name;
    const money = useMoney(values.currency || 'EUR');
    const tagLabel = (tag: string) =>
        t(
            CAMPAIGN_METADATA.find((option) => option.value === tag)?.label ??
                tag,
        );
    const errorFor = (field: keyof CampaignFormValues) =>
        errors[field]?.message
            ? t(String(errors[field]?.message))
            : serverErrors[field];
    // Inside Controller renders, read the field's own state: the React
    // Compiler memoises the outer formState read, so errors never showed.
    const fieldError = (
        field: keyof CampaignFormValues,
        fieldState: { error?: { message?: string } },
    ) =>
        fieldState.error?.message
            ? t(String(fieldState.error.message))
            : serverErrors[field];
    const allErrors: Record<string, unknown> = {
        ...serverErrors,
        ...errors,
        ...(advertiserError ? { advertiser_id: advertiserError } : {}),
    };

    const steps: (StepItem & { heading: string; icon: ReactNode })[] = [
        {
            id: 'essentials',
            title: t('The essentials'),
            heading: t('Name, description and schedule'),
            icon: <Megaphone />,
        },
        {
            id: 'audience',
            title: t('Audience & targeting'),
            heading: t('Countries, devices and tags'),
            icon: <Globe2 />,
        },
        {
            id: 'budget',
            title: t('Budget & terms'),
            heading: t('Optional limits and agreements'),
            icon: <Wallet />,
        },
        {
            id: 'review',
            title: t('Check details'),
            heading: t(isEditing ? 'Review and save' : 'Review and create'),
            icon: <CheckCircle2 />,
        },
    ].map((step, index) => ({
        ...step,
        description:
            index < 3 && firstStepWithError(allErrors) === index
                ? t('Check details')
                : step.heading,
    }));
    const stepTones = ['brand', 'analytics', 'finance', 'partners'] as const;
    const lastStep = steps.length - 1;

    const validateAdvertiser = () => {
        if (!isEditing && canSelectAdvertiser && !advertiserId) {
            setAdvertiserError(t('Select an advertiser.'));
            return false;
        }
        setAdvertiserError(undefined);
        return true;
    };
    const validateStep = async (step: number) => {
        const fields = STEP_FIELDS[step].filter(
            (field): field is keyof CampaignFormValues =>
                field !== 'advertiser_id',
        );
        const valid = fields.length ? await trigger(fields) : true;
        return step === 0 ? validateAdvertiser() && valid : valid;
    };
    const goTo = async (next: number) => {
        if (isSubmitting) return;
        if (next > currentStep) {
            for (let step = currentStep; step < next; step++) {
                if (!(await validateStep(step))) {
                    setCurrentStep(step);
                    focusFirstInvalid();
                    return;
                }
            }
        }
        setCurrentStep(next);
    };
    const showFirstError = (validationErrors: FieldErrors | object) => {
        const step = firstStepWithError(validationErrors);
        if (step !== null) setCurrentStep(step);
    };
    const onSubmit = (formValues: CampaignFormValues) => {
        if (!validateAdvertiser()) {
            setCurrentStep(0);
            return;
        }
        setIsSubmitting(true);
        router.post(
            campaign
                ? advertiser.campaign.update(campaign.id)
                : advertiser.campaign.store(),
            {
                ...formValues,
                campaign_status: campaignStatus,
                ...(!campaign && canSelectAdvertiser
                    ? { advertiser_id: advertiserId }
                    : {}),
                total_budget: formValues.total_budget || null,
                daily_budget: formValues.daily_budget || null,
                start_date: format(formValues.start_date, 'yyyy-MM-dd'),
                end_date: formValues.no_end_date
                    ? '2100-12-31'
                    : formValues.end_date
                      ? format(formValues.end_date, 'yyyy-MM-dd')
                      : null,
                terms: formValues.terms?.length
                    ? JSON.stringify({ terms: formValues.terms })
                    : null,
                geo_targeting: formValues.geo_targeting?.length
                    ? JSON.stringify({ countries: formValues.geo_targeting })
                    : null,
                device_targeting: formValues.device_targeting?.length
                    ? JSON.stringify({ devices: formValues.device_targeting })
                    : null,
                metadata: formValues.metadata?.length
                    ? JSON.stringify({ tags: formValues.metadata })
                    : null,
            },
            {
                onError: showFirstError,
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const statusOptions = [
        {
            value: 'A',
            title: t('Active'),
            hint: t('Can receive traffic during its dates'),
            tone: 'partners' as const,
        },
        {
            value: 'P',
            title: t('Paused'),
            hint: t('Visible, but no traffic is accepted'),
            tone: 'finance' as const,
        },
        {
            value: 'I',
            title: t('Inactive'),
            hint: t('Hidden for now'),
            tone: 'brand' as const,
        },
    ];
    const countryNames = (codes: string[] = []) =>
        codes.length
            ? codes
                  .map(
                      (code) =>
                          countries.find(
                              (country) => country.country_iso === code,
                          )?.country_name ?? code,
                  )
                  .join(', ')
            : t('All countries');
    const deviceNames = (devices: string[] = []) =>
        devices.length
            ? devices
                  .map((device) =>
                      t(
                          DEVICES.find((item) => item.value === device)
                              ?.label ?? device,
                      ),
                  )
                  .join(', ')
            : t('All devices');
    const limit = (value?: string) =>
        value && Number(value) > 0 ? money(Number(value)) : t('No limit');

    const reviewSection = (
        step: number,
        rows: { label: string; value: ReactNode }[],
    ) => (
        <section
            aria-labelledby={`review-${steps[step].id}`}
            className="rounded-card border border-border"
        >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h3
                    id={`review-${steps[step].id}`}
                    className="text-sm font-bold"
                >
                    {steps[step].title}
                </h3>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setCurrentStep(step)}
                    aria-label={t('Edit {{section}}', {
                        section: steps[step].title,
                    })}
                >
                    {t('Edit')}
                </Button>
            </header>
            <div className="px-4 py-3">
                <DetailList rows={rows} />
            </div>
        </section>
    );

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={t(
                        'Four short steps. Fields marked * are required.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        ...(campaign
                            ? [
                                  {
                                      title: campaign.name,
                                      href: advertiser.campaign.show.url(
                                          campaign.id,
                                      ),
                                  },
                              ]
                            : []),
                        {
                            title,
                            href: campaign
                                ? advertiser.campaign.edit.url(campaign.id)
                                : advertiser.campaign.create.url(),
                        },
                    ]}
                />
                <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] min-[87.5rem]:grid-cols-[240px_minmax(0,1fr)_280px]">
                    <div className="min-w-0 rounded-card border border-border bg-surface p-3.5 shadow-card lg:sticky lg:top-24">
                        <Stepper
                            steps={steps}
                            current={currentStep}
                            label={t('Campaign setup steps')}
                            onStepSelect={(index) => goTo(index)}
                            allowForward
                        />
                    </div>
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit, showFirstError)}
                        className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
                    >
                        <div className="flex items-center gap-3.5 border-b border-border px-6 py-[22px]">
                            <IconTile
                                size={44}
                                variant="solid"
                                tone={stepTones[currentStep]}
                            >
                                {steps[currentStep].icon}
                            </IconTile>
                            <div>
                                <h2
                                    id="campaign-step-title"
                                    ref={stepTitleRef}
                                    tabIndex={-1}
                                    className="text-lg font-extrabold outline-none"
                                >
                                    {steps[currentStep].title}
                                </h2>
                                <p className="text-[13px] text-ink-muted">
                                    {steps[currentStep].heading}
                                </p>
                            </div>
                        </div>
                        <fieldset
                            ref={stepFieldsRef}
                            disabled={isSubmitting}
                            aria-labelledby="campaign-step-title"
                            className="flex min-w-0 flex-col gap-6 p-6"
                        >
                            {Object.keys(serverErrors).length > 0 && (
                                <Alert variant="danger" role="alert">
                                    <AlertTitle>
                                        {t('Check the highlighted fields')}
                                    </AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc pl-4">
                                            {Object.entries(serverErrors).map(
                                                ([field, error]) => (
                                                    <li key={field}>{error}</li>
                                                ),
                                            )}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                            {currentStep === 0 && (
                                <div className="grid gap-[18px] sm:grid-cols-2">
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field }) => (
                                            <FormRow
                                                id="name"
                                                label={t('Campaign name')}
                                                required
                                                error={errorFor('name')}
                                                wide
                                            >
                                                <Input
                                                    id="name"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    aria-required
                                                    aria-invalid={
                                                        !!errorFor('name')
                                                    }
                                                    aria-describedby={
                                                        errorFor('name')
                                                            ? 'name-error'
                                                            : undefined
                                                    }
                                                    placeholder={t(
                                                        'e.g. Winter collection launch',
                                                    )}
                                                    maxLength={200}
                                                />
                                            </FormRow>
                                        )}
                                    />
                                    <FormRow
                                        id="advertiser_id"
                                        label={t('Advertiser')}
                                        required={
                                            !isEditing && canSelectAdvertiser
                                        }
                                        error={
                                            advertiserError ??
                                            serverErrors.advertiser_id
                                        }
                                        hint={
                                            isEditing
                                                ? t(
                                                      'The advertiser cannot be changed after creation.',
                                                  )
                                                : undefined
                                        }
                                    >
                                        {!isEditing && canSelectAdvertiser ? (
                                            <Select
                                                value={advertiserId}
                                                onValueChange={(value) => {
                                                    setAdvertiserId(value);
                                                    setAdvertiserError(
                                                        undefined,
                                                    );
                                                    const selected =
                                                        advertisers.find(
                                                            (item) =>
                                                                String(
                                                                    item.id,
                                                                ) === value,
                                                        );
                                                    if (selected)
                                                        setValue(
                                                            'currency',
                                                            selected.currency,
                                                        );
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="advertiser_id"
                                                    aria-invalid={
                                                        !!advertiserError
                                                    }
                                                    aria-required
                                                >
                                                    <SelectValue
                                                        placeholder={t(
                                                            'Select advertiser',
                                                        )}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {advertisers.map((item) => (
                                                        <SelectItem
                                                            key={item.id}
                                                            value={String(
                                                                item.id,
                                                            )}
                                                        >
                                                            {item.business_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id="advertiser_id"
                                                value={advertiserLabel ?? ''}
                                                readOnly
                                                aria-describedby={
                                                    isEditing
                                                        ? 'advertiser_id-hint'
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </FormRow>
                                    <Controller
                                        name="currency"
                                        control={control}
                                        render={({ field }) => (
                                            <FormRow
                                                id="currency"
                                                label={t('Currency')}
                                                required
                                                error={errorFor('currency')}
                                            >
                                                <Select
                                                    value={field.value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="currency"
                                                        aria-required
                                                        aria-invalid={
                                                            !!errorFor(
                                                                'currency',
                                                            )
                                                        }
                                                    >
                                                        <SelectValue
                                                            placeholder={t(
                                                                'Select currency',
                                                            )}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {currencies.map(
                                                            (currency) => (
                                                                <SelectItem
                                                                    key={
                                                                        currency.currency_code
                                                                    }
                                                                    value={
                                                                        currency.currency_code
                                                                    }
                                                                >
                                                                    {`${currency.currency_code} · ${currency.currency_name}`}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormRow>
                                        )}
                                    />
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <FormRow
                                                id="description"
                                                label={t('Description')}
                                                error={errorFor('description')}
                                                wide
                                            >
                                                <Textarea
                                                    id="description"
                                                    rows={4}
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    placeholder={t(
                                                        'Describe your campaign, what you are promoting, and what makes it a good fit for publishers.',
                                                    )}
                                                />
                                                <span className="self-end text-xs text-ink-muted tabular-nums">
                                                    {t('{{count}} characters', {
                                                        count: (
                                                            field.value ?? ''
                                                        ).length,
                                                    })}
                                                </span>
                                            </FormRow>
                                        )}
                                    />
                                    <Controller
                                        name="start_date"
                                        control={control}
                                        render={({ field }) => (
                                            <CampaignDate
                                                id="start_date"
                                                required
                                                allowPast={isEditing}
                                                label={t('Start date')}
                                                value={field.value}
                                                onChange={field.onChange}
                                                error={errorFor('start_date')}
                                            />
                                        )}
                                    />
                                    <div className="flex flex-col gap-3">
                                        {!values.no_end_date ? (
                                            <Controller
                                                name="end_date"
                                                control={control}
                                                render={({ field }) => (
                                                    <CampaignDate
                                                        id="end_date"
                                                        required
                                                        allowPast={isEditing}
                                                        label={t('End date')}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        min={values.start_date}
                                                        error={errorFor(
                                                            'end_date',
                                                        )}
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[13px] font-bold">
                                                    {t('End date')}
                                                </span>
                                                <p className="flex h-11 items-center gap-2 rounded-control border border-dashed border-border-strong px-3.5 text-sm text-ink-muted">
                                                    <CalendarIcon
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    {t(
                                                        'This campaign has no end date.',
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                                            <Checkbox
                                                id="no_end_date"
                                                checked={
                                                    values.no_end_date ?? false
                                                }
                                                onCheckedChange={(checked) => {
                                                    setValue(
                                                        'no_end_date',
                                                        checked === true,
                                                    );
                                                    if (checked)
                                                        setValue(
                                                            'end_date',
                                                            undefined,
                                                        );
                                                }}
                                            />
                                            {t('Never ending campaign')}
                                        </label>
                                    </div>
                                    <fieldset className="flex flex-col gap-2 sm:col-span-2">
                                        <legend className="mb-2 text-[13px] font-bold">
                                            {t('Campaign status')}
                                        </legend>
                                        <RadioCardGroup
                                            name="campaign_status"
                                            value={campaignStatus}
                                            onValueChange={setCampaignStatus}
                                            className="sm:grid-cols-3"
                                        >
                                            {statusOptions.map((option) => (
                                                <RadioCard
                                                    key={option.value}
                                                    value={option.value}
                                                    title={option.title}
                                                    hint={option.hint}
                                                    tone={option.tone}
                                                />
                                            ))}
                                        </RadioCardGroup>
                                        <FieldError
                                            id="campaign_status-error"
                                            message={
                                                serverErrors.campaign_status
                                            }
                                        />
                                    </fieldset>
                                </div>
                            )}
                            {currentStep === 1 && (
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-[13px] font-bold">
                                            {t('Country targeting')}
                                        </h3>
                                        <p className="text-xs text-ink-muted">
                                            {t(
                                                'Select regions or individual countries, or leave empty for all countries. Country restrictions need trusted country detection in your tracking integration.',
                                            )}
                                        </p>
                                        <Controller
                                            name="geo_targeting"
                                            control={control}
                                            render={({ field }) => (
                                                <CountryTargeting
                                                    countries={countries}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={errorFor(
                                                        'geo_targeting',
                                                    )}
                                                />
                                            )}
                                        />
                                    </div>
                                    <Controller
                                        name="device_targeting"
                                        control={control}
                                        render={({ field }) => (
                                            <fieldset className="flex flex-col gap-2">
                                                <legend className="mb-1 text-[13px] font-bold">
                                                    {t('Device targeting')}
                                                </legend>
                                                <p className="text-xs text-ink-muted">
                                                    {t(
                                                        'Select eligible devices, or leave all unchecked to allow any device.',
                                                    )}
                                                </p>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    {DEVICES.map((device) => {
                                                        const Icon =
                                                            deviceIcons[
                                                                device.value
                                                            ] ?? Monitor;
                                                        const checked =
                                                            field.value?.includes(
                                                                device.value,
                                                            ) ?? false;
                                                        return (
                                                            <label
                                                                key={
                                                                    device.value
                                                                }
                                                                className={cn(
                                                                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] border p-4 text-sm font-bold transition-colors has-[:focus-visible]:shadow-[0_0_0_4px_var(--focus-halo)]',
                                                                    checked
                                                                        ? 'border-2 border-analytics bg-analytics-soft p-[15px]'
                                                                        : 'border-border-strong hover:bg-surface-muted',
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    id={`device_${device.value}`}
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        next,
                                                                    ) =>
                                                                        field.onChange(
                                                                            next
                                                                                ? [
                                                                                      ...(field.value ??
                                                                                          []),
                                                                                      device.value,
                                                                                  ]
                                                                                : (
                                                                                      field.value ??
                                                                                      []
                                                                                  ).filter(
                                                                                      (
                                                                                          value,
                                                                                      ) =>
                                                                                          value !==
                                                                                          device.value,
                                                                                  ),
                                                                        )
                                                                    }
                                                                />
                                                                <Icon
                                                                    className="size-4 text-analytics"
                                                                    aria-hidden="true"
                                                                />
                                                                {t(
                                                                    device.label,
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                <FieldError
                                                    id="device_targeting-error"
                                                    message={errorFor(
                                                        'device_targeting',
                                                    )}
                                                />
                                            </fieldset>
                                        )}
                                    />
                                    <Controller
                                        name="metadata"
                                        control={control}
                                        render={({ field }) => (
                                            <FormRow
                                                id="metadata"
                                                label={t('Campaign tags')}
                                                hint={t(
                                                    'Type a tag and press Enter, or pick a suggestion.',
                                                )}
                                                error={errorFor('metadata')}
                                            >
                                                <TagInput
                                                    id="metadata"
                                                    value={field.value ?? []}
                                                    onChange={field.onChange}
                                                    describedBy="metadata-hint"
                                                    suggestions={CAMPAIGN_METADATA.map(
                                                        (option) => ({
                                                            value: option.value,
                                                            label: t(
                                                                option.label,
                                                            ),
                                                        }),
                                                    )}
                                                />
                                            </FormRow>
                                        )}
                                    />
                                </div>
                            )}
                            {currentStep === 2 && (
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-[18px] sm:grid-cols-2">
                                        {(
                                            [
                                                [
                                                    'total_budget',
                                                    'Total budget',
                                                    'Maximum spend over the entire campaign. Leave blank or enter 0 for no total cap.',
                                                ],
                                                [
                                                    'daily_budget',
                                                    'Daily budget',
                                                    'Maximum spend per day, resetting at midnight UTC. Leave blank or enter 0 for no daily cap.',
                                                ],
                                            ] as const
                                        ).map(([name, label, hint]) => (
                                            <Controller
                                                key={name}
                                                name={name}
                                                control={control}
                                                render={({
                                                    field,
                                                    fieldState,
                                                }) => (
                                                    <FormRow
                                                        id={name}
                                                        label={`${t(label)} (${values.currency})`}
                                                        hint={t(hint)}
                                                        error={fieldError(
                                                            name,
                                                            fieldState,
                                                        )}
                                                    >
                                                        <Input
                                                            id={name}
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={0}
                                                            step="0.01"
                                                            placeholder={t(
                                                                'No limit',
                                                            )}
                                                            value={
                                                                field.value ??
                                                                ''
                                                            }
                                                            onChange={(event) =>
                                                                field.onChange(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            aria-invalid={
                                                                !!fieldError(
                                                                    name,
                                                                    fieldState,
                                                                )
                                                            }
                                                            aria-describedby={`${name}-hint${fieldError(name, fieldState) ? ` ${name}-error` : ''}`}
                                                        />
                                                    </FormRow>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <CampaignFunding
                                        funding={funding ?? selectedAdvertiser}
                                    />
                                    <div className="grid gap-[18px] sm:grid-cols-3">
                                        {(
                                            [
                                                [
                                                    'target_conversions',
                                                    'Target conversions',
                                                    'e.g. 100',
                                                    '1',
                                                ],
                                                [
                                                    'max_publishers',
                                                    'Max publishers',
                                                    'e.g. 20',
                                                    '1',
                                                ],
                                                [
                                                    'target_roi',
                                                    'Target ROI (%)',
                                                    '0.00',
                                                    '0.01',
                                                ],
                                            ] as const
                                        ).map(
                                            ([
                                                name,
                                                label,
                                                placeholder,
                                                step,
                                            ]) => (
                                                <Controller
                                                    key={name}
                                                    name={name}
                                                    control={control}
                                                    render={({
                                                        field,
                                                        fieldState,
                                                    }) => (
                                                        <FormRow
                                                            id={name}
                                                            label={t(label)}
                                                            error={fieldError(
                                                                name,
                                                                fieldState,
                                                            )}
                                                        >
                                                            <Input
                                                                id={name}
                                                                type="number"
                                                                min={0}
                                                                step={step}
                                                                placeholder={t(
                                                                    placeholder,
                                                                )}
                                                                value={
                                                                    field.value ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    field.onChange(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                aria-invalid={
                                                                    !!fieldError(
                                                                        name,
                                                                        fieldState,
                                                                    )
                                                                }
                                                            />
                                                        </FormRow>
                                                    )}
                                                />
                                            ),
                                        )}
                                    </div>
                                    <p className="-mt-3 text-xs text-ink-muted">
                                        {t(
                                            'Targets help describe your goals. They do not guarantee results or replace campaign spending limits.',
                                        )}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Controller
                                            name="terms"
                                            control={control}
                                            render={({ field }) => (
                                                <MultiSelect
                                                    id="terms"
                                                    label={t('Campaign terms')}
                                                    options={(terms ?? [])
                                                        .filter(
                                                            (term) =>
                                                                isEditing ||
                                                                !term.advertiser_id ||
                                                                String(
                                                                    term.advertiser_id,
                                                                ) ===
                                                                    advertiserId,
                                                        )
                                                        .map((term) => ({
                                                            value: term.description,
                                                            label: term.description,
                                                        }))}
                                                    placeholder={t(
                                                        'Select terms...',
                                                    )}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    multiple
                                                    error={errorFor('terms')}
                                                />
                                            )}
                                        />
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                            <a
                                                href="/advertiser/terms"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-bold text-brand-ink underline underline-offset-4"
                                            >
                                                {t('Manage terms in a new tab')}
                                            </a>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    router.reload({
                                                        only: ['terms'],
                                                    })
                                                }
                                            >
                                                <RefreshCw aria-hidden="true" />
                                                {t('Refresh terms')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {currentStep === 3 && (
                                <div className="flex flex-col gap-4">
                                    {reviewSection(0, [
                                        {
                                            label: t('Campaign name'),
                                            value: values.name,
                                        },
                                        {
                                            label: t('Advertiser'),
                                            value: advertiserLabel,
                                        },
                                        {
                                            label: t('Currency'),
                                            value: values.currency,
                                        },
                                        {
                                            label: t('Schedule'),
                                            value: `${
                                                values.start_date
                                                    ? formatDate(
                                                          format(
                                                              values.start_date,
                                                              'yyyy-MM-dd',
                                                          ),
                                                      )
                                                    : '—'
                                            } – ${
                                                values.no_end_date
                                                    ? t('No end date')
                                                    : values.end_date
                                                      ? formatDate(
                                                            format(
                                                                values.end_date,
                                                                'yyyy-MM-dd',
                                                            ),
                                                        )
                                                      : '—'
                                            }`,
                                        },
                                        {
                                            label: t('Status'),
                                            value: (
                                                <StatusBadge
                                                    status={campaignStatusKey(
                                                        campaignStatus,
                                                    )}
                                                />
                                            ),
                                        },
                                    ])}
                                    {reviewSection(1, [
                                        {
                                            label: t('Countries'),
                                            value: countryNames(
                                                values.geo_targeting,
                                            ),
                                        },
                                        {
                                            label: t('Devices'),
                                            value: deviceNames(
                                                values.device_targeting,
                                            ),
                                        },
                                        {
                                            label: t('Tags'),
                                            value: values.metadata?.length
                                                ? values.metadata
                                                      .map(tagLabel)
                                                      .join(', ')
                                                : t('None'),
                                        },
                                    ])}
                                    {reviewSection(2, [
                                        {
                                            label: t('Total budget'),
                                            value: limit(values.total_budget),
                                        },
                                        {
                                            label: t('Daily budget'),
                                            value: limit(values.daily_budget),
                                        },
                                        {
                                            label: t('Campaign terms'),
                                            value: values.terms?.length
                                                ? t('{{count}} selected', {
                                                      count: values.terms
                                                          .length,
                                                  })
                                                : t('None'),
                                        },
                                    ])}
                                    <Alert variant="info" role="note">
                                        <Rocket />
                                        <AlertDescription>
                                            {isEditing
                                                ? t(
                                                      'Changes take effect when you save. You can return to any step to review your updates.',
                                                  )
                                                : t(
                                                      'Ready to create? You can add offers and invite publishers after saving your campaign. No advertiser balance is required to create it.',
                                                  )}
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </fieldset>
                        <div className="sticky bottom-0 mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-border bg-surface-muted px-6 py-4">
                            <Button variant="ghost" asChild>
                                <Link
                                    href={
                                        campaign
                                            ? advertiser.campaign.show.url(
                                                  campaign.id,
                                              )
                                            : advertiser.campaign.index.url()
                                    }
                                >
                                    {t('Cancel')}
                                </Link>
                            </Button>
                            <div className="flex flex-wrap gap-2.5">
                                {currentStep > 0 && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={isSubmitting}
                                        onClick={() =>
                                            setCurrentStep((step) =>
                                                Math.max(step - 1, 0),
                                            )
                                        }
                                    >
                                        <ArrowLeft aria-hidden="true" />
                                        {t('Back')}
                                    </Button>
                                )}
                                {currentStep < lastStep ? (
                                    <Button
                                        key="next"
                                        type="button"
                                        onClick={() => goTo(currentStep + 1)}
                                        disabled={isSubmitting}
                                    >
                                        {t('Continue')}
                                        <ArrowRight aria-hidden="true" />
                                    </Button>
                                ) : (
                                    <Button
                                        key="submit"
                                        type="submit"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2
                                                className="animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : isEditing ? (
                                            <Save aria-hidden="true" />
                                        ) : (
                                            <Rocket aria-hidden="true" />
                                        )}
                                        {isEditing
                                            ? t('Save changes')
                                            : t('Create campaign')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                    <aside
                        aria-label={t('Marketplace preview')}
                        className="flex min-w-0 flex-col gap-3 lg:col-start-2 min-[87.5rem]:col-start-auto"
                    >
                        <span className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                            {t('Live preview · marketplace card')}
                        </span>
                        <CampaignPreviewCard
                            name={values.name}
                            advertiser={advertiserLabel}
                            tags={(values.metadata ?? []).map(tagLabel)}
                            startDate={
                                values.start_date
                                    ? format(values.start_date, 'yyyy-MM-dd')
                                    : null
                            }
                        />
                        <Alert variant="info" role="note">
                            <Info />
                            <AlertDescription>
                                {t(
                                    'Offers and payouts are added after the campaign is saved.',
                                )}
                            </AlertDescription>
                        </Alert>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
};

export default CampaignForm;
