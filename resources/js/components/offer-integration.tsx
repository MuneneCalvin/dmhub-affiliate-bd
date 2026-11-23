import {
    LeadFormSnippet,
    type LeadFormSettings,
} from '@/components/lead-form-snippet';
import type { TOffers } from '@/types';
import { useTranslation } from 'react-i18next';

export function OfferIntegration({
    offer,
    leadForm,
}: {
    offer: TOffers;
    leadForm?: LeadFormSettings;
}) {
    const { t } = useTranslation();
    return (
        <section className="space-y-6">
            <div className="rounded-xl border bg-surface p-5 sm:p-6">
                <h2 className="text-lg font-semibold">
                    {t('Offer integration')}
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                    {t(
                        'Use this offer’s landing page for publisher traffic. Track successful submissions from your own website without sending contact details.',
                    )}
                </p>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-ink-muted">{t('Campaign ID')}</dt>
                        <dd>{offer.campaign_id}</dd>
                    </div>
                    <div>
                        <dt className="text-ink-muted">{t('Offer ID')}</dt>
                        <dd>{offer.id}</dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                        <dt className="text-ink-muted">
                            {t('Landing page URL')}
                        </dt>
                        <dd className="break-all">
                            {offer.preview_url || t('Not configured')}
                        </dd>
                    </div>
                </dl>
            </div>
            {leadForm && (
                <LeadFormSnippet offerId={offer.id} leadForm={leadForm} />
            )}
            <div className="space-y-3 rounded-xl border bg-surface-muted/30 p-5">
                <h2 className="font-semibold">
                    {t('Connect an existing form or checkout')}
                </h2>
                <p className="text-sm text-ink-muted">
                    {t(
                        'Keep your forms and customer data on your website. Your backend reports successful submissions with spam-check results; accepted events automatically create conversions and pending commission.',
                    )}
                </p>
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                    <a
                        className="text-brand-ink underline"
                        href="/docs/form-campaigns"
                    >
                        {t('Connect an accepted form')}
                    </a>
                    <a
                        className="text-brand-ink underline"
                        href="/docs/checkout-campaigns"
                    >
                        {t('Connect a paid order')}
                    </a>
                    <a
                        className="text-brand-ink underline"
                        href="/docs/api-reference"
                    >
                        {t('Credential setup and troubleshooting')}
                    </a>
                </div>
            </div>
        </section>
    );
}
