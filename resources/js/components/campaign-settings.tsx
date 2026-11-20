import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type { SharedData } from '@/types';
import type { CampaignOverview } from '@/types/campaign-overview';
import type { CampaignSettingsWorkspace } from '@/types/campaign-settings';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Info,
    Loader2,
    LockKeyhole,
    Plus,
    Search,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-settings.css';

function Choices({
    id,
    label,
    options,
    values,
    onChange,
    disabled,
    creatable = false,
}: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    values: string[];
    onChange: (values: string[]) => void;
    disabled: boolean;
    creatable?: boolean;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const available = options.filter((option) =>
        option.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
    const add = search.trim();
    return (
        <Popover onOpenChange={() => setSearch('')}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id}
                    className="campaign-settings-select"
                    disabled={disabled}
                >
                    <span className="truncate">{label}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="campaign-settings-options w-[var(--radix-popover-trigger-width)] min-w-64"
            >
                <div className="campaign-settings-search">
                    <Search size={16} aria-hidden="true" />
                    <input
                        aria-label={t('Search options')}
                        placeholder={t('Search…')}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
                <div className="campaign-settings-option-list">
                    {available.map((option) => (
                        <label key={option.value}>
                            <input
                                type="checkbox"
                                checked={values.includes(option.value)}
                                onChange={(event) =>
                                    onChange(
                                        event.target.checked
                                            ? [...values, option.value]
                                            : values.filter(
                                                  (value) =>
                                                      value !== option.value,
                                              ),
                                    )
                                }
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                    {!available.length && <p>{t('No matching options')}</p>}
                    {creatable &&
                        add &&
                        !options.some((option) => option.value === add) && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange([...values, add]);
                                    setSearch('');
                                }}
                            >
                                <Plus size={16} />
                                {t('Add “{{tag}}”', { tag: add })}
                            </button>
                        )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function CampaignSettings({
    campaign,
}: {
    campaign: CampaignOverview['campaign'];
}) {
    const {
        props: { settingsWorkspace: settings },
    } = usePage<
        SharedData & { settingsWorkspace: CampaignSettingsWorkspace }
    >();
    const { t } = useTranslation();
    const form = useForm(settings.values);
    const termsForm = useForm({ description: '' });
    const [termsOpen, setTermsOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const disabled = !settings.can_edit || form.processing;
    const errors = form.errors as Record<string, string>;
    const errorFor = (name: string) =>
        errors[name] ||
        Object.entries(errors).find(([key]) => key.startsWith(`${name}.`))?.[1];
    const inputProps = (name: keyof typeof form.data) => ({
        id: `settings-${name}`,
        'aria-invalid': !!errorFor(name),
        'aria-describedby': errorFor(name)
            ? `settings-${name}-error`
            : undefined,
    });
    const field = (
        name: keyof typeof form.data,
        label: string,
        children: ReactNode,
        required = false,
        className = '',
    ) => (
        <div className={`campaign-settings-field ${className}`}>
            <label htmlFor={`settings-${name}`}>
                {t(label)}
                {required && (
                    <span className="campaign-settings-required"> *</span>
                )}
            </label>
            <div className="campaign-settings-control">
                {children}
                {errorFor(name) && (
                    <p
                        className="campaign-settings-error"
                        id={`settings-${name}-error`}
                        role="alert"
                    >
                        {errorFor(name)}
                    </p>
                )}
            </div>
        </div>
    );
    const numberInput = (
        name:
            | 'total_budget'
            | 'daily_budget'
            | 'max_publishers'
            | 'target_conversions'
            | 'target_roi',
        suffix?: string,
    ) => (
        <div className="campaign-settings-number">
            {suffix === campaign.currency && <span>{campaign.currency}</span>}
            <input
                {...inputProps(name)}
                type="number"
                min="0"
                step={
                    ['max_publishers', 'target_conversions'].includes(name)
                        ? '1'
                        : '0.01'
                }
                required={name === 'max_publishers'}
                value={form.data[name]}
                onChange={(event) => form.setData(name, event.target.value)}
            />
            {suffix === '%' && <span>%</span>}
        </div>
    );
    const removeChip = (
        name: 'countries' | 'tags',
        value: string,
        label: string,
    ) => (
        <span className="campaign-settings-chip" key={value}>
            {label}
            <button
                type="button"
                disabled={disabled}
                aria-label={t('Remove {{label}}', { label })}
                onClick={() =>
                    form.setData(
                        name,
                        form.data[name].filter((item) => item !== value),
                    )
                }
            >
                <X size={13} />
            </button>
        </span>
    );
    useEffect(() => {
        if (!form.isDirty) return;
        const unload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', unload);
        const unsubscribe = router.on('before', (event) => {
            const visit = event.detail.visit;
            if (
                visit.method === 'get' &&
                `${visit.url.pathname}${visit.url.search}` !==
                    `${window.location.pathname}${window.location.search}` &&
                !window.confirm(t('Discard unsaved campaign settings?'))
            )
                event.preventDefault();
        });
        return () => {
            window.removeEventListener('beforeunload', unload);
            unsubscribe();
        };
    }, [form.isDirty, t]);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        setSaveFailed(false);
        form.put(settings.save_url, {
            preserveScroll: true,
            onSuccess: (page) => {
                const next = (
                    page.props.settingsWorkspace as CampaignSettingsWorkspace
                ).values;
                form.setDefaults(next);
                form.setData(next);
                setSaved(true);
            },
            onError: () => {
                setSaveFailed(true);
                requestAnimationFrame(() =>
                    document
                        .querySelector<HTMLElement>(
                            '.campaign-settings [aria-invalid="true"]',
                        )
                        ?.focus(),
                );
            },
        });
    };
    const termsOptions = [
        ...new Set([
            ...settings.terms.map((term) => term.description),
            ...form.data.terms,
        ]),
    ].map((description) => ({ value: description, label: description }));
    const tagOptions = [
        ...new Set([...settings.values.tags, ...form.data.tags]),
    ].map((tag) => ({ value: tag, label: tag }));
    return (
        <div className="campaign-settings">
            <form onSubmit={submit}>
                <div className="campaign-settings-toolbar">
                    <h2>{t('Campaign settings')}</h2>
                    <div className="campaign-settings-actions">
                        <span role="status" aria-live="polite">
                            {form.processing
                                ? t('Saving…')
                                : form.isDirty
                                  ? t('Unsaved changes')
                                  : saved
                                    ? t('Changes saved')
                                    : ''}
                        </span>
                        {settings.can_edit && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={form.processing || !form.isDirty}
                                    onClick={() => {
                                        form.reset();
                                        form.clearErrors();
                                        setSaveFailed(false);
                                        setSaved(false);
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing || !form.isDirty}
                                >
                                    {form.processing && (
                                        <Loader2
                                            size={16}
                                            className="animate-spin"
                                        />
                                    )}
                                    {t('Save changes')}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {!settings.can_edit && (
                    <p className="campaign-settings-notice">
                        <LockKeyhole size={16} />
                        {t(
                            'You can view these settings. Editing requires campaign management permission.',
                        )}
                    </p>
                )}
                {saveFailed && (
                    <p className="campaign-settings-error" role="alert">
                        {t(
                            'Your changes have not been saved. Review the highlighted fields and try again.',
                        )}
                    </p>
                )}
                <fieldset
                    disabled={disabled}
                    className="campaign-settings-grid"
                >
                    <legend className="sr-only">
                        {t('Campaign settings')}
                    </legend>
                    <section
                        className="campaign-settings-card"
                        aria-labelledby="campaign-details-title"
                    >
                        <h3 id="campaign-details-title">
                            {t('Campaign details')}
                        </h3>
                        {field(
                            'name',
                            'Campaign name',
                            <input
                                {...inputProps('name')}
                                required
                                maxLength={200}
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />,
                            true,
                        )}
                        <div className="campaign-settings-field">
                            <label htmlFor="settings-advertiser">
                                {t('Advertiser')}
                            </label>
                            <input
                                id="settings-advertiser"
                                value={campaign.advertiser}
                                readOnly
                                className="campaign-settings-locked"
                            />
                        </div>
                        <div className="campaign-settings-field">
                            <label htmlFor="settings-network">
                                {t('Network')}
                            </label>
                            <input
                                id="settings-network"
                                value={campaign.network ?? ''}
                                readOnly
                                className="campaign-settings-locked"
                            />
                        </div>
                        {field(
                            'description',
                            'Description',
                            <textarea
                                {...inputProps('description')}
                                rows={2}
                                maxLength={20000}
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />,
                        )}
                        <div className="campaign-settings-divider" />
                        <h3>{t('Schedule & limits')}</h3>
                        {field(
                            'campaign_status',
                            'Configured status',
                            <select
                                {...inputProps('campaign_status')}
                                value={form.data.campaign_status}
                                onChange={(event) =>
                                    form.setData(
                                        'campaign_status',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="A">{t('Active')}</option>
                                <option value="I">{t('Inactive')}</option>
                                <option value="P">{t('Paused')}</option>
                            </select>,
                            true,
                            'campaign-settings-short',
                        )}
                        <div className="campaign-settings-dates">
                            {field(
                                'start_date',
                                'Start date',
                                <input
                                    {...inputProps('start_date')}
                                    type="date"
                                    required
                                    max="2099-12-31"
                                    value={form.data.start_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'start_date',
                                            event.target.value,
                                        )
                                    }
                                />,
                                true,
                            )}
                            {field(
                                'end_date',
                                'End date',
                                <input
                                    {...inputProps('end_date')}
                                    type="date"
                                    required={!form.data.no_end_date}
                                    disabled={disabled || form.data.no_end_date}
                                    min={form.data.start_date}
                                    max="2099-12-31"
                                    value={form.data.end_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'end_date',
                                            event.target.value,
                                        )
                                    }
                                />,
                                !form.data.no_end_date,
                            )}
                            <label className="campaign-settings-check">
                                <input
                                    type="checkbox"
                                    checked={form.data.no_end_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'no_end_date',
                                            event.target.checked,
                                        )
                                    }
                                />
                                {t('No end date')}
                            </label>
                        </div>
                        <div className="campaign-settings-field campaign-settings-short">
                            <label htmlFor="settings-currency">
                                {t('Currency')}
                            </label>
                            <div className="campaign-settings-currency">
                                <input
                                    id="settings-currency"
                                    value={campaign.currency}
                                    readOnly
                                    className="campaign-settings-locked"
                                />
                                <LockKeyhole
                                    size={16}
                                    aria-label={t('Currency is locked')}
                                />
                            </div>
                        </div>
                        {field(
                            'total_budget',
                            'Total commission limit',
                            numberInput('total_budget', campaign.currency),
                            false,
                            'campaign-settings-short',
                        )}
                        {field(
                            'daily_budget',
                            'Daily commission limit',
                            <div className="campaign-settings-with-note">
                                {numberInput('daily_budget', campaign.currency)}
                                <small>
                                    {t('Leave blank or enter 0 for no limit.')}
                                </small>
                            </div>,
                        )}
                        {field(
                            'max_publishers',
                            'Maximum publishers',
                            <div className="campaign-settings-with-note">
                                {numberInput('max_publishers')}
                                <small>
                                    {t(
                                        'Currently {{active}} active, {{inactive}} inactive (total {{total}}).',
                                        {
                                            ...settings.publishers,
                                            total:
                                                settings.publishers.active +
                                                settings.publishers.inactive,
                                        },
                                    )}
                                    <br />
                                    {t('Enter 0 for no limit.')}
                                </small>
                            </div>,
                            true,
                        )}
                        {field(
                            'terms',
                            'Campaign terms',
                            <div className="campaign-settings-with-note">
                                <Choices
                                    id="settings-terms"
                                    label={
                                        form.data.terms.length === 1
                                            ? form.data.terms[0]
                                            : form.data.terms.length
                                              ? t('{{count}} terms selected', {
                                                    count: form.data.terms
                                                        .length,
                                                })
                                              : t('No terms selected')
                                    }
                                    options={termsOptions}
                                    values={form.data.terms}
                                    onChange={(values) =>
                                        form.setData('terms', values)
                                    }
                                    disabled={disabled}
                                />
                                <button
                                    type="button"
                                    className="campaign-settings-link"
                                    onClick={() => setTermsOpen(true)}
                                >
                                    {t('Manage terms')}
                                </button>
                            </div>,
                        )}
                    </section>
                    <section
                        className="campaign-settings-card campaign-settings-audience"
                        aria-labelledby="campaign-audience-title"
                    >
                        <h3 id="campaign-audience-title">
                            {t('Audience & targeting')}
                        </h3>
                        {field(
                            'country_filter',
                            'Country filter',
                            <>
                                <select
                                    {...inputProps('country_filter')}
                                    value={form.data.country_filter}
                                    onChange={(event) =>
                                        form.setData(
                                            'country_filter',
                                            event.target.value as
                                                | 'all'
                                                | 'selected',
                                        )
                                    }
                                >
                                    <option value="all">
                                        {t('All countries')}
                                    </option>
                                    <option value="selected">
                                        {t('Selected countries')}
                                    </option>
                                </select>
                                {form.data.country_filter === 'selected' && (
                                    <>
                                        <div className="campaign-settings-chips">
                                            {form.data.countries.map((code) =>
                                                removeChip(
                                                    'countries',
                                                    code,
                                                    settings.countries.find(
                                                        (country) =>
                                                            country.country_iso ===
                                                            code,
                                                    )?.country_name ?? code,
                                                ),
                                            )}
                                        </div>
                                        <Choices
                                            id="settings-countries"
                                            label={t('Select countries')}
                                            options={settings.countries.map(
                                                (country) => ({
                                                    value: country.country_iso,
                                                    label: country.country_name,
                                                }),
                                            )}
                                            values={form.data.countries}
                                            onChange={(values) =>
                                                form.setData(
                                                    'countries',
                                                    values,
                                                )
                                            }
                                            disabled={disabled}
                                        />
                                        {errorFor('countries') && (
                                            <p
                                                className="campaign-settings-error"
                                                role="alert"
                                            >
                                                {errorFor('countries')}
                                            </p>
                                        )}
                                    </>
                                )}
                            </>,
                            true,
                        )}
                        {form.data.country_filter === 'selected' && (
                            <div
                                className="campaign-settings-warning"
                                role="status"
                            >
                                <TriangleAlert size={25} aria-hidden="true" />
                                <div>
                                    <strong>
                                        {t('Country targeting blocks traffic')}
                                    </strong>
                                    <p>
                                        {t(
                                            'Visitor country cannot currently be verified. Select all countries to remove this blocker.',
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="campaign-settings-link"
                                    onClick={() =>
                                        form.setData('country_filter', 'all')
                                    }
                                >
                                    {t('Use all countries')}
                                </button>
                            </div>
                        )}
                        {field(
                            'devices',
                            'Devices',
                            <div
                                className="campaign-settings-devices"
                                id="settings-devices"
                                role="group"
                                aria-label={t('Devices')}
                                aria-invalid={!!errorFor('devices')}
                            >
                                {['desktop', 'mobile', 'tablet'].map(
                                    (device) => (
                                        <label
                                            className="campaign-settings-check"
                                            key={device}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.data.devices.includes(
                                                    device,
                                                )}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'devices',
                                                        event.target.checked
                                                            ? [
                                                                  ...form.data
                                                                      .devices,
                                                                  device,
                                                              ]
                                                            : form.data.devices.filter(
                                                                  (value) =>
                                                                      value !==
                                                                      device,
                                                              ),
                                                    )
                                                }
                                            />
                                            {t(
                                                device[0].toUpperCase() +
                                                    device.slice(1),
                                            )}
                                        </label>
                                    ),
                                )}
                            </div>,
                            true,
                        )}
                        <div className="campaign-settings-divider" />
                        <h3>{t('Goals')}</h3>
                        {field(
                            'target_conversions',
                            'Target conversions',
                            numberInput('target_conversions'),
                        )}
                        {field(
                            'target_roi',
                            'Target ROI',
                            <>
                                {numberInput('target_roi', '%')}
                                <small className="campaign-settings-help">
                                    {t(
                                        'Planning target only; actual ROI is not calculated.',
                                    )}
                                </small>
                            </>,
                        )}
                        {field(
                            'tags',
                            'Tags',
                            <>
                                <div className="campaign-settings-chips">
                                    {form.data.tags.map((tag) =>
                                        removeChip('tags', tag, tag),
                                    )}
                                </div>
                                <Choices
                                    id="settings-tags"
                                    label={t('Select or add tags')}
                                    options={tagOptions}
                                    values={form.data.tags}
                                    onChange={(values) =>
                                        form.setData('tags', values)
                                    }
                                    disabled={disabled}
                                    creatable
                                />
                            </>,
                            false,
                            'campaign-settings-tags',
                        )}
                    </section>
                </fieldset>
                <p className="campaign-settings-notice">
                    <Info size={19} aria-hidden="true" />
                    {t(
                        'Campaign limits cap commission spend. Funds remain shared across the advertiser’s campaigns.',
                    )}
                </p>
            </form>
            <Sheet open={termsOpen} onOpenChange={setTermsOpen}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>{t('Campaign terms')}</SheetTitle>
                        <SheetDescription>
                            {t(
                                'Manage terms for {{advertiser}}. Select terms in campaign settings and save to apply them.',
                                { advertiser: campaign.advertiser },
                            )}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-5 px-4 pb-6">
                        <div className="space-y-3">
                            {settings.terms.length ? (
                                settings.terms.map((term) => (
                                    <div
                                        key={term.id}
                                        className="rounded-md border p-3"
                                    >
                                        <p className="text-xs text-muted-foreground">
                                            {t('Terms #{{id}}', {
                                                id: term.id,
                                            })}
                                        </p>
                                        <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                                            {term.description}
                                        </p>
                                        <Button
                                            className="mt-3"
                                            type="button"
                                            variant="outline"
                                            disabled={form.data.terms.includes(
                                                term.description,
                                            )}
                                            onClick={() => {
                                                form.setData('terms', [
                                                    ...form.data.terms,
                                                    term.description,
                                                ]);
                                                setTermsOpen(false);
                                            }}
                                        >
                                            {form.data.terms.includes(
                                                term.description,
                                            )
                                                ? t('Selected')
                                                : t('Use these terms')}
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {t('No saved terms yet.')}
                                </p>
                            )}
                        </div>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                termsForm.post(settings.terms_url, {
                                    preserveScroll: true,
                                    onSuccess: () => termsForm.reset(),
                                });
                            }}
                            className="space-y-3"
                        >
                            <label
                                htmlFor="new-campaign-terms"
                                className="font-semibold"
                            >
                                {t('Create terms')}
                            </label>
                            <textarea
                                id="new-campaign-terms"
                                required
                                maxLength={20000}
                                rows={6}
                                className="w-full rounded-md border p-3 text-sm"
                                value={termsForm.data.description}
                                onChange={(event) =>
                                    termsForm.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                            {termsForm.errors.description && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {termsForm.errors.description}
                                </p>
                            )}
                            <Button
                                type="submit"
                                disabled={termsForm.processing}
                            >
                                {termsForm.processing && (
                                    <Loader2
                                        className="animate-spin"
                                        size={16}
                                    />
                                )}
                                {t('Create terms')}
                            </Button>
                        </form>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
