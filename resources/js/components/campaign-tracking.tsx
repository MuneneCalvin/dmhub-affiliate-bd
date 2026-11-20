import { CopyField } from '@/components/app';
import {
    MerchantTrackingGuide,
    setupLabels,
} from '@/components/merchant-tracking-guide';
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
import { router, usePage, usePoll } from '@inertiajs/react';
import { CheckCircle2, CircleX, Clock3, Download, Info } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-tracking.css';

const statuses: Record<string, string> = {
    pending: 'Commission awaiting review',
    approved: 'Commission approved',
    locked: 'Commission included in an invoice',
    payable: 'Commission awaiting payment',
    paid: 'Commission paid',
    rejected: 'Commission rejected',
    reversed: 'Commission reversed',
};
export function OfferTracking() {
    const {
        props: { trackingWorkspace: data },
    } = usePage<{ trackingWorkspace: TrackingWorkspace }>();
    usePoll(60000, { only: ['trackingWorkspace'] });
    return (
        <TrackingContent
            key={`${data.offer?.id}-${data.assignment_id}`}
            data={data}
        />
    );
}

function TrackingContent({ data }: { data: TrackingWorkspace }) {
    const { t, i18n } = useTranslation();
    const [selectedSetup, setSelectedSetup] = useState<TrackingSetup>();
    const setup =
        selectedSetup && data.setup_options.includes(selectedSetup)
            ? selectedSetup
            : data.setup_options[0];
    const merchantHandoff = !!setup && setup !== 'click';
    const clickOnly =
        setup === 'click' ||
        (data.publisher_view &&
            data.rates.length > 0 &&
            data.rates.every((rate) => rate.type === 'CPC'));
    const [changing, setChanging] = useState(false);
    const offer = data.offer;
    const publisher = data.publishers.find((p) => p.id === data.assignment_id);
    const selectPublisher = (publisher: number) => {
        setChanging(true);
        router.get(
            data.detail_url,
            { publisher },
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
    const evidence = data.evidence;
    const commission = evidence?.commission;
    const evidenceRows = [
        ...(merchantHandoff
            ? [
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
              ]
            : []),
        ...(setup === 'submission' && data.script_token
            ? [
                  {
                      title: data.script_seen
                          ? 'Script or pixel requested'
                          : 'No script or pixel request yet',
                      description:
                          'Requests are recorded when the attribution script or impression pixel is fetched.',
                      value: '',
                      done: data.script_seen,
                  },
              ]
            : []),
        {
            title: evidence?.clicked_at ? 'Click observed' : 'Awaiting a click',
            description: evidence?.clicked_at
                ? 'A tracked click from the selected publisher was received.'
                : 'Follow the selected publisher’s tracking link to verify attribution.',
            value: date(evidence?.clicked_at),
            done: !!evidence?.clicked_at,
        },
        ...(merchantHandoff
            ? [
                  {
                      title: evidence?.outcome
                          ? 'Confirmed outcome observed'
                          : 'Awaiting a confirmed outcome',
                      description: evidence?.outcome
                          ? 'A confirmed conversion outcome was received.'
                          : setup === 'promotion'
                            ? 'Check for a paid order reported by the connected store.'
                            : 'Send a confirmed outcome from your merchant backend.',
                      value: evidence?.outcome?.reference ?? '—',
                      done: !!evidence?.outcome,
                  },
                  {
                      title: commission
                          ? (statuses[commission.status] ??
                            'Commission recorded')
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
              ]
            : []),
    ];
    return (
        <section className="campaign-tracking" aria-busy={changing}>
            <div className="tracking-heading">
                <h2>{t('Tracking setup')}</h2>
                <div className="tracking-selectors">
                    {data.setup_options.length > 1 && (
                        <label>
                            <span>{t('Outcome to track')}</span>
                            <Select
                                value={setup}
                                onValueChange={(value) =>
                                    setSelectedSetup(value as TrackingSetup)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.setup_options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {t(setupLabels[option])}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    )}
                    {!data.publisher_view && (
                        <label>
                            <span className="sr-only">{t('Publisher')}</span>
                            <Select
                                disabled={changing || !data.publishers.length}
                                value={String(data.assignment_id ?? '')}
                                onValueChange={(value) =>
                                    selectPublisher(Number(value))
                                }
                            >
                                <SelectTrigger aria-label={t('Publisher')}>
                                    <SelectValue
                                        placeholder={t(
                                            'No approved publishers',
                                        )}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.publishers.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={String(p.id)}
                                        >
                                            {t('Publisher')}: {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    )}
                </div>
            </div>
            <div className="tracking-grid">
                <div className="tracking-column">
                    <section className="tracking-panel">
                        <h3>
                            {t(
                                data.publisher_view
                                    ? 'Your tracking link'
                                    : 'Publisher tracking link',
                            )}
                        </h3>
                        <div className="tracking-panel-body">
                            {data.publisher_view && data.tracking_link && (
                                <p className="mb-3 text-sm text-ink-muted">
                                    {t(
                                        'Share your tracking link or QR code with your audience.',
                                    )}{' '}
                                    ·{' '}
                                    {t(
                                        data.clicked
                                            ? 'Click observed'
                                            : 'Awaiting a click',
                                    )}
                                </p>
                            )}
                            {data.tracking_link ? (
                                <div className="tracking-assets-row">
                                    <CopyField
                                        className="tracking-link-field"
                                        variant="code"
                                        label={`${publisher?.name ?? ''} · ${offer.name} ${t('tracking link')}`}
                                        value={data.tracking_link}
                                        copiedMessage={t(
                                            'Tracking link copied',
                                        )}
                                    />
                                    {data.qr_code && (
                                        <div className="tracking-qr">
                                            <img
                                                src={data.qr_code}
                                                alt={t(
                                                    'QR code for the selected publisher tracking link',
                                                )}
                                            />
                                            <Button variant="outline" asChild>
                                                <a
                                                    href={
                                                        data.qr_download_url ??
                                                        undefined
                                                    }
                                                    download={`tracking-${offer.id}-${data.assignment_id}.png`}
                                                >
                                                    <Download size={16} />
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
                            {setup === 'submission' && data.embed_script && (
                                <div className="tracking-embed">
                                    <CopyField
                                        variant="code"
                                        multiline
                                        label={t(
                                            'Attribution script for the form website',
                                        )}
                                        value={data.embed_script}
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                    {!data.publisher_view &&
                        (setup ? (
                            <MerchantTrackingGuide
                                key={setup}
                                setup={setup}
                                data={data}
                            />
                        ) : (
                            <p className="tracking-panel-body text-sm text-ink-muted">
                                {t(
                                    'Set an offer commission type to see its integration instructions.',
                                )}
                            </p>
                        ))}
                </div>
                <div className="tracking-column">
                    {data.stores.length > 0 && (
                        <section className="tracking-panel">
                            <h3>{t('Store integration')}</h3>
                            <div className="tracking-panel-body space-y-2">
                                <p className="text-sm text-ink-muted">
                                    {t(
                                        'Stores linked to the published customer promotion for this offer.',
                                    )}
                                </p>
                                {data.stores.map((store) => (
                                    <p key={store.id} className="text-sm">
                                        <strong>{store.name}</strong> ·{' '}
                                        {store.platform === 'shopify'
                                            ? 'Shopify'
                                            : 'WooCommerce'}{' '}
                                        · {t(store.status)}
                                    </p>
                                ))}
                            </div>
                        </section>
                    )}
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
                            {data.assignment_id && (
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
                            )}
                            {merchantHandoff && data.assignment_id && (
                                <div className="tracking-funds">
                                    <Info size={19} />
                                    <strong>
                                        {t(
                                            'Accepted test outcomes reserve real funds.',
                                        )}
                                    </strong>
                                </div>
                            )}
                        </section>
                    )}
                    {clickOnly ? (
                        <section className="tracking-panel">
                            <h3>{t('Click reporting')}</h3>
                            <p className="tracking-panel-body text-sm">
                                {t(
                                    'Visits through the tracking link appear in click reporting. A click alone does not earn a commission.',
                                )}
                            </p>
                        </section>
                    ) : (
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
                                                          rate.value !== null
                                                              ? `${rate.type} · ${['CPS', 'RevShare'].includes(rate.type) ? `${Number(rate.value)}%` : `${data.currency} ${Number(rate.value).toLocaleString(i18n.language)}`}`
                                                              : t('Not agreed'),
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
                    )}
                </div>
            </div>
        </section>
    );
}
