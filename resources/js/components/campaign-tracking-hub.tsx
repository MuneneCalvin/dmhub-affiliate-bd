import type {
    TrackingHub,
    TrackingOfferSummary,
} from '@/types/campaign-tracking';
import { Link, usePage, usePoll } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, CircleDashed, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-tracking.css';

const platformNames: Record<string, string> = {
    'custom-website': 'Custom website',
    wordpress: 'WordPress',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
};

function OfferRow({
    offer,
    publisher,
}: {
    offer: TrackingOfferSummary;
    publisher: boolean;
}) {
    const { t } = useTranslation();
    const storeIssue = offer.stores.some(
        (store) => store.status !== 'connected',
    );
    function integrationStatus() {
        if (storeIssue) return 'Check store connection';
        if (offer.promotion_status === 'draft') return 'Promotion draft';
        if (offer.promotion_status === 'paused') return 'Promotion paused';
        if (
            offer.setup_options.length === 1 &&
            offer.setup_options[0] === 'click'
        )
            return 'Link tracking only';
        if (offer.confirmed) return 'Confirmed outcome observed';
        if (offer.stores.length) return 'Store connected';
        if (offer.script_seen) return 'Script or pixel requested';
        if (offer.handoff_platform) return 'Instructions copied';
        if (!offer.publishers) return 'Awaiting a publisher';
        return 'Awaiting integration evidence';
    }
    const tracking = offer.clicked
        ? 'Click observed'
        : offer.links
          ? 'Awaiting a click'
          : 'No tracking link yet';
    const integrationDetail = offer.stores.length
        ? offer.stores.map((store) => store.name).join(', ')
        : offer.handoff_platform
          ? t(platformNames[offer.handoff_platform] ?? offer.handoff_platform)
          : null;
    const linkDetail = offer.publishers
        ? t('Available links · {{ready}}/{{total}}', {
              ready: offer.links,
              total: offer.publishers,
          })
        : null;
    const status = (
        label: string,
        value: string,
        observed: boolean,
        description: string | null,
    ) => (
        <span className="min-w-0">
            <span className="mb-1 block text-xs text-ink-muted md:hidden">
                {t(label)}
            </span>
            <span className="flex items-start gap-2">
                {observed ? (
                    <CheckCircle2
                        aria-hidden
                        size={16}
                        className="mt-0.5 shrink-0 text-brand-ink"
                    />
                ) : (
                    <CircleDashed
                        aria-hidden
                        size={16}
                        className="mt-0.5 shrink-0 text-ink-muted"
                    />
                )}
                <span>
                    {t(value)}
                    {description && (
                        <span className="mt-1 block text-xs text-ink-muted">
                            {description}
                        </span>
                    )}
                </span>
            </span>
        </span>
    );
    return (
        <li>
            <Link
                href={offer.url}
                className="tracking-offer-row group"
                aria-describedby={`tracking-status-${offer.id}`}
                aria-label={t('Open tracking setup for {{offer}}', {
                    offer: offer.name,
                })}
            >
                <span id={`tracking-status-${offer.id}`} className="sr-only">
                    {!publisher && `${t(integrationStatus())} · `}
                    {t(tracking)}
                </span>
                <strong className="min-w-0 font-semibold break-words group-hover:text-brand-ink">
                    {offer.name}
                </strong>
                {!publisher &&
                    status(
                        'Merchant integration',
                        integrationStatus(),
                        !storeIssue &&
                            (offer.confirmed ||
                                offer.script_seen ||
                                offer.stores.length > 0),
                        integrationDetail,
                    )}
                {status('Tracking status', tracking, offer.clicked, linkDetail)}
                <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-ink">
                    {t('Open setup')}
                    <ArrowRight size={16} aria-hidden />
                </span>
            </Link>
        </li>
    );
}

export function CampaignTrackingHub() {
    const {
        props: { trackingHub: data },
    } = usePage<{ trackingHub: TrackingHub }>();
    const { t } = useTranslation();
    usePoll(60000, { only: ['trackingHub'] });
    return (
        <section
            className="campaign-tracking"
            data-publisher={data.publisher_view}
        >
            <header className="tracking-heading">
                <div>
                    <h2>{t('Tracking & integration')}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                        {t(
                            data.publisher_view
                                ? 'Open your offer to copy your tracking link or download its QR code.'
                                : 'Review integration evidence and tracking links across approved publishers. Open an offer to check its setup.',
                        )}
                    </p>
                </div>
            </header>
            {data.offers.length ? (
                <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
                    <div className="tracking-offer-columns" aria-hidden="true">
                        <span>{t('Offer')}</span>
                        {!data.publisher_view && (
                            <span>{t('Merchant integration')}</span>
                        )}
                        <span>{t('Tracking status')}</span>
                    </div>
                    <ul className="divide-y">
                        {data.offers.map((offer) => (
                            <OfferRow
                                key={offer.id}
                                offer={offer}
                                publisher={data.publisher_view}
                            />
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="tracking-empty">
                    <Link2 size={26} aria-hidden />
                    <h3>{t('No tracking guide available yet')}</h3>
                    <p>
                        {t(
                            data.publisher_view
                                ? 'Guides are available for your approved, active offer assignments.'
                                : 'Create an offer to view its tracking and integration guide.',
                        )}
                    </p>
                </div>
            )}
        </section>
    );
}
