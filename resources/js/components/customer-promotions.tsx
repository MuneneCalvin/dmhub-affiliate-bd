import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OffersWorkspace, WorkspaceOffer } from '@/types/campaign-offers';
import { router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type PromotionConfig = {
    name: string;
    type: string;
    value: string;
    currency: string;
    scope: string;
    product_ids: string[];
    category_ids: string[];
    excluded_product_ids: string[];
    exclude_sale_items: boolean;
    minimum_subtotal: string;
    minimum_quantity: number;
    combines_with_other_discounts: boolean;
    starts_at: string;
    ends_at: string | null;
    validity_hours: number | string;
    display: string;
    message: string;
    applied_message: string;
    commission_basis: string;
    usage_limit?: number | string | null;
    background_color?: string;
    text_color?: string;
    message_nl?: string;
    applied_message_nl?: string;
    store_ids?: number[];
};
export type PromotionStore = {
    id: number;
    name: string;
    platform: string;
    domain: string;
    status: string;
    currency: string;
};
export type CustomerPromotion = {
    status: string;
    published_version: number | null;
    draft: PromotionConfig;
    stores: PromotionStore[];
};

export function CustomerPromotions({
    data,
    campaign,
}: {
    data: OffersWorkspace;
    campaign: { id: number; currency: string };
}) {
    const { t } = useTranslation();
    const [offerId, setOfferId] = useState(data.offers[0]?.id ?? 0);
    const selected = data.offers.find((o) => o.id === offerId);
    const storeForm = useForm({
        name: '',
        platform: 'woocommerce',
        domain: '',
    });
    const { flash } = usePage<{
        flash: { store_setup?: { token: string | null; api_url: string } };
    }>().props;
    return (
        <details className="my-6 rounded-lg border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
                {t('Customer promotions & stores')}
            </summary>
            <p className="my-3 text-sm text-muted-foreground">
                {t(
                    'Configure customer savings separately from publisher commissions. Customers never need to enter a code.',
                )}
            </p>
            <section className="space-y-3 border-b pb-5">
                <h3 className="font-medium">{t('Connected stores')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'Add your store details below, then complete the connection. The store currency must match the campaign currency: {{currency}}.',
                        { currency: campaign.currency },
                    )}
                </p>
                {data.stores?.map((store) => (
                    <div
                        key={store.id}
                        className="flex flex-wrap items-center gap-3 text-sm"
                    >
                        <span>
                            {store.name} · {store.domain} · {t(store.status)}
                        </span>
                        {store.platform === 'shopify' &&
                            store.status !== 'connected' && (
                                <a
                                    className="underline"
                                    href={`/integrations/shopify/install/${store.id}?campaign=${campaign.id}`}
                                >
                                    {t('Connect Shopify')}
                                </a>
                            )}
                        {store.platform === 'woocommerce' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    router.put(
                                        `/advertiser/campaigns/${campaign.id}/stores/${store.id}`,
                                        { action: 'rotate' },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {t('Rotate connection key')}
                            </Button>
                        )}
                        {store.status !== 'disconnected' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    router.put(
                                        `/advertiser/campaigns/${campaign.id}/stores/${store.id}`,
                                        { action: 'disconnect' },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {t('Disconnect')}
                            </Button>
                        )}
                    </div>
                ))}
                {flash?.store_setup?.token && (
                    <div role="status" className="space-y-2 rounded border p-3">
                        <p>
                            {t(
                                'Copy this connection key into the WooCommerce plugin. It is shown only once.',
                            )}
                        </p>
                        <Input
                            aria-label={t('Connection key')}
                            readOnly
                            value={flash.store_setup.token}
                            onFocus={(e) => e.target.select()}
                        />
                        <Input
                            aria-label={t('Integration API URL')}
                            readOnly
                            value={flash.store_setup.api_url}
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                )}
                <p className="text-sm text-muted-foreground">
                    {t(
                        storeForm.data.platform === 'shopify'
                            ? 'Use your myshopify.com domain. After adding the store, select Connect Shopify and approve access in Shopify.'
                            : 'Use the domain in your WordPress site address. After adding the store, enter the displayed API URL and connection key in WooCommerce → DM Hub.',
                    )}{' '}
                    <a
                        className="underline"
                        href={`/docs/${storeForm.data.platform}`}
                    >
                        {t('Connection guide')}
                    </a>
                </p>
                <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        storeForm.post(
                            `/advertiser/campaigns/${campaign.id}/stores`,
                            {
                                preserveScroll: true,
                                onSuccess: () => storeForm.reset(),
                            },
                        );
                    }}
                >
                    <label>
                        {t('Store name')}
                        <Input
                            required
                            value={storeForm.data.name}
                            onChange={(e) =>
                                storeForm.setData('name', e.target.value)
                            }
                        />
                    </label>
                    <label>
                        {t('Platform')}
                        <select
                            className="block w-full rounded border p-2"
                            value={storeForm.data.platform}
                            onChange={(e) =>
                                storeForm.setData('platform', e.target.value)
                            }
                        >
                            <option value="woocommerce">WooCommerce</option>
                            <option value="shopify">Shopify</option>
                        </select>
                    </label>
                    <label>
                        {t('Store domain (without https://)')}
                        <Input
                            required
                            placeholder={
                                storeForm.data.platform === 'shopify'
                                    ? 'your-store.myshopify.com'
                                    : 'shop.example.com'
                            }
                            value={storeForm.data.domain}
                            onChange={(e) =>
                                storeForm.setData(
                                    'domain',
                                    e.target.value.toLowerCase().trim(),
                                )
                            }
                        />
                    </label>
                    <div className="flex items-end gap-3">
                        <Button disabled={storeForm.processing}>
                            {t('Add store')}
                        </Button>
                        <a
                            className="text-sm underline"
                            href="/integrations/woocommerce/download"
                        >
                            {t('Download WooCommerce plugin')}
                        </a>
                    </div>
                    {Object.entries(storeForm.errors).map(([key, error]) => (
                        <p key={key} role="alert" className="text-destructive">
                            {error}
                        </p>
                    ))}
                </form>
            </section>
            <label className="my-4 block">
                {t('Offer')}
                <select
                    className="block w-full rounded border p-2"
                    value={offerId}
                    onChange={(e) => setOfferId(Number(e.target.value))}
                >
                    {data.offers.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.name}
                        </option>
                    ))}
                </select>
            </label>
            {selected && (
                <PromotionEditor
                    key={`${selected.id}:${selected.customer_promotion?.published_version}:${selected.customer_promotion?.status}`}
                    offer={selected}
                    currency={campaign.currency}
                    stores={data.stores ?? []}
                />
            )}
            {!!data.store_webhooks?.length && (
                <section className="mt-6 space-y-2">
                    <h3 className="font-medium">
                        {t('Store deliveries awaiting processing')}
                    </h3>
                    {data.store_webhooks.map((d) => (
                        <p key={d.id} className="text-sm">
                            #{d.id} · {d.topic} · {t(d.status)}
                        </p>
                    ))}
                </section>
            )}
            {!!data.promotion_orders?.length && (
                <section className="mt-6 space-y-2">
                    <h3 className="font-medium">
                        {t('Recent promotion orders')}
                    </h3>
                    {data.promotion_orders.map((o) => (
                        <p key={o.id} className="text-sm">
                            {o.external_id} · {t(o.status)}{' '}
                            {o.review_reason && `— ${t(o.review_reason)}`}
                        </p>
                    ))}
                </section>
            )}
            {!!data.promotion_adjustments?.length && (
                <section className="mt-6 space-y-2">
                    <h3 className="font-medium">
                        {t(
                            'Refunds and cancellations awaiting financial review',
                        )}
                    </h3>
                    {data.promotion_adjustments.map((a) => (
                        <p key={a.id} className="text-sm">
                            {a.order_external_id} · {t(a.payload.type)} ·{' '}
                            {a.payload.currency} {a.payload.amount} ·{' '}
                            {t(a.status)}
                        </p>
                    ))}
                </section>
            )}
        </details>
    );
}

