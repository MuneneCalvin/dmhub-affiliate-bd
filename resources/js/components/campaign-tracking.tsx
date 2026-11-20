import { Button } from '@/components/ui/button';
import type { TrackingWorkspace } from '@/types/campaign-tracking';
import { router, usePage, usePoll } from '@inertiajs/react';
import {
    Check,
    CheckCircle2,
    ChevronDown,
    CircleX,
    Clock3,
    Copy,
    Download,
    Info,
    Link2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-tracking.css';

const platforms = [
    ['custom-website', 'Custom website'],
    ['wordpress', 'WordPress'],
    ['shopify', 'Shopify'],
    ['woocommerce', 'WooCommerce'],
] as const;
type Platform = (typeof platforms)[number][0];
const statuses: Record<string, string> = {
    pending: 'Commission awaiting review',
    approved: 'Commission approved',
    locked: 'Commission included in an invoice',
    payable: 'Commission awaiting payment',
    paid: 'Commission paid',
    rejected: 'Commission rejected',
    reversed: 'Commission reversed',
};
const platformNotes: Record<Platform, string[]> = {
    'custom-website': [
        'Validate referral_id from the landing URL with the referral API. Store the latest eligible referral for this campaign and offer in your server session, then save it with the order or business record before checkout.',
        'Confirm success in a verified payment callback or your backend’s accepted-submission/action handler. Persist the event and queue delivery to DM Hub.',
    ],
    wordpress: [
        'Enqueue the public attribution script in your site plugin on landing and form pages. Read the token-scoped SDK referral and preserve it with the accepted entry on your server.',
        'Use your form plugin’s server-side accepted-entry hook after validation and a successful save. Run spam checks on your server. For paid orders, follow the WooCommerce guide.',
        'Keep the advertiser credential in server configuration. Send the saved event with the WordPress HTTP API and queue failed deliveries.',
    ],
    shopify: [
        'Add your Shopify store in Offers → Customer promotions & stores, then select Connect Shopify and approve access. Enable the DM Hub customer offers theme embed and publish your promotion.',
        'Publish a customer promotion for the connected store, then test a publisher link and a paid order. For an integration without customer discounts, use the custom website guide.',
    ],
    woocommerce: [
        'Add your WooCommerce store in Offers → Customer promotions & stores. Install the DM Hub plugin and connect it using the API URL and connection key shown in DM Hub.',
        'Publish a customer promotion for the connected store, then test a publisher link and a paid order. For an integration without customer discounts, use the custom website guide.',
    ],
};

export function CampaignTracking() {
    const {
        props: { trackingWorkspace: data },
        url,
    } = usePage<{ trackingWorkspace: TrackingWorkspace }>();
    usePoll(60000, { only: ['trackingWorkspace'] });
    return (
        <TrackingContent
            key={`${data.offer?.id}-${data.assignment_id}`}
            data={data}
            baseUrl={url.split('?')[0]}
        />
    );
}

function TrackingContent({
    data,
    baseUrl,
}: {
    data: TrackingWorkspace;
    baseUrl: string;
}) {
    const { t, i18n } = useTranslation();
    const [platform, setPlatform] = useState<Platform>('custom-website');
    const [copied, setCopied] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);
    const offer = data.offer;
    const publisher = data.publishers.find((p) => p.id === data.assignment_id);
    const type = data.rates[0]?.type;
    const submission = type === 'CPL';
    const action = type === 'CPA';
    const clickOnly = type === 'CPC';
    const eventType = submission
        ? 'submission'
        : action
          ? 'action'
          : 'purchase';
    const select = (offerId: number, assignmentId?: number) => {
        setChanging(true);
        router.get(
            baseUrl,
            {
                tab: 'tracking',
                offer: offerId,
                ...(assignmentId ? { publisher: assignmentId } : {}),
            },
            {
                preserveScroll: true,
                onFinish: () => setChanging(false),
            },
        );
    };
    const date = (value: string | null | undefined) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
              }).format(
                  new Date(
                      value.includes('T')
                          ? value
                          : `${value.replace(' ', 'T')}Z`,
                  ),
              ) + ' UTC'
            : t('Not observed');
    const duration = (hours: number) =>
        hours % 24 === 0
            ? t('{{count}} days', { count: hours / 24 })
            : t('{{count}} hours', { count: hours });
    const steps = clickOnly
        ? [
              [
                  'Use the publisher tracking link',
                  'Place the generated tracking URL in your link or button. A visit records a click and redirects to the offer.',
              ],
              [
                  'Preserve the referral',
                  'Retain referral_id on the destination for any separately agreed qualifying action.',
              ],
              [
                  'Verify click reporting',
                  'Clicks do not create payable CPC commissions. Do not send click events or disguise visits as qualified actions.',
              ],
          ]
        : [
              [
                  'Preserve the referral',
                  'Keep the DM Hub referral (e.g., cookie or attribution parameter) on the visitor’s session through to checkout.',
              ],
              [
                  submission
                      ? 'Confirm the accepted submission from your backend'
                      : action
                        ? 'Confirm the qualified action from your backend'
                        : 'Confirm the paid order from your backend',
                  submission
                      ? 'Validate and save the submission, then compute honeypot, duration and spam signals on your server. Keep contact details on your website.'
                      : action
                        ? 'Verify the agreed acceptance rule and save the action ID and acceptance timestamp on your server.'
                        : 'When the order is paid, collect the order ID, net amount, and currency from your backend.',
              ],
              [
                  'Send the authenticated outcome',
                  'Call the DM Hub conversion endpoint from your server with the confirmed details and your advertiser credentials (provided by your operator).',
              ],
          ];
    const payload = JSON.stringify(
        {
            event_type: eventType,
            external_id: submission
                ? 'submission:OPAQUE_ENTRY_ID'
                : action
                  ? 'action:STABLE_ACTION_ID'
                  : 'store:main:order:ORDER_ID',
            referral_id: 'SAVED_REFERRAL_UUID',
            occurred_at: 'ACTUAL_CONFIRMATION_TIME_ISO_8601',
            amount: submission || action ? '0.00' : '89.90',
            currency: data.currency,
            ...(submission
                ? {
                      successful: true,
                      spam_checks: {
                          honeypot_filled: false,
                          form_duration_ms: 5000,
                          is_spam: false,
                      },
                  }
                : {}),
        },
        null,
        2,
    );
    const technical = `${t('Campaign offer')}: ${offer?.name ?? ''} (ID ${offer?.id ?? ''})\n${t('Publisher')}: ${publisher?.name ?? t('Not selected')}\n${t('Tracking link')}: ${data.tracking_link ?? t('Not available')}\n\n${data.embed_script ?? ''}\n\nGET ${data.referrals_url}/{referral_id}\n${t('Validate campaign and offer identity and expiry. Keep the latest eligible referral by click time. A public script token alone does not attribute an outcome.')}\n${data.script_token ? `\nconst referral = await window.DMHub.instances['${data.script_token}'].getReferral();\n` : ''}\n${clickOnly ? t('Clicks do not create payable CPC commissions. The events API does not accept click events.') : `POST ${data.events_url}\nAuthorization: Bearer ADVERTISER_CREDENTIAL\nContent-Type: application/json\nAccept: application/json\n\n${payload}`}\n\n${t('Persist the original payload and reuse it unchanged on retries. An identical retry returns the existing result; a changed event with the same external ID returns 409. Retry transient failures with backoff. Never include contact details or arbitrary metadata.')}\n${t('Accepted test outcomes reserve real funds. Refunds and cancellations use financial review/reversal, not negative purchase events.')}\n${t('Secret advertiser credentials are provided by your operator. Never embed them in a browser. Merchant guides are guides not native plugin installers.')}`;
    const instructions = `${platforms.find((p) => p[0] === platform)?.[1]} · ${offer?.name}\n\n${steps.map(([title, body], i) => `${i + 1}. ${t(title)}\n${t(body)}`).join('\n\n')}\n\n${platformNotes[platform].map((n) => t(n)).join('\n\n')}\n\n${technical}\n\n${new URL(data.events_url).origin}/docs/${platform}\n${new URL(data.events_url).origin}/docs/api-reference`;
    const copy = async (value: string, key: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(key);
            setMessage(t('Copied to clipboard'));
            if (key === 'handoff' && data.handoff_url) {
                setSaving(true);
                router.post(
                    data.handoff_url,
                    { platform, offer_id: offer?.id },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onError: () =>
                            setMessage(
                                t(
                                    'Instructions copied, but evidence could not be saved. Try copying again.',
                                ),
                            ),
                        onFinish: () => setSaving(false),
                    },
                );
            }
        } catch {
            setCopied('');
            setMessage(t('Could not copy. Select and copy the text manually.'));
        }
    };
    const evidence = data.evidence;
    const commission = evidence?.commission;
    const evidenceRows = [
        {
            title: evidence?.copied_at
                ? 'Instructions copied'
                : 'Instructions not copied yet',
            description: evidence?.copied_at
                ? 'Merchant handoff instructions were copied.'
                : 'Copy the merchant handoff instructions to record this step.',
            value: date(evidence?.copied_at),
            done: !!evidence?.copied_at,
        },
        {
            title: evidence?.clicked_at ? 'Click observed' : 'Awaiting a click',
            description: evidence?.clicked_at
                ? 'A tracked click from the selected publisher was received.'
                : 'Follow the selected publisher’s tracking link to verify attribution.',
            value: date(evidence?.clicked_at),
            done: !!evidence?.clicked_at,
        },
        {
            title: evidence?.outcome
                ? 'Confirmed outcome observed'
                : 'Awaiting a confirmed outcome',
            description: evidence?.outcome
                ? 'A confirmed conversion outcome was received.'
                : clickOnly
                  ? 'Click visits do not create confirmed outcomes.'
                  : 'Send a confirmed outcome from your merchant backend.',
            value: evidence?.outcome?.reference ?? '—',
            done: !!evidence?.outcome,
        },
        {
            title: commission
                ? (statuses[commission.status] ?? 'Commission recorded')
                : 'Awaiting commission',
            description:
                commission?.status === 'pending'
                    ? 'The outcome is valid and pending review by the operator.'
                    : commission
                      ? 'Financial review and payment are separate from outcome confirmation.'
                      : 'Commission evidence will appear after an accepted outcome.',
            value: commission
                ? `${commission.currency} ${Number(commission.amount).toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—',
            done:
                !!commission &&
                ['approved', 'locked', 'payable', 'paid'].includes(
                    commission.status,
                ),
            rejected:
                !!commission &&
                ['rejected', 'reversed'].includes(commission.status),
        },
    ];
    return (
        <section className="campaign-tracking" aria-busy={changing}>
            <div className="tracking-heading">
                <h2>{t('Tracking & integration')}</h2>
                <div className="tracking-selectors">
                    <label>
                        <span className="sr-only">{t('Offer')}</span>
                        <select
                            aria-label={t('Offer')}
                            disabled={changing || !data.offers.length}
                            value={offer?.id ?? ''}
                            onChange={(e) => select(Number(e.target.value))}
                        >
                            {!data.offers.length && (
                                <option value="">
                                    {t('No accessible offers')}
                                </option>
                            )}
                            {data.offers.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {t('Offer')}: {o.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {!data.publisher_view && (
                        <label>
                            <span className="sr-only">{t('Publisher')}</span>
                            <select
                                aria-label={t('Publisher')}
                                disabled={changing || !data.publishers.length}
                                value={data.assignment_id ?? ''}
                                onChange={(e) =>
                                    offer &&
                                    select(offer.id, Number(e.target.value))
                                }
                            >
                                {!data.publishers.length && (
                                    <option value="">
                                        {t('No approved publishers')}
                                    </option>
                                )}
                                {data.publishers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {t('Publisher')}: {p.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>
            {!offer ? (
                <div className="tracking-empty">
                    <Link2 size={28} />
                    <h3>{t('No tracking guide available yet')}</h3>
                    <p>
                        {t(
                            data.publisher_view
                                ? 'Guides are available for your approved, active offer assignments.'
                                : 'Create an offer to view its tracking and integration guide.',
                        )}
                    </p>
                </div>
            ) : (
                <>
                    <div className="tracking-grid">
                        <div className="tracking-column">
                            <section className="tracking-panel">
                                <h3>{t('Publisher attribution assets')}</h3>
                                <div className="tracking-panel-body">
                                    {data.tracking_link ? (
                                        <div className="tracking-assets-row">
                                            <div className="tracking-link-field">
                                                <label htmlFor="tracking-link">
                                                    {publisher?.name} ·{' '}
                                                    {offer.name}{' '}
                                                    {t('tracking link')}
                                                </label>
                                                <div className="tracking-copy-field">
                                                    <input
                                                        id="tracking-link"
                                                        readOnly
                                                        value={
                                                            data.tracking_link
                                                        }
                                                        onFocus={(e) =>
                                                            e.target.select()
                                                        }
                                                    />
                                                    <button
                                                        aria-label={t(
                                                            'Copy tracking link',
                                                        )}
                                                        onClick={() =>
                                                            copy(
                                                                data.tracking_link!,
                                                                'link',
                                                            )
                                                        }
                                                    >
                                                        {copied === 'link' ? (
                                                            <Check size={19} />
                                                        ) : (
                                                            <Copy size={19} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {data.qr_code && (
                                                <div className="tracking-qr">
                                                    <img
                                                        src={data.qr_code}
                                                        alt={t(
                                                            'QR code for the selected publisher tracking link',
                                                        )}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <a
                                                            href={
                                                                data.qr_download_url ??
                                                                undefined
                                                            }
                                                            download={`tracking-${offer.id}-${data.assignment_id}.png`}
                                                        >
                                                            <Download
                                                                size={16}
                                                            />
                                                            {t('Download QR')}
                                                        </a>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="tracking-muted">
                                            {t(
                                                'Tracking assets will appear when an approved publisher has a configured tracking link.',
                                            )}
                                        </p>
                                    )}
                                    {data.embed_script && (
                                        <div className="tracking-embed">
                                            <label htmlFor="tracking-embed">
                                                {t(
                                                    'Public publisher token · safe for embed',
                                                )}
                                            </label>
                                            <div className="tracking-copy-field">
                                                <textarea
                                                    id="tracking-embed"
                                                    readOnly
                                                    value={data.embed_script}
                                                    rows={3}
                                                    onFocus={(e) =>
                                                        e.target.select()
                                                    }
                                                />
                                                <button
                                                    aria-label={t(
                                                        'Copy embed script',
                                                    )}
                                                    onClick={() =>
                                                        copy(
                                                            data.embed_script!,
                                                            'embed',
                                                        )
                                                    }
                                                >
                                                    {copied === 'embed' ? (
                                                        <Check size={19} />
                                                    ) : (
                                                        <Copy size={19} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                            <section className="tracking-panel">
                                <h3>{t('Merchant handoff')}</h3>
                                <div className="tracking-panel-body">
                                    <div
                                        className="tracking-platforms"
                                        role="tablist"
                                        aria-label={t('Merchant platform')}
                                    >
                                        {platforms.map(
                                            ([key, label], index) => (
                                                <button
                                                    key={key}
                                                    id={`platform-${key}`}
                                                    role="tab"
                                                    aria-selected={
                                                        platform === key
                                                    }
                                                    aria-controls="merchant-guide"
                                                    tabIndex={
                                                        platform === key
                                                            ? 0
                                                            : -1
                                                    }
                                                    onClick={() =>
                                                        setPlatform(key)
                                                    }
                                                    onKeyDown={(e) => {
                                                        const next =
                                                            e.key ===
                                                            'ArrowRight'
                                                                ? (index + 1) %
                                                                  platforms.length
                                                                : e.key ===
                                                                    'ArrowLeft'
                                                                  ? (index +
                                                                        platforms.length -
                                                                        1) %
                                                                    platforms.length
                                                                  : e.key ===
                                                                      'Home'
                                                                    ? 0
                                                                    : e.key ===
                                                                        'End'
                                                                      ? platforms.length -
                                                                        1
                                                                      : null;
                                                        if (next !== null) {
                                                            e.preventDefault();
                                                            setPlatform(
                                                                platforms[
                                                                    next
                                                                ][0],
                                                            );
                                                            document
                                                                .getElementById(
                                                                    `platform-${platforms[next][0]}`,
                                                                )
                                                                ?.focus();
                                                        }
                                                    }}
                                                >
                                                    {t(label)}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                    <div
                                        id="merchant-guide"
                                        role="tabpanel"
                                        aria-labelledby={`platform-${platform}`}
                                    >
                                        <ol className="tracking-steps">
                                            {steps.map(([title, body], i) => (
                                                <li key={title}>
                                                    <span>{i + 1}</span>
                                                    <div>
                                                        <h4>{t(title)}</h4>
                                                        <p>{t(body)}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                        {platform !== 'custom-website' && (
                                            <div className="tracking-platform-notes">
                                                {platformNotes[platform].map(
                                                    (note) => (
                                                        <p key={note}>
                                                            {t(note)}
                                                        </p>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <div className="tracking-handoff-actions">
                                            <Button
                                                disabled={saving}
                                                onClick={() =>
                                                    copy(
                                                        instructions,
                                                        'handoff',
                                                    )
                                                }
                                            >
                                                <Copy size={17} />
                                                {t(
                                                    copied === 'handoff'
                                                        ? 'Instructions copied'
                                                        : 'Copy handoff instructions',
                                                )}
                                            </Button>
                                            <details className="tracking-technical">
                                                <summary>
                                                    <ChevronDown size={17} />
                                                    {t(
                                                        'Technical instructions',
                                                    )}
                                                </summary>
                                                <div>
                                                    {platformNotes[
                                                        platform
                                                    ].map((note) => (
                                                        <p key={note}>
                                                            {t(note)}
                                                        </p>
                                                    ))}
                                                    <pre tabIndex={0}>
                                                        {technical}
                                                    </pre>
                                                    <a
                                                        href={`/docs/${platform}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {t(
                                                            'Full platform guide',
                                                        )}{' '}
                                                        ↗
                                                    </a>
                                                    <a
                                                        href="/docs/api-reference"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {t(
                                                            'API reference and troubleshooting',
                                                        )}{' '}
                                                        ↗
                                                    </a>
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div className="tracking-column">
                            {!data.publisher_view && (
                                <section className="tracking-panel tracking-evidence">
                                    <h3>{t('Verification evidence')}</h3>
                                    {!data.assignment_id && (
                                        <p className="tracking-panel-body tracking-muted">
                                            {t(
                                                'Approve and select a publisher to see verification evidence.',
                                            )}
                                        </p>
                                    )}
                                    <ul>
                                        {evidenceRows.map((row) => (
                                            <li key={row.title}>
                                                {row.rejected ? (
                                                    <CircleX
                                                        className="tracking-rejected"
                                                        size={24}
                                                    />
                                                ) : row.done ? (
                                                    <CheckCircle2
                                                        className="tracking-success"
                                                        size={24}
                                                    />
                                                ) : (
                                                    <Clock3
                                                        className="tracking-pending"
                                                        size={24}
                                                    />
                                                )}
                                                <div>
                                                    <h4>{t(row.title)}</h4>
                                                    <p>{t(row.description)}</p>
                                                </div>
                                                <span>{row.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="tracking-funds">
                                        <Info size={19} />
                                        <strong>
                                            {t(
                                                'Accepted test outcomes reserve real funds.',
                                            )}
                                        </strong>
                                    </div>
                                </section>
                            )}
                            <section className="tracking-panel">
                                <h3>{t('Attribution & agreement')}</h3>
                                <div className="tracking-panel-body">
                                    <dl className="tracking-agreement">
                                        <div>
                                            <dt className="sr-only">
                                                {t('Agreed rate')}
                                            </dt>
                                            <dd>
                                                {data.rates.length
                                                    ? data.rates
                                                          .map((rate) =>
                                                              rate.type &&
                                                              rate.value !==
                                                                  null
                                                                  ? `${rate.type} · ${['CPS', 'RevShare'].includes(rate.type) ? `${Number(rate.value)}%` : `${data.currency} ${Number(rate.value).toLocaleString(i18n.language)}`}`
                                                                  : t(
                                                                        'Not agreed',
                                                                    ),
                                                          )
                                                          .join(' / ')
                                                    : t('Not agreed')}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="sr-only">
                                                {t('Currency')}
                                            </dt>
                                            <dd>{data.currency}</dd>
                                        </div>
                                        <div>
                                            <dt>{t('Cookie lifetime')}</dt>
                                            <dd>
                                                {duration(
                                                    offer.click_cookie_lifetime_hours ??
                                                        168,
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>{t('Conversion window')}</dt>
                                            <dd>
                                                {duration(
                                                    offer.conversion_window_hours ??
                                                        720,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                    <p className="tracking-expiry">
                                        <Info size={17} />
                                        {t(
                                            'Referral lookup uses the earlier expiry.',
                                        )}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className="tracking-footer">
                        <Info size={18} />
                        <p>
                            {t(
                                'Secret advertiser credentials are provided by your operator. Never embed them in a browser. Merchant guides are guides not native plugin installers.',
                            )}
                        </p>
                    </div>
                </>
            )}
            <p className="tracking-feedback" role="status" aria-live="polite">
                {message}
            </p>
        </section>
    );
}
