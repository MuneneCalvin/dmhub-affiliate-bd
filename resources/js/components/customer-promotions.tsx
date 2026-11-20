import { Button } from '@/components/ui/button';
import type { OffersWorkspace } from '@/types/campaign-offers';
import { Link } from '@inertiajs/react';
import { ArrowRight, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../css/customer-promotions.css';

export function CustomerPromotions({
    data,
    campaign,
}: {
    data: OffersWorkspace;
    campaign: { id: number; currency: string };
}) {
    const { t, i18n } = useTranslation();
    const editor = `/advertiser/campaigns/${campaign.id}/promotions`;
    const stores = data.stores ?? [];
    const date = (value: string) =>
        new Date(value).toLocaleDateString(i18n.language, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    return (
        <section className="promotion-hub my-6 overflow-hidden rounded-lg border bg-surface">
            <header className="space-y-1 p-5">
                <h3 className="text-lg font-semibold">
                    {t('Customer promotions & stores')}
                </h3>
                <p className="text-sm text-ink-muted">
                    {t(
                        'Manage the discounts customers receive through publisher links.',
                    )}
                </p>
            </header>
            <div className="flex flex-wrap items-center justify-between gap-3 border-y bg-surface-muted/35 px-5 py-3">
                <div className="flex min-w-0 items-start gap-3">
                    <Store
                        className="mt-0.5 size-4 shrink-0 text-ink-muted"
                        aria-hidden
                    />
                    <div className="min-w-0 space-y-1">
                        <h4 className="font-medium">
                            {t('Store connections')}
                        </h4>
                        {stores.length ? (
                            stores.map((s) => (
                                <p
                                    key={s.id}
                                    className="text-sm break-words text-ink-muted"
                                >
                                    {s.name} · {s.domain} · {t(s.status)}
                                </p>
                            ))
                        ) : (
                            <p className="text-sm text-ink-muted">
                                {t('No stores added yet.')}
                            </p>
                        )}
                    </div>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={editor}>{t('Manage stores')}</Link>
                </Button>
            </div>
            <ul className="divide-y">
                {data.offers.map((offer) => {
                    const p = offer.customer_promotion;
                    const published =
                        p?.latest_published_version?.configuration;
                    const config = published ?? p?.draft;
                    const selectedStores = published
                        ? p?.stores
                        : stores.filter((s) =>
                              (
                                  config?.store_ids ??
                                  p?.stores.map((store) => store.id) ??
                                  []
                              ).includes(s.id),
                          );
                    return (
                        <li key={offer.id} className="space-y-3 px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <h4 className="font-semibold break-words">
                                        {offer.name}
                                    </h4>
                                    <span
                                        className="promotion-status"
                                        data-active={p?.status === 'active'}
                                    >
                                        {t(p?.status ?? 'Not configured')}
                                        {published &&
                                            ` · v${p?.published_version}`}
                                    </span>
                                </div>
                                <Link
                                    href={`${editor}?offer=${offer.id}`}
                                    className="promotion-link"
                                    aria-label={`${t(p ? 'Edit promotion' : 'Set up promotion')} · ${offer.name}`}
                                >
                                    {t(
                                        p
                                            ? 'Edit promotion'
                                            : 'Set up promotion',
                                    )}{' '}
                                    <ArrowRight size={15} aria-hidden />
                                </Link>
                            </div>
                            {config ? (
                                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <dt>{t('Customer discount')}</dt>
                                        <dd>
                                            {config.type === 'percentage'
                                                ? `${config.value}%`
                                                : `${config.currency} ${config.value}`}{' '}
                                            · {config.name}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('Eligible catalogue')}</dt>
                                        <dd>
                                            {t(
                                                config.scope === 'all'
                                                    ? 'Entire catalogue'
                                                    : config.scope ===
                                                        'products'
                                                      ? 'Selected products'
                                                      : 'Selected categories / collections',
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('Schedule')}</dt>
                                        <dd>
                                            {date(config.starts_at)}
                                            {config.ends_at
                                                ? ` – ${date(config.ends_at)}`
                                                : ` · ${t('No end date')}`}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>{t('Available in stores')}</dt>
                                        <dd>
                                            {selectedStores
                                                ?.map((s) => s.name)
                                                .join(', ') ||
                                                t('No stores selected')}
                                        </dd>
                                    </div>
                                </dl>
                            ) : (
                                <p className="text-sm text-ink-muted">
                                    {t(
                                        'This offer has no customer discount yet.',
                                    )}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ul>
            {!data.offers.length && (
                <p className="p-5 text-sm text-ink-muted">
                    {t(
                        'Create a campaign offer to set up its customer discount.',
                    )}
                </p>
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
        </section>
    );
}