function PromotionEditor({
    offer,
    currency,
    stores,
}: {
    offer: WorkspaceOffer;
    currency: string;
    stores: PromotionStore[];
}) {
    const { t } = useTranslation();
    const promotion = offer.customer_promotion;
    const config: PromotionConfig = promotion?.draft ?? {
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
    };
    const form = useForm({
        action: 'save',
        configuration: config,
        store_ids: config.store_ids ?? promotion?.stores.map((s) => s.id) ?? [],
    });
    const c = form.data.configuration;
    const set = <K extends keyof PromotionConfig>(
        key: K,
        value: PromotionConfig[K],
    ) => form.setData('configuration', { ...c, [key]: value });
    const field = (
        key: keyof PromotionConfig,
        label: string,
        type = 'text',
    ) => (
        <label className="block space-y-1">
            {t(label)}
            <Input
                type={type}
                step={
                    type === 'number'
                        ? ['value', 'minimum_subtotal'].includes(key)
                            ? '0.01'
                            : '1'
                        : undefined
                }
                min={type === 'number' ? '0' : undefined}
                value={
                    type === 'datetime-local' &&
                    c[key] &&
                    !Number.isNaN(Date.parse(String(c[key])))
                        ? new Date(
                              new Date(String(c[key])).getTime() -
                                  new Date(String(c[key])).getTimezoneOffset() *
                                      60000,
                          )
                              .toISOString()
                              .slice(0, 16)
                        : String(c[key] ?? '')
                }
                onChange={(e) => set(key, e.target.value)}
            />
        </label>
    );
    const select = (
        key: keyof PromotionConfig,
        label: string,
        options: [string, string][],
    ) => (
        <label className="block space-y-1">
            {t(label)}
            <select
                className="block w-full rounded border p-2"
                value={String(c[key])}
                onChange={(e) => set(key, e.target.value)}
            >
                {options.map(([value, name]) => (
                    <option key={value} value={value}>
                        {t(name)}
                    </option>
                ))}
            </select>
        </label>
    );
    const ids = (
        key: 'product_ids' | 'category_ids' | 'excluded_product_ids',
        label: string,
    ) => (
        <label>
            {t(label)}
            <Input
                value={c[key].join(', ')}
                onChange={(e) =>
                    set(
                        key,
                        e.target.value
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean),
                    )
                }
            />
        </label>
    );
    const submit = (action: string) => {
        if (
            !c.starts_at ||
            Number.isNaN(Date.parse(c.starts_at)) ||
            (c.ends_at && Number.isNaN(Date.parse(c.ends_at)))
        ) {
            form.setError(
                'configuration',
                t('Enter valid start and end dates with a timezone.'),
            );
            return;
        }
        form.transform((data) => ({
            ...data,
            action,
            configuration: {
                ...data.configuration,
                starts_at: data.configuration.starts_at
                    ? new Date(data.configuration.starts_at).toISOString()
                    : '',
                ends_at: data.configuration.ends_at
                    ? new Date(data.configuration.ends_at).toISOString()
                    : null,
            },
        }));
        form.put(`/advertiser/offers/${offer.id}/promotion`, {
            preserveScroll: true,
        });
    };
    const benefit =
        c.type === 'percentage'
            ? `${c.value || '…'}%`
            : `${currency} ${c.value || '…'}`;
    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                submit('save');
            }}
        >
            <p className="text-sm">
                {t('Promotion status')}:{' '}
                {t(promotion?.status ?? 'not configured')}{' '}
                {promotion?.published_version
                    ? `· v${promotion.published_version}`
                    : ''}
            </p>
            <fieldset
                disabled={form.processing}
                className="grid gap-4 sm:grid-cols-2"
            >
                {field('name', 'Customer-facing offer name')}
                {select('type', 'Discount type', [
                    ['percentage', 'Percentage'],
                    ['fixed_amount', 'Fixed amount'],
                ])}
                {field('value', 'Discount value', 'number')}
                {select('scope', 'Eligible catalogue', [
                    ['all', 'Entire catalogue'],
                    ['products', 'Selected products'],
                    ['categories', 'Selected categories / collections'],
                ])}
                {c.scope === 'products' &&
                    ids('product_ids', 'Product IDs (comma separated)')}
                {c.scope === 'categories' &&
                    ids(
                        'category_ids',
                        'Category / collection IDs (comma separated)',
                    )}
                {ids(
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
                {field('starts_at', 'Starts at', 'datetime-local')}
                {field('ends_at', 'Ends at (optional)', 'datetime-local')}
                {field(
                    'usage_limit',
                    'Uses per referral session (blank for unlimited)',
                    'number',
                )}
                {field('background_color', 'Message background', 'color')}
                {field('text_color', 'Message text colour', 'color')}
                {field(
                    'validity_hours',
                    'Validity after referral (hours)',
                    'number',
                )}
                {select('display', 'Customer message', [
                    ['bar', 'Bottom bar'],
                    ['popup', 'Popup'],
                    ['none', 'No message'],
                ])}
                {select('commission_basis', 'Commissionable order amount', [
                    [
                        'net_merchandise',
                        'Merchandise after discounts, excluding shipping and tax',
                    ],
                    [
                        'net_order',
                        'Paid order total, including shipping and tax',
                    ],
                ])}
                {(
                    [
                        'exclude_sale_items',
                        'combines_with_other_discounts',
                    ] as const
                ).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={c[key]}
                            onChange={(e) => set(key, e.target.checked)}
                        />
                        {t(
                            key === 'exclude_sale_items'
                                ? 'Exclude sale items (WooCommerce)'
                                : 'Allow other discounts',
                        )}
                    </label>
                ))}
                {field('message', 'Active offer message')}
                {field('applied_message', 'Applied discount message')}
                {field('message_nl', 'Dutch active message (optional)')}
                {field(
                    'applied_message_nl',
                    'Dutch applied message (optional)',
                )}
            </fieldset>
            <p className="text-sm text-muted-foreground">
                {t(
                    'Messages support {benefit}, {offer_name} and {saving}. Dates use your local timezone.',
                )}
            </p>
            <fieldset className="flex flex-wrap gap-4">
                <legend className="mb-2 font-medium">
                    {t('Available in stores')}
                </legend>
                {stores.map((s) => (
                    <label key={s.id} className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.store_ids.includes(s.id)}
                            onChange={(e) =>
                                form.setData(
                                    'store_ids',
                                    e.target.checked
                                        ? [...form.data.store_ids, s.id]
                                        : form.data.store_ids.filter(
                                              (id) => id !== s.id,
                                          ),
                                )
                            }
                        />
                        {s.name} · {t(s.status)}
                    </label>
                ))}
            </fieldset>
            <div
                className="rounded border p-3"
                aria-label={t('Message preview')}
            >
                {c.message
                    .replaceAll('{benefit}', benefit)
                    .replaceAll('{offer_name}', c.name)
                    .replaceAll('{saving}', '…')}
            </div>
            <p className="text-sm text-muted-foreground">
                {t(
                    'Shopify uses automatically applied discount links with your configured usage limit. Links can be shared. Pausing stops new grants; existing grants expire on their original schedule.',
                )}
            </p>
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            ))}
            <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={form.processing}>
                    {t('Save draft')}
                </Button>
                <Button
                    type="button"
                    disabled={form.processing}
                    onClick={() => submit('publish')}
                >
                    {t('Publish promotion')}
                </Button>
                {promotion?.status === 'active' && (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={() =>
                            router.put(
                                `/advertiser/offers/${offer.id}/promotion`,
                                { action: 'pause' },
                                { preserveScroll: true },
                            )
                        }
                    >
                        {t('Pause new grants')}
                    </Button>
                )}
            </div>
        </form>
    );
}
