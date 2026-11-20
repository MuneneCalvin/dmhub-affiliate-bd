import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { PromotionStore } from '@/types/campaign-offers';
import { router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export function PromotionStores({
    campaign,
    stores,
}: {
    campaign: { id: number; currency: string };
    stores: PromotionStore[];
}) {
    const { t } = useTranslation();
    const storeForm = useForm({
        name: '',
        platform: 'woocommerce',
        domain: '',
    });
    const { flash } = usePage<{
        flash: { store_setup?: { token: string | null; api_url: string } };
    }>().props;
    const { name, domain, platform } = storeForm.data;
    const setupErrors = storeForm.errors;
    const validDomain =
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain) &&
        domain.length <= 253 &&
        (platform !== 'shopify' ||
            /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain));
    const ready = [
        !!name.trim() && name.length <= 120 && !setupErrors.name,
        validDomain && !setupErrors.domain,
        !setupErrors.platform,
    ].filter(Boolean).length;
    function update(key: 'name' | 'platform' | 'domain', value: string) {
        storeForm.clearErrors(key);
        if (key === 'platform') storeForm.clearErrors('domain');
        storeForm.setData(key, value);
    }
    function fieldError(key: 'name' | 'platform' | 'domain') {
        return (
            setupErrors[key] && (
                <p
                    id={`store-error-${key}`}
                    className="mt-1 text-xs text-danger-ink"
                    role="alert"
                >
                    {t(setupErrors[key])}
                </p>
            )
        );
    }
    return (
        <section
            id="store-connections"
            tabIndex={-1}
            className="promotion-panel scroll-mt-6 space-y-4"
        >
            <h2 className="text-lg font-semibold">{t('Connected stores')}</h2>
            <p className="text-sm text-ink-muted">
                {t(
                    'Add your store details below, then complete the connection. The store currency must match the campaign currency: {{currency}}.',
                    { currency: campaign.currency },
                )}
            </p>
            {!stores.length && (
                <p className="rounded-md bg-surface-muted/40 p-3 text-sm text-ink-muted">
                    {t('No stores added yet.')}
                </p>
            )}
            {stores.map((store) => (
                <div
                    key={store.id}
                    className="flex flex-wrap items-center gap-3 border-b pb-3 text-sm"
                >
                    <div className="min-w-0 flex-1 basis-48 break-words">
                        <strong>{store.name}</strong>
                        <p className="text-xs text-ink-muted">
                            {store.platform === 'shopify'
                                ? 'Shopify'
                                : 'WooCommerce'}{' '}
                            · {store.domain}
                        </p>
                    </div>
                    <span
                        className="promotion-status"
                        data-active={store.status === 'connected'}
                    >
                        {t(store.status)}
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <h3 className="font-semibold">{t('Add a store')}</h3>
                <span className="text-xs text-ink-muted" aria-live="polite">
                    {t('{{done}} of {{total}} fields complete', {
                        done: ready,
                        total: 3,
                    })}
                </span>
            </div>
            <p className="text-sm text-ink-muted">
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
                noValidate
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    storeForm.post(
                        `/advertiser/campaigns/${campaign.id}/stores`,
                        {
                            preserveScroll: true,
                            errorBag: 'storeConnection',
                            onError: (errors) =>
                                requestAnimationFrame(() =>
                                    document
                                        .getElementById(
                                            `store-${Object.keys(errors)[0]}`,
                                        )
                                        ?.focus(),
                                ),
                            onSuccess: () => storeForm.reset(),
                        },
                    );
                }}
            >
                <div>
                    <label htmlFor="store-name">{t('Store name')}</label>
                    <Input
                        id="store-name"
                        required
                        maxLength={120}
                        value={name}
                        aria-invalid={!!setupErrors.name}
                        aria-describedby={
                            setupErrors.name ? 'store-error-name' : undefined
                        }
                        onChange={(e) => update('name', e.target.value)}
                    />
                    {fieldError('name')}
                </div>
                <div>
                    <label htmlFor="store-platform">{t('Platform')}</label>
                    <Select
                        value={platform}
                        onValueChange={(value) => update('platform', value)}
                    >
                        <SelectTrigger
                            id="store-platform"
                            className="promotion-select"
                            aria-invalid={!!setupErrors.platform}
                            aria-describedby={
                                setupErrors.platform
                                    ? 'store-error-platform'
                                    : undefined
                            }
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="woocommerce">
                                WooCommerce
                            </SelectItem>
                            <SelectItem value="shopify">Shopify</SelectItem>
                        </SelectContent>
                    </Select>
                    {fieldError('platform')}
                </div>
                <div>
                    <label htmlFor="store-domain">
                        {t('Store domain (without https://)')}
                    </label>
                    <Input
                        id="store-domain"
                        required
                        value={domain}
                        aria-invalid={!!setupErrors.domain}
                        aria-describedby={
                            setupErrors.domain
                                ? 'store-error-domain'
                                : undefined
                        }
                        placeholder={
                            platform === 'shopify'
                                ? 'your-store.myshopify.com'
                                : 'shop.example.com'
                        }
                        onChange={(e) =>
                            update(
                                'domain',
                                e.target.value.toLowerCase().trim(),
                            )
                        }
                    />
                    {fieldError('domain')}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <Button disabled={storeForm.processing}>
                        {t('Add store')}
                    </Button>
                    {platform === 'woocommerce' && (
                        <a
                            className="promotion-link"
                            href="/integrations/woocommerce/download"
                        >
                            {t('Download WooCommerce plugin')}
                        </a>
                    )}
                </div>
            </form>
        </section>
    );
}
