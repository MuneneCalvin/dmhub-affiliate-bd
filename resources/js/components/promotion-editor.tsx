import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    cleanIds,
    localDateInput,
    promotionErrorKey,
    promotionIssues,
    promotionSections,
    sectionIds,
    type Issues,
    type SectionId,
} from '@/lib/promotion-setup';
import type {
    PromotionConfig,
    PromotionStore,
    WorkspaceOffer,
} from '@/types/campaign-offers';
import { useForm } from '@inertiajs/react';
import { CheckCircle2, CircleAlert, CircleDashed } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function PromotionEditor({
    offer,
    currency,
    stores,
}: {
    offer: Pick<WorkspaceOffer, 'id' | 'name' | 'customer_promotion'>;
    currency: string;
    stores: PromotionStore[];
}) {
    const { t } = useTranslation();
    const promotion = offer.customer_promotion;
    const config: PromotionConfig = {
        usage_limit: '',
        background_color: '#ffffff',
        text_color: '#17202a',
        message_nl: '',
        applied_message_nl: '',
        name: offer.name,
        type: 'percentage',
        value: '',
        currency,
        scope: 'all',
        product_ids: [],
        category_ids: [],
        excluded_product_ids: [],
        exclude_sale_items: false,
        minimum_subtotal: '0',
        minimum_quantity: 0,
        combines_with_other_discounts: false,
        starts_at: '',
        ends_at: null,
        validity_hours: '',
        display: 'bar',
        commission_basis: 'net_merchandise',
        message: t(
            '{benefit} from {offer_name} is active. Applied automatically at checkout.',
        ),
        applied_message: t('{saving} saved with {offer_name}.'),
        ...promotion?.draft,
    };
    const form = useForm({
        action: 'save',
        configuration: {
            ...config,
            starts_at: localDateInput(config.starts_at),
            ends_at: localDateInput(config.ends_at),
        },
        store_ids: config.store_ids ?? promotion?.stores.map((s) => s.id) ?? [],
    });
    const [attempt, setAttempt] = useState<'save' | 'publish' | null>(null);
    const summary = useRef<HTMLDivElement>(null);
    const c = form.data.configuration;
    const ids = form.data.store_ids;
    const serverErrors: Issues = Object.fromEntries(
        Object.entries(form.errors).map(([key, msg]) => [
            promotionErrorKey(key),
            msg,
        ]),
    );
    const readiness = {
        ...promotionIssues(c, ids, stores, true),
        ...serverErrors,
    };
    const errors = {
        ...(attempt
            ? promotionIssues(c, ids, stores, attempt === 'publish')
            : {}),
        ...serverErrors,
    };
    const firstIssue = (id: SectionId) =>
        promotionSections[id].fields.map((key) => readiness[key]).find(Boolean);
    const complete = (id: SectionId) => !firstIssue(id);
    const completeCount = sectionIds.filter(complete).length;

    function clearRelatedErrors(...fields: string[]) {
        const keys = (
            Object.keys(form.errors) as (keyof typeof form.errors)[]
        ).filter((key) => fields.includes(promotionErrorKey(key)));
        if (keys.length) form.clearErrors(...keys);
    }
    function set<K extends keyof PromotionConfig>(
        key: K,
        value: PromotionConfig[K],
    ) {
        clearRelatedErrors(
            key,
            'store_ids',
            ...(key === 'starts_at' ? ['ends_at'] : []),
            ...(key === 'type' ? ['value'] : []),
        );
        form.setData('configuration', { ...c, [key]: value });
    }
    function submit(action: 'save' | 'publish' | 'pause') {
        form.clearErrors();
        if (action !== 'pause') {
            setAttempt(action);
            if (
                Object.keys(
                    promotionIssues(c, ids, stores, action === 'publish'),
                ).length
            ) {
                requestAnimationFrame(() => summary.current?.focus());
                return;
            }
        }
        form.transform((data) =>
            action === 'pause'
                ? { action }
                : {
                      action,
                      store_ids: data.store_ids,
                      configuration: {
                          ...data.configuration,
                          product_ids: cleanIds(c.product_ids),
                          category_ids: cleanIds(c.category_ids),
                          excluded_product_ids: cleanIds(
                              c.excluded_product_ids,
                          ),
                          starts_at:
                              c.starts_at === localDateInput(config.starts_at)
                                  ? config.starts_at
                                  : new Date(c.starts_at).toISOString(),
                          ends_at:
                              c.ends_at === localDateInput(config.ends_at)
                                  ? config.ends_at
                                  : c.ends_at
                                    ? new Date(c.ends_at).toISOString()
                                    : null,
                      },
                  },
        );
        form.put(`/advertiser/offers/${offer.id}/promotion`, {
            preserveScroll: true,
            errorBag: 'promotion',
            onSuccess: () => setAttempt(null),
            onError: () =>
                requestAnimationFrame(() => summary.current?.focus()),
        });
    }

    function controlProps(key: string) {
        return {
            id: `promotion-${key}`,
            'aria-invalid': !!errors[key],
            'aria-describedby': readiness[key] ? `hint-${key}` : undefined,
        };
    }
    function hint(key: string) {
        return (
            readiness[key] && (
                <p
                    id={`hint-${key}`}
                    className={`mt-1 text-xs ${errors[key] ? 'text-danger-ink' : 'text-ink-muted'}`}
                >
                    {t(readiness[key])}
                </p>
            )
        );
    }
    function labelled(key: string, label: string, input: ReactNode) {
        return (
            <div className="min-w-0 space-y-1.5">
                <label htmlFor={`promotion-${key}`}>{t(label)}</label>
                {input}
                {hint(key)}
            </div>
        );
    }
    function field(key: keyof PromotionConfig, label: string, type = 'text') {
        return labelled(
            key,
            label,
            <Input
                {...controlProps(key)}
                type={type}
                value={String(c[key] ?? '')}
                onChange={(e) => set(key, e.target.value)}
                step={
                    type === 'number' &&
                    ['value', 'minimum_subtotal'].includes(key)
                        ? '0.01'
                        : undefined
                }
            />,
        );
    }
    function choice(
        key: keyof PromotionConfig,
        label: string,
        options: [string, string][],
    ) {
        return labelled(
            key,
            label,
            <Select
                value={String(c[key])}
                onValueChange={(value) => {
                    if (key === 'scope') {
                        clearRelatedErrors(
                            'scope',
                            'product_ids',
                            'category_ids',
                            'store_ids',
                        );
                        form.setData('configuration', {
                            ...c,
                            scope: value,
                            product_ids:
                                value === 'products' ? c.product_ids : [],
                            category_ids:
                                value === 'categories' ? c.category_ids : [],
                        });
                    } else set(key, value);
                }}
            >
                <SelectTrigger
                    {...controlProps(key)}
                    className="promotion-select"
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(([value, name]) => (
                        <SelectItem key={value} value={value}>
                            {t(name)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>,
        );
    }
    function idList(
        key: 'product_ids' | 'category_ids' | 'excluded_product_ids',
        label: string,
    ) {
        return labelled(
            key,
            label,
            <Input
                {...controlProps(key)}
                value={c[key].join(',')}
                onChange={(e) => set(key, e.target.value.split(','))}
            />,
        );
    }
    function toggle(
        key: 'exclude_sale_items' | 'combines_with_other_discounts',
        label: string,
    ) {
        return (
            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        {...controlProps(key)}
                        checked={c[key]}
                        onChange={(e) => set(key, e.target.checked)}
                    />
                    {t(label)}
                </label>
                {hint(key)}
            </div>
        );
    }
    function section(id: SectionId, children: ReactNode) {
        const done = complete(id);
        return (
            <section
                className="promotion-panel scroll-mt-5"
                id={`setup-${id}`}
                aria-labelledby={`title-${id}`}
            >
                <header className="mb-5 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2
                            id={`title-${id}`}
                            className="text-lg font-semibold"
                        >
                            {t(promotionSections[id].title)}
                        </h2>
                        <span className="promotion-status" data-active={done}>
                            {done ? (
                                <CheckCircle2 size={14} />
                            ) : (
                                <CircleDashed size={14} />
                            )}
                            {t(done ? 'Complete' : 'Needs attention')}
                        </span>
                    </div>
                    <p className="text-sm text-ink-muted">
                        {t(promotionSections[id].description)}
                    </p>
                </header>
                <div className="grid gap-4 sm:grid-cols-2">{children}</div>
            </section>
        );
    }
    const benefit =
        c.type === 'percentage'
            ? `${c.value || '…'}%`
            : `${currency} ${c.value || '…'}`;
    return (
        <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="promotion-panel lg:sticky lg:top-5">
                <h2 className="font-semibold">{t('Publish checklist')}</h2>
                <p aria-live="polite" className="mt-1 text-sm text-ink-muted">
                    {t('{{done}} of {{total}} sections complete', {
                        done: completeCount,
                        total: sectionIds.length,
                    })}
                </p>
                <progress
                    className="my-4 block h-1.5 w-full overflow-hidden rounded accent-primary"
                    max={sectionIds.length}
                    value={completeCount}
                    aria-label={t('Publish checklist')}
                />
                <nav className="grid gap-2" aria-label={t('Publish checklist')}>
                    {sectionIds.map((id) => (
                        <a
                            href={`#setup-${id}`}
                            key={id}
                            className="flex items-baseline gap-2 text-sm hover:underline"
                        >
                            {complete(id) ? (
                                <CheckCircle2
                                    size={16}
                                    className="shrink-0 translate-y-0.5 text-brand-ink"
                                />
                            ) : (
                                <CircleDashed
                                    size={16}
                                    className="shrink-0 translate-y-0.5 text-ink-muted"
                                />
                            )}
                            <span>
                                {t(promotionSections[id].title)}
                                {firstIssue(id) && (
                                    <span className="mt-0.5 block text-xs text-ink-muted">
                                        {t(firstIssue(id)!)}
                                    </span>
                                )}
                            </span>
                            <span className="sr-only">
                                {t(
                                    complete(id)
                                        ? 'Complete'
                                        : 'Needs attention',
                                )}
                            </span>
                        </a>
                    ))}
                </nav>
                <div className="mt-4 border-t pt-3 text-xs text-ink-muted">
                    {t('Promotion status')}{' '}
                    <strong className="ml-1 text-ink">
                        {t(promotion?.status ?? 'Not configured')}
                        {promotion?.published_version
                            ? ` · v${promotion.published_version}`
                            : ''}
                    </strong>
                </div>
            </aside>
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit('save');
                }}
                className="min-w-0"
            >
                {!!Object.keys(errors).length && (
                    <div
                        ref={summary}
                        tabIndex={-1}
                        role="alert"
                        className="mb-4 rounded-lg border border-destructive/50 bg-surface p-4 text-sm"
                    >
                        <h2 className="flex items-center gap-2 font-semibold text-danger-ink">
                            <CircleAlert size={16} />
                            {t(
                                attempt === 'publish'
                                    ? 'Review these items before publishing'
                                    : 'Review these items before saving',
                            )}
                        </h2>
                        <ul className="mt-2 list-disc space-y-1 pl-6">
                            {Object.entries(errors).map(([key, error]) => (
                                <li key={key}>
                                    <a
                                        className="underline"
                                        href={`#promotion-${key}`}
                                    >
                                        {t(error)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <fieldset
                    disabled={form.processing}
                    className="min-w-0 space-y-4"
                >
                    {section(
                        'savings',
                        <>
                            <div className="sm:col-span-2">
                                {field('name', 'Customer-facing offer name')}
                            </div>
                            {choice('type', 'Discount type', [
                                ['percentage', 'Percentage'],
                                ['fixed_amount', 'Fixed amount'],
                            ])}
                            {field('value', 'Discount value', 'number')}
                            <div className="sm:col-span-2">
                                {choice(
                                    'commission_basis',
                                    'Commissionable order amount',
                                    [
                                        [
                                            'net_merchandise',
                                            'Merchandise after discounts, excluding shipping and tax',
                                        ],
                                        [
                                            'net_order',
                                            'Paid order total, including shipping and tax',
                                        ],
                                    ],
                                )}
                            </div>
                        </>,
                    )}
                    {section(
                        'catalogue',
                        <>
                            {choice('scope', 'Eligible catalogue', [
                                ['all', 'Entire catalogue'],
                                ['products', 'Selected products'],
                                [
                                    'categories',
                                    'Selected categories / collections',
                                ],
                            ])}
                            {c.scope === 'products' &&
                                idList(
                                    'product_ids',
                                    'Product IDs (comma separated)',
                                )}
                            {c.scope === 'categories' &&
                                idList(
                                    'category_ids',
                                    'Category / collection IDs (comma separated)',
                                )}
                            {idList(
                                'excluded_product_ids',
                                'Excluded product IDs (WooCommerce)',
                            )}
                            {field(
                                'minimum_subtotal',
                                'Minimum eligible subtotal',
                                'number',
                            )}
                            {field(
                                'minimum_quantity',
                                'Minimum eligible quantity',
                                'number',
                            )}
                            {toggle(
                                'exclude_sale_items',
                                'Exclude sale items (WooCommerce)',
                            )}
                            {toggle(
                                'combines_with_other_discounts',
                                'Allow other discounts',
                            )}
                        </>,
                    )}
                    {section(
                        'timing',
                        <>
                            {field('starts_at', 'Starts at', 'datetime-local')}
                            {field(
                                'ends_at',
                                'Ends at (optional)',
                                'datetime-local',
                            )}
                            {field(
                                'validity_hours',
                                'Validity after referral (hours)',
                                'number',
                            )}
                            {field(
                                'usage_limit',
                                'Uses per referral session (blank for unlimited)',
                                'number',
                            )}
                        </>,
                    )}
                    {section(
                        'message',
                        <>
                            <div className="sm:col-span-2">
                                {choice('display', 'Customer message', [
                                    ['bar', 'Bottom bar'],
                                    ['popup', 'Popup'],
                                    ['none', 'No message'],
                                ])}
                            </div>
                            {field('message', 'Active offer message')}
                            {field(
                                'applied_message',
                                'Applied discount message',
                            )}
                            {field(
                                'message_nl',
                                'Dutch active message (optional)',
                            )}
                            {field(
                                'applied_message_nl',
                                'Dutch applied message (optional)',
                            )}
                            {field(
                                'background_color',
                                'Message background',
                                'color',
                            )}
                            {field(
                                'text_color',
                                'Message text colour',
                                'color',
                            )}
                            <p className="text-xs text-ink-muted sm:col-span-2">
                                {t(
                                    'Messages support {benefit}, {offer_name} and {saving}.',
                                )}
                            </p>
                            {c.display !== 'none' && (
                                <div className="space-y-2 sm:col-span-2">
                                    <h3 className="text-sm font-medium">
                                        {t('Message preview')}
                                    </h3>
                                    <p
                                        className="rounded-md border px-3 py-3 text-sm break-words"
                                        style={{
                                            backgroundColor: c.background_color,
                                            color: c.text_color,
                                        }}
                                    >
                                        {c.message
                                            .replaceAll('{benefit}', benefit)
                                            .replaceAll('{offer_name}', c.name)
                                            .replaceAll('{saving}', '…')}
                                    </p>
                                </div>
                            )}
                        </>,
                    )}
                    {section(
                        'stores',
                        <div
                            id="promotion-store_ids"
                            tabIndex={-1}
                            className="space-y-3 sm:col-span-2"
                        >
                            {stores.map((s) => (
                                <label
                                    key={s.id}
                                    className="flex items-center gap-3 rounded-md border p-3"
                                >
                                    <input
                                        type="checkbox"
                                        checked={ids.includes(s.id)}
                                        aria-describedby={
                                            readiness.store_ids
                                                ? 'hint-store_ids'
                                                : undefined
                                        }
                                        onChange={(e) => {
                                            clearRelatedErrors('store_ids');
                                            form.setData(
                                                'store_ids',
                                                e.target.checked
                                                    ? [...ids, s.id]
                                                    : ids.filter(
                                                          (id) => id !== s.id,
                                                      ),
                                            );
                                        }}
                                    />
                                    <span className="min-w-0 flex-1 break-words">
                                        {s.name}
                                        <span className="block text-xs font-normal text-ink-muted">
                                            {s.domain} · {s.currency}
                                        </span>
                                    </span>
                                    <span
                                        className="promotion-status"
                                        data-active={s.status === 'connected'}
                                    >
                                        {t(s.status)}
                                    </span>
                                </label>
                            ))}
                            {!stores.length && (
                                <p className="text-sm">
                                    {t('No stores added yet.')}
                                </p>
                            )}
                            {hint('store_ids')}
                            <a
                                className="promotion-link"
                                href="#store-connections"
                            >
                                {t('Manage stores')}
                            </a>
                        </div>,
                    )}
                    <div className="promotion-panel space-y-4">
                        <p className="text-sm text-ink-muted">
                            {t(
                                'Save a draft to keep your changes. Publishing applies these settings to new referrals.',
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                onClick={() => submit('publish')}
                            >
                                {t('Publish promotion')}
                            </Button>
                            <Button variant="outline" type="submit">
                                {t('Save draft')}
                            </Button>
                            {promotion?.status === 'active' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => submit('pause')}
                                >
                                    {t('Pause new grants')}
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-ink-muted">
                            {t(
                                'Shopify uses automatically applied discount links with your configured usage limit. Links can be shared. Pausing stops new grants; existing grants expire on their original schedule.',
                            )}
                        </p>
                    </div>
                </fieldset>
            </form>
        </div>
    );
}
