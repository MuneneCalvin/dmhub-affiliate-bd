import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    TrackingSetup,
    TrackingWorkspace,
} from '@/types/campaign-tracking';
import { router } from '@inertiajs/react';
import { ChevronDown, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const setupLabels: Record<TrackingSetup, string> = {
    purchase: 'Paid checkout',
    submission: 'Accepted form submission',
    action: 'Qualified action',
    click: 'Referral clicks',
    promotion: 'Customer promotion',
};
const platformNames = {
    'custom-website': 'Custom website',
    wordpress: 'WordPress',
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
} as const;
type Platform = keyof typeof platformNames;
const steps: Record<TrackingSetup, string[]> = {
    purchase: [
        'Validate the landing referral and save it with the order before checkout.',
        'Confirm payment on your server, then send the paid order with its amount and currency.',
    ],
    submission: [
        'Preserve the referral on the form website and save it with the accepted entry.',
        'After validation and spam checks, report the accepted submission from your server.',
    ],
    action: [
        'Save the referral with the business record when the visitor arrives.',
        'Verify the agreed action on your server, then report its stable ID and acceptance time.',
    ],
    click: [
        'Place the publisher tracking link on the approved placement.',
        'Follow the link and check that a click appears for this publisher.',
    ],
    promotion: [
        'Connect the store and publish the customer discount for this offer.',
        'Follow a publisher link, place an eligible order, and check the reported discount and paid order.',
    ],
};
const guideSlugs: Record<TrackingSetup, string> = {
    purchase: 'checkout-campaigns',
    action: 'click-campaigns',
    submission: 'form-campaigns',
    promotion: 'customer-promotions',
    click: 'click-campaigns',
};

export function MerchantTrackingGuide({
    setup,
    data,
}: {
    setup: TrackingSetup;
    data: TrackingWorkspace;
}) {
    const { t } = useTranslation();
    const store = setup === 'promotion';
    const form = setup === 'submission';
    const manual = !store && setup !== 'click';
    const connectedPlatforms = [...new Set(data.stores.map((s) => s.platform))];
    const supported: Platform[] = store
        ? (['shopify', 'woocommerce'] as const).filter(
              (key) =>
                  !connectedPlatforms.length ||
                  connectedPlatforms.includes(key),
          )
        : form
          ? ['custom-website', 'wordpress']
          : ['custom-website'];
    const [choice, setChoice] = useState(data.evidence?.platform);
    const platform = supported.find((key) => key === choice) ?? supported[0];
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const notes = [...steps[setup]];
    if (store)
        notes[0] =
            platform === 'shopify'
                ? 'Connect Shopify, enable the DM Hub customer offers theme embed, and publish the discount.'
                : 'Connect the WooCommerce plugin using the store connection key and API URL, then publish the discount.';
    if (store && data.promotion_status === 'active' && data.stores.length) {
        notes[0] = data.stores.some(
            (s) => s.platform === platform && s.status !== 'connected',
        )
            ? 'Reconnect the store before testing a new referral.'
            : 'Check the published discount on the connected storefront.';
    }
    if (store && data.promotion_status === 'paused') {
        notes[0] =
            'Review the paused promotion and publish it when you want to issue new discounts.';
    }
    if (form && platform === 'wordpress')
        notes[0] =
            'Load the attribution script on the form website and save the referral in the WordPress accepted-entry hook.';
    const guide = `/docs/${form && platform === 'wordpress' ? 'wordpress' : store ? platform : guideSlugs[setup]}`;
    const publisher = data.publishers.find(
        (row) => row.id === data.assignment_id,
    );
    const payload = {
        event_type: setup,
        external_id: form
            ? 'submission:OPAQUE_ENTRY_ID'
            : setup === 'action'
              ? 'action:STABLE_ACTION_ID'
              : 'store:main:order:ORDER_ID',
        referral_id: 'SAVED_REFERRAL_UUID',
        occurred_at: 'ACTUAL_CONFIRMATION_TIME_ISO_8601',
        amount: setup === 'purchase' ? '89.90' : '0.00',
        currency: data.currency,
        ...(form
            ? {
                  successful: true,
                  spam_checks: {
                      honeypot_filled: false,
                      form_duration_ms: 5000,
                      is_spam: false,
                  },
              }
            : {}),
    };
    const technical = manual
        ? [
              form && data.embed_script && data.script_token
                  ? `${data.embed_script}\nconst referral = await window.DMHub.instances['${data.script_token}'].getReferral();`
                  : null,
              `GET ${data.referrals_url}/{referral_id}`,
              t(
                  'Validate the referral against this campaign, offer, and expiry before saving it.',
              ),
              `POST ${data.events_url}\nAuthorization: Bearer ADVERTISER_CREDENTIAL\nContent-Type: application/json\nAccept: application/json\n\n${JSON.stringify(payload, null, 2)}`,
              t(
                  'Keep the advertiser credential on your server. Retry delivery with the original event ID and payload.',
              ),
          ]
              .filter(Boolean)
              .join('\n\n')
        : '';
    async function copyGuide() {
        const text = [
            data.offer.name,
            publisher?.name,
            data.tracking_link,
            t(setupLabels[setup]),
            ...notes.map((note) => t(note)),
            technical,
            new URL(guide, window.location.origin).href,
        ]
            .filter(Boolean)
            .join('\n\n');
        try {
            await navigator.clipboard.writeText(text);
            setFeedback(t('Copied to clipboard'));
            if (data.handoff_url) {
                setSaving(true);
                router.post(
                    data.handoff_url,
                    { platform, offer_id: data.offer.id },
                    {
                        preserveScroll: true,
                        onError: () =>
                            setFeedback(
                                t(
                                    'Instructions copied, but evidence could not be saved. Try copying again.',
                                ),
                            ),
                        onFinish: () => setSaving(false),
                    },
                );
            }
        } catch {
            setFeedback(
                t('Could not copy. Select and copy the text manually.'),
            );
        }
    }
    return (
        <section className="tracking-panel">
            <h3>{t(setupLabels[setup])}</h3>
            <div className="tracking-panel-body space-y-4">
                {store && (
                    <p className="text-sm">
                        {t('Promotion status')} ·{' '}
                        {t(data.promotion_status ?? 'Not configured')}
                    </p>
                )}
                {supported.length > 1 && (
                    <label>
                        {t('Merchant platform')}
                        <Select
                            value={platform}
                            onValueChange={(value) => {
                                setChoice(value);
                                setFeedback('');
                            }}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {supported.map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {t(platformNames[key])}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </label>
                )}
                <ol className="tracking-steps">
                    {notes.map((note, index) => (
                        <li key={note}>
                            <span>{index + 1}</span>
                            <p>{t(note)}</p>
                        </li>
                    ))}
                </ol>
                {technical && (
                    <details className="tracking-technical">
                        <summary>
                            <ChevronDown size={16} aria-hidden />
                            {t('Technical instructions')}
                        </summary>
                        <div>
                            <pre tabIndex={0}>{technical}</pre>
                            <a
                                href="/docs/api-reference"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t('API reference and troubleshooting')} ↗
                            </a>
                        </div>
                    </details>
                )}
                <div className="flex flex-wrap items-center gap-4">
                    {setup !== 'click' && (
                        <Button onClick={copyGuide} disabled={saving}>
                            <Copy size={16} />
                            {t('Copy handoff instructions')}
                        </Button>
                    )}
                    <a
                        className="text-sm text-brand-ink hover:underline"
                        href={guide}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t('Setup guide')} ↗
                    </a>
                </div>
                {feedback && (
                    <p role="status" className="text-sm">
                        {feedback}
                    </p>
                )}
            </div>
        </section>
    );
}
