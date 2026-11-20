import { CampaignFunding } from '@/components/campaign-funding';
import { CountryTargeting } from '@/components/country-targeting';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    ReusableCheckbox,
    ReusableNumberInput,
    ReusablePageTitle,
    ReusableSearchMultiSelect,
    ReusableSearchSelect,
    ReusableTextarea,
    ReusableTextInput,
} from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import {
    BreadcrumbItem,
    TCampaign,
    TCountry,
    TCurrency,
    TTerms,
} from '@/types';
import { CampaignFormValues } from '@/types/schema_types';
import { CAMPAIGN_METADATA, DEVICES } from '@/utils/enums';
import { campaignSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarDays,
    CalendarIcon,
    FileText,
    Globe2,
    HelpCircle,
    Loader2,
    Megaphone,
    Monitor,
    RefreshCw,
    Rocket,
    Save,
    Tags,
    Target,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const STEP_FIELDS: Record<number, (keyof CampaignFormValues)[]> = {
    1: ['name', 'description', 'start_date', 'end_date', 'no_end_date'],
    2: [
        'terms',
        'currency',
        'total_budget',
        'daily_budget',
        'max_publishers',
        'target_conversions',
        'target_roi',
    ],
    3: ['geo_targeting', 'device_targeting', 'metadata'],
};

function HelpTip({ label, children }: { label: string; children: ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={() => setOpen(!open)}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <HelpCircle className="size-4" aria-hidden="true" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm leading-relaxed">
                {children}
            </TooltipContent>
        </Tooltip>
    );
}

function FormSection({
    icon: Icon,
    title,
    description,
    help,
    children,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    help?: string;
    children: ReactNode;
}) {
    return (
        <section
            className="space-y-6 rounded-xl border bg-card p-5 sm:p-6"
            aria-label={title}
        >
            <div className="flex items-start gap-3 border-b pb-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{title}</h3>
                        {help && <HelpTip label={title}>{help}</HelpTip>}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            {children}
        </section>
    );
}

function CampaignDate({
    id,
    label,
    value,
    onChange,
    min,
    allowPast = false,
    error,
}: {
    id: string;
    label: string;
    value?: Date;
    onChange: (value: Date | undefined) => void;
    min?: Date;
    allowPast?: boolean;
    error?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label} <span className="text-destructive">*</span>
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        className={cn(
                            'h-10 w-full justify-start font-normal',
                            !value && 'text-muted-foreground',
                        )}
                    >
                        <CalendarIcon className="size-4" aria-hidden="true" />
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
            {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            )}
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
    funding,
    selectedAdvertiserId,
}: CampaignFormProps) => {
    const { t } = useTranslation();
    const serverErrors = usePage().props.errors;
    const isEditing = !!campaign;
    const title = isEditing ? t('Edit Campaign') : t('Create Campaign');
    const noInitialEndDate = Number(campaign?.end_date?.slice(0, 4)) >= 2100;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Campaigns'), href: advertiser.campaign.index.url() },
        ...(campaign
            ? [
                  {
                      title: campaign.name,
                      href: advertiser.campaign.show.url(campaign.id),
                  },
              ]
            : []),
        {
            title,
            href: campaign
                ? advertiser.campaign.edit.url(campaign.id)
                : advertiser.campaign.create.url(),
        },
    ];
    const [advertiserId, setAdvertiserId] = useState(
        String(selectedAdvertiserId ?? advertisers[0]?.id ?? ''),
    );
    const [campaignStatus, setCampaignStatus] = useState(
        campaign?.campaign_status ?? 'A',
    );
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
    const startDate = watch('start_date');
    const noEndDate = watch('no_end_date');
    const steps = [
        {
            title: t('Campaign details'),
            description: t('Name, description & schedule'),
            icon: Megaphone,
        },
        {
            title: t('Budget & terms'),
            description: t('Optional limits & agreements'),
            icon: Wallet,
        },
        {
            title: t('Audience & targeting'),
            description: t('Countries, devices & tags'),
            icon: Target,
        },
    ];
    const handleNext = async () => {
        if (await trigger(STEP_FIELDS[currentStep]))
            setCurrentStep((step) => Math.min(step + 1, 3));
    };
    const onSubmit = (values: CampaignFormValues) => {
        setIsSubmitting(true);
        router.post(
            campaign
                ? advertiser.campaign.update(campaign.id)
                : advertiser.campaign.store(),
            {
                ...values,
                ...(campaign
                    ? { campaign_status: campaignStatus }
                    : canSelectAdvertiser
                      ? { advertiser_id: advertiserId }
                      : {}),
                total_budget: values.total_budget || null,
                daily_budget: values.daily_budget || null,
                start_date: format(values.start_date, 'yyyy-MM-dd'),
                end_date: values.no_end_date
                    ? '2100-12-31'
                    : values.end_date
                      ? format(values.end_date, 'yyyy-MM-dd')
                      : null,
                terms: values.terms?.length
                    ? JSON.stringify({ terms: values.terms })
                    : null,
                geo_targeting: values.geo_targeting?.length
                    ? JSON.stringify({ countries: values.geo_targeting })
                    : null,
                device_targeting: values.device_targeting?.length
                    ? JSON.stringify({ devices: values.device_targeting })
                    : null,
                metadata: values.metadata?.length
                    ? JSON.stringify({ tags: values.metadata })
                    : null,
            },
            {
                onError: (submissionErrors) => {
                    const step = Object.entries(STEP_FIELDS).find(
                        ([, fields]) =>
                            fields.some((field) => field in submissionErrors),
                    );
                    setCurrentStep(step ? Number(step[0]) : 1);
                },
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={title}
                    description={
                        isEditing
                            ? t(
                                  'Update your campaign details, budget and targeting.',
                              )
                            : t(
                                  'Build your campaign in three simple steps. You can fine-tune it later.',
                              )
                    }
                    breadcrumbs={breadcrumbs}
                />
                <form
                    onSubmit={handleSubmit(onSubmit, (validationErrors) => {
                        const step = Object.entries(STEP_FIELDS).find(
                            ([, fields]) =>
                                fields.some(
                                    (field) => field in validationErrors,
                                ),
                        );
                        if (step) setCurrentStep(Number(step[0]));
                    })}
                    className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                >
                    <nav
                        aria-label={t('Campaign setup steps')}
                        className="border-b bg-muted/30 p-3 sm:p-5"
                    >
                        <ol className="grid grid-cols-3 gap-2 sm:gap-3">
                            {steps.map(
                                ({ title, description, icon: Icon }, index) => {
                                    const step = index + 1;
                                    const active = currentStep === step;
                                    const hasError = STEP_FIELDS[step].some(
                                        (field) => !!errors[field],
                                    );
                                    return (
                                        <li key={title}>
                                            <button
                                                id={`campaign-step-${step}`}
                                                type="button"
                                                aria-current={
                                                    active ? 'step' : undefined
                                                }
                                                aria-controls="campaign-step-content"
                                                onClick={() =>
                                                    setCurrentStep(step)
                                                }
                                                disabled={isSubmitting}
                                                className={cn(
                                                    'flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:gap-3 sm:p-4 sm:text-left',
                                                    active
                                                        ? 'border-primary bg-primary/5 shadow-sm'
                                                        : 'border-transparent hover:border-border hover:bg-card',
                                                    hasError &&
                                                        'border-destructive/50',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10',
                                                        active
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'border bg-card text-muted-foreground',
                                                    )}
                                                >
                                                    <Icon
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="min-w-0">
                                                    <span
                                                        className={cn(
                                                            'block text-xs font-semibold sm:text-sm',
                                                            active
                                                                ? 'text-primary'
                                                                : 'text-foreground',
                                                        )}
                                                    >
                                                        <span className="mr-1.5 opacity-60">
                                                            {String(
                                                                step,
                                                            ).padStart(2, '0')}
                                                        </span>
                                                        {title}
                                                    </span>
                                                    <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground lg:block">
                                                        {description}
                                                    </span>
                                                    {hasError && (
                                                        <span className="mt-1 block text-xs text-destructive">
                                                            {t('Check details')}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                },
                            )}
                        </ol>
                    </nav>

                    <fieldset
                        disabled={isSubmitting}
                        className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8 [&_[data-slot=label]]:mb-2"
                    >
                        {Object.keys(serverErrors).length > 0 && (
                            <div
                                role="alert"
                                className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                            >
                                {Object.entries(serverErrors).map(
                                    ([field, error]) => (
                                        <p key={field}>{error}</p>
                                    ),
                                )}
                            </div>
                        )}
                        {!isEditing && canSelectAdvertiser && (
                            <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <Building2
                                        className="mt-1 size-5 shrink-0 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <Label htmlFor="advertiser_id">
                                            {t('Advertiser')}{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {t(
                                                'The business this campaign belongs to.',
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <select
                                    id="advertiser_id"
                                    required
                                    value={advertiserId}
                                    onChange={(event) => {
                                        setAdvertiserId(event.target.value);
                                        const selected = advertisers.find(
                                            (item) =>
                                                String(item.id) ===
                                                event.target.value,
                                        );
                                        if (selected)
                                            setValue(
                                                'currency',
                                                selected.currency,
                                            );
                                    }}
                                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-sm"
                                >
                                    <option value="">
                                        {t('Select Advertiser')}
                                    </option>
                                    {advertisers?.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.business_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div
                            id="campaign-step-content"
                            aria-labelledby={`campaign-step-${currentStep}`}
                            className="space-y-6"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-xl font-semibold">
                                    {steps[currentStep - 1].title}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {t('Fields marked * are required')}
                                </p>
                            </div>
                            {currentStep === 1 && (
                                <>
                                    <FormSection
                                        icon={FileText}
                                        title={t('The essentials')}
                                        description={t(
                                            'Give publishers a clear introduction to your campaign.',
                                        )}
                                    >
                                        <Controller
                                            name="name"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableTextInput
                                                    id="name"
                                                    label={t('Campaign Name')}
                                                    required
                                                    placeholder={t(
                                                        'e.g. Winter collection launch',
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
                                                    rows={4}
                                                    placeholder={t(
                                                        'Describe your campaign, what you are promoting, and what makes it a good fit for publishers.',
                                                    )}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors.description
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />
                                    </FormSection>
                                    {isEditing && (
                                        <FormSection
                                            icon={Activity}
                                            title={t('Campaign status')}
                                            description={t(
                                                'Control whether your campaign is active, inactive or pending.',
                                            )}
                                            help={t(
                                                'Only active campaigns can receive eligible traffic during their scheduled dates. Save your changes to apply a new status.',
                                            )}
                                        >
                                            <div className="max-w-sm">
                                                <ReusableSearchSelect
                                                    id="campaign_status"
                                                    label={t('Status')}
                                                    required
                                                    data={[
                                                        {
                                                            value: 'A',
                                                            label: t('Active'),
                                                        },
                                                        {
                                                            value: 'I',
                                                            label: t(
                                                                'Inactive',
                                                            ),
                                                        },
                                                        {
                                                            value: 'P',
                                                            label: t('Pending'),
                                                        },
                                                    ]}
                                                    value={campaignStatus}
                                                    onChange={setCampaignStatus}
                                                    error={
                                                        serverErrors.campaign_status
                                                    }
                                                />
                                            </div>
                                        </FormSection>
                                    )}
                                    <FormSection
                                        icon={CalendarDays}
                                        title={t('Campaign schedule')}
                                        description={t(
                                            'Choose when your campaign runs.',
                                        )}
                                        help={t(
                                            'Your campaign is eligible for traffic only during its active dates. Choose a start date and an end date, or leave it running with no end date.',
                                        )}
                                    >
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <Controller
                                                name="start_date"
                                                control={control}
                                                render={({ field }) => (
                                                    <CampaignDate
                                                        id="start_date"
                                                        allowPast={isEditing}
                                                        label={t('Start Date')}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors.start_date
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                            <div className="space-y-3">
                                                {!noEndDate ? (
                                                    <Controller
                                                        name="end_date"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <CampaignDate
                                                                id="end_date"
                                                                allowPast={
                                                                    isEditing
                                                                }
                                                                label={t(
                                                                    'End Date',
                                                                )}
                                                                value={
                                                                    field.value
                                                                }
                                                                onChange={
                                                                    field.onChange
                                                                }
                                                                min={startDate}
                                                                error={
                                                                    errors
                                                                        .end_date
                                                                        ?.message
                                                                }
                                                            />
                                                        )}
                                                    />
                                                ) : (
                                                    <div className="flex h-[68px] items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 text-sm text-muted-foreground">
                                                        <CalendarDays
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        {t(
                                                            'This campaign has no end date.',
                                                        )}
                                                    </div>
                                                )}
                                                <ReusableCheckbox
                                                    id="no_end_date"
                                                    label={t(
                                                        'Never ending campaign',
                                                    )}
                                                    checked={noEndDate ?? false}
                                                    onChange={(checked) => {
                                                        setValue(
                                                            'no_end_date',
                                                            checked,
                                                        );
                                                        if (checked)
                                                            setValue(
                                                                'end_date',
                                                                undefined,
                                                            );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </FormSection>
                                </>
                            )}
                            {currentStep === 2 && (
                                <>
                                    <FormSection
                                        icon={Wallet}
                                        title={t('Spending limits')}
                                        description={t(
                                            'Budgets are optional. Leave a field blank or enter 0 for no limit.',
                                        )}
                                        help={t(
                                            'Total budget caps spending across the campaign. Daily budget caps spending per UTC day. These limits do not add money to your advertiser balance.',
                                        )}
                                    >
                                        <div className="grid items-start gap-6 xl:grid-cols-3 [&_[data-slot=label]]:mb-0! [&_[data-slot=label]]:h-6 [&_[data-slot=select-trigger]]:h-10!">
                                            <Controller
                                                name="currency"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableSearchSelect
                                                        id="currency"
                                                        label={t('Currency')}
                                                        required
                                                        data={currencies.map(
                                                            (currency) => ({
                                                                value: currency.currency_code,
                                                                label: `${currency.currency_code} - ${currency.currency_name}`,
                                                            }),
                                                        )}
                                                        placeholder={t(
                                                            'Select Currency',
                                                        )}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors.currency
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                            {(
                                                [
                                                    'total_budget',
                                                    'daily_budget',
                                                ] as const
                                            ).map((name) => (
                                                <Controller
                                                    key={name}
                                                    name={name}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Label
                                                                    htmlFor={
                                                                        name
                                                                    }
                                                                >
                                                                    {name ===
                                                                    'total_budget'
                                                                        ? t(
                                                                              'Total Budget',
                                                                          )
                                                                        : t(
                                                                              'Daily Budget',
                                                                          )}{' '}
                                                                    <span className="text-xs font-normal text-muted-foreground">
                                                                        {t(
                                                                            '(optional)',
                                                                        )}
                                                                    </span>
                                                                </Label>
                                                                <HelpTip
                                                                    label={
                                                                        name ===
                                                                        'total_budget'
                                                                            ? t(
                                                                                  'Total Budget',
                                                                              )
                                                                            : t(
                                                                                  'Daily Budget',
                                                                              )
                                                                    }
                                                                >
                                                                    {name ===
                                                                    'total_budget'
                                                                        ? t(
                                                                              'Maximum spend over the entire campaign. Leave blank or enter 0 for no total cap.',
                                                                          )
                                                                        : t(
                                                                              'Maximum spend per day, resetting at midnight UTC. Leave blank or enter 0 for no daily cap.',
                                                                          )}
                                                                </HelpTip>
                                                            </div>
                                                            <Input
                                                                id={name}
                                                                type="number"
                                                                min={0}
                                                                step="0.01"
                                                                placeholder={t(
                                                                    'No limit',
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
                                                                    !!errors[
                                                                        name
                                                                    ]
                                                                }
                                                                aria-describedby={
                                                                    errors[name]
                                                                        ? `${name}-error`
                                                                        : undefined
                                                                }
                                                            />
                                                            {errors[name] && (
                                                                <p
                                                                    id={`${name}-error`}
                                                                    className="text-sm text-destructive"
                                                                >
                                                                    {
                                                                        errors[
                                                                            name
                                                                        ]
                                                                            ?.message
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <CampaignFunding
                                            funding={
                                                funding ??
                                                advertisers.find(
                                                    (item) =>
                                                        String(item.id) ===
                                                        advertiserId,
                                                )
                                            }
                                        />
                                    </FormSection>
                                    <FormSection
                                        icon={Target}
                                        title={t('Performance goals')}
                                        description={t(
                                            'Optional planning targets for your campaign.',
                                        )}
                                        help={t(
                                            'Targets help describe your goals. They do not guarantee results or replace campaign spending limits.',
                                        )}
                                    >
                                        <div className="grid gap-6 md:grid-cols-3">
                                            <Controller
                                                name="target_conversions"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableNumberInput
                                                        id="target_conversions"
                                                        label={t(
                                                            'Target Conversions',
                                                        )}
                                                        min={0}
                                                        placeholder={t(
                                                            'e.g. 100',
                                                        )}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors
                                                                .target_conversions
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                            <Controller
                                                name="max_publishers"
                                                control={control}
                                                render={({ field }) => (
                                                    <ReusableNumberInput
                                                        id="max_publishers"
                                                        label={t(
                                                            'Max Publishers',
                                                        )}
                                                        min={0}
                                                        placeholder={t(
                                                            'e.g. 20',
                                                        )}
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors
                                                                .max_publishers
                                                                ?.message
                                                        }
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
                                                        min={0}
                                                        step={0.01}
                                                        placeholder="0.00"
                                                        value={field.value}
                                                        onChange={
                                                            field.onChange
                                                        }
                                                        error={
                                                            errors.target_roi
                                                                ?.message
                                                        }
                                                    />
                                                )}
                                            />
                                        </div>
                                    </FormSection>
                                    <FormSection
                                        icon={FileText}
                                        title={t('Campaign terms')}
                                        description={t(
                                            'Choose any agreements that publishers should follow.',
                                        )}
                                        help={t(
                                            'Terms are optional. Create or update them in a separate tab, then refresh the list without losing this draft.',
                                        )}
                                    >
                                        <Controller
                                            name="terms"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableSearchMultiSelect
                                                    id="terms"
                                                    label={t('Terms')}
                                                    data={(terms ?? [])
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
                                                    error={
                                                        errors.terms?.message
                                                    }
                                                />
                                            )}
                                        />
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                            <a
                                                href="/advertiser/terms"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary underline underline-offset-4"
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
                                                <RefreshCw
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {t('Refresh terms')}
                                            </Button>
                                        </div>
                                    </FormSection>
                                </>
                            )}
                            {currentStep === 3 && (
                                <>
                                    <FormSection
                                        icon={Globe2}
                                        title={t('Country targeting')}
                                        description={t(
                                            'Select regions or individual countries, or leave empty for all countries.',
                                        )}
                                        help={t(
                                            'Country restrictions require trusted country detection in your tracking integration. Confirm support with your network before applying restrictions.',
                                        )}
                                    >
                                        <Controller
                                            name="geo_targeting"
                                            control={control}
                                            render={({ field }) => (
                                                <CountryTargeting
                                                    countries={countries}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    error={
                                                        errors.geo_targeting
                                                            ?.message
                                                    }
                                                />
                                            )}
                                        />
                                    </FormSection>
                                    <FormSection
                                        icon={Monitor}
                                        title={t('Device Targeting')}
                                        description={t(
                                            'Select eligible devices, or leave all unchecked to allow any device.',
                                        )}
                                    >
                                        <Controller
                                            name="device_targeting"
                                            control={control}
                                            render={({ field }) => (
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    {DEVICES.map((device) => (
                                                        <div
                                                            key={device.value}
                                                            className={cn(
                                                                'rounded-lg border p-4 transition-colors [&_label]:cursor-pointer',
                                                                field.value?.includes(
                                                                    device.value,
                                                                )
                                                                    ? 'border-primary/50 bg-primary/5'
                                                                    : 'bg-muted/20',
                                                            )}
                                                        >
                                                            <ReusableCheckbox
                                                                id={`device_${device.value}`}
                                                                label={t(
                                                                    device.label,
                                                                )}
                                                                checked={
                                                                    field.value?.includes(
                                                                        device.value,
                                                                    ) ?? false
                                                                }
                                                                onChange={(
                                                                    checked,
                                                                ) =>
                                                                    field.onChange(
                                                                        checked
                                                                            ? [
                                                                                  ...(field.value ??
                                                                                      []),
                                                                                  device.value,
                                                                              ]
                                                                            : field.value?.filter(
                                                                                  (
                                                                                      value,
                                                                                  ) =>
                                                                                      value !==
                                                                                      device.value,
                                                                              ),
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        />
                                        {errors.device_targeting && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    errors.device_targeting
                                                        .message
                                                }
                                            </p>
                                        )}
                                    </FormSection>
                                    <FormSection
                                        icon={Tags}
                                        title={t('Campaign Tags')}
                                        description={t(
                                            'Add optional tags to describe and organize your campaign.',
                                        )}
                                    >
                                        <Controller
                                            name="metadata"
                                            control={control}
                                            render={({ field }) => (
                                                <ReusableSearchMultiSelect
                                                    id="metadata"
                                                    label={t('Tags')}
                                                    data={CAMPAIGN_METADATA}
                                                    placeholder={t(
                                                        'Select tags...',
                                                    )}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    multiple
                                                    error={
                                                        errors.metadata?.message
                                                    }
                                                />
                                            )}
                                        />
                                    </FormSection>
                                    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                        <Rocket
                                            className="mt-0.5 size-5 shrink-0 text-primary"
                                            aria-hidden="true"
                                        />
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {isEditing
                                                ? t(
                                                      'Changes take effect when you save. You can return to any step to review your updates.',
                                                  )
                                                : t(
                                                      'Ready to create? You can add offers and invite publishers after saving your campaign. No advertiser balance is required to create it.',
                                                  )}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </fieldset>
                    <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-4 py-5 sm:px-6 lg:px-8">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={currentStep === 1 || isSubmitting}
                            onClick={() =>
                                setCurrentStep((step) => Math.max(step - 1, 1))
                            }
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            {t('Back')}
                        </Button>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                            {currentStep} / 3
                        </span>
                        {currentStep < 3 ? (
                            <Button
                                key="next"
                                type="button"
                                onClick={handleNext}
                                disabled={isSubmitting}
                            >
                                {t('Continue')}
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Button>
                        ) : (
                            <Button
                                key="submit"
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : isEditing ? (
                                    <Save
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Rocket
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                {isEditing
                                    ? t('Save Changes')
                                    : t('Create Campaign')}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </AppLayout>
    );
};

export default CampaignForm;
