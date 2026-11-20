import {
    CampaignMaterialForm,
    CampaignOfferForm,
} from '@/components/campaign-offer-forms';
import { CustomerPromotions } from '@/components/customer-promotions';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type {
    CampaignMaterial,
    OfferRate,
    OffersWorkspace,
    WorkspaceOffer,
} from '@/types/campaign-offers';
import { Link, usePage } from '@inertiajs/react';
import {
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileImage,
    FileText,
    Info,
    Pencil,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-offers.css';

const outcomes: Record<string, string> = {
    CPS: 'Paid purchase',
    RevShare: 'Paid purchase',
    Flat: 'Purchase or qualified action',
    CPL: 'Accepted enquiry',
    CPA: 'Qualified action',
    CPC: 'Click',
};
function MaterialArtwork({
    material,
    full = false,
}: {
    material: CampaignMaterial;
    full?: boolean;
}) {
    const { t } = useTranslation();
    const [broken, setBroken] = useState(false);
    if (material.type === 'text')
        return (
            <div className="offer-text-artwork">
                <strong>{material.alt_text || material.name}</strong>
                <span>{material.name}</span>
            </div>
        );
    if (full && material.type === 'html')
        return (
            <iframe
                title={material.name}
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">${material.html_code ?? ''}`}
                className="offer-html-preview"
            />
        );
    if (full && material.type === 'video')
        return (
            <video
                src={material.file_url}
                poster={material.preview_url || undefined}
                controls
                className="offer-video-preview"
            />
        );
    const image =
        material.preview_url ||
        (['image', 'banner', 'email'].includes(material.type)
            ? material.file_url
            : null);
    return image && !broken ? (
        <img
            src={image}
            alt={material.alt_text || material.name}
            onError={() => setBroken(true)}
        />
    ) : (
        <div className="offer-artwork-empty">
            <FileImage size={32} />
            <span>
                {t(broken ? 'Preview unavailable' : 'Preview material')}
            </span>
        </div>
    );
}
function materialLabel(material: CampaignMaterial) {
    const type = ['image', 'banner', 'email'].includes(material.type)
        ? 'Image'
        : material.type === 'text'
          ? 'Text'
          : material.type === 'html'
            ? 'HTML'
            : 'Video';
    return {
        type,
        dimensions:
            material.width && material.height
                ? `${material.width} × ${material.height}`
                : null,
    };
}

export function CampaignOffers({
    campaign,
    publisher,
}: {
    campaign: { id: number; currency: string };
    publisher: boolean;
}) {
    const {
        props: { offerWorkspace: data },
        url,
    } = usePage<{ offerWorkspace: OffersWorkspace }>();
    const { t, i18n } = useTranslation();
    const [selectedId, setSelectedId] = useState<number | null>(
        () =>
            Number(new URLSearchParams(url.split('?')[1]).get('offer')) || null,
    );
    const [editor, setEditor] = useState<'create' | 'edit' | null>(null);
    const selected = data.offers.find((offer) => offer.id === selectedId);
    const lastTrigger = useRef<HTMLElement | null>(null);
    const number = (value: number) =>
        new Intl.NumberFormat(i18n.language).format(value);
    const rateLabel = (rate: OfferRate) =>
        rate.value === null
            ? t('Not agreed')
            : ['CPS', 'RevShare'].includes(rate.type)
              ? t('{{rate}}% of sale', { rate: number(Number(rate.value)) })
              : `${campaign.currency} ${number(Number(rate.value))} ${t(rate.type === 'CPL' ? 'per lead' : rate.type === 'CPC' ? 'per click' : rate.type === 'CPA' ? 'per action' : 'per outcome')}`;
    const close = () => {
        setSelectedId(null);
        setEditor(null);
    };
    return (
        <section className="campaign-offers">
            <div className="offers-page-heading">
                <div>
                    <h2>{t('Offers & materials')}</h2>
                    <p>
                        {t(
                            publisher
                                ? 'Your agreed offer terms and promotional assets for this campaign.'
                                : 'Commercial terms and promotional assets for this campaign.',
                        )}
                    </p>
                </div>
                {data.can_create && (
                    <Button
                        onClick={(e) => {
                            lastTrigger.current = e.currentTarget;
                            setEditor('create');
                        }}
                    >
                        {t('Create offer')}
                    </Button>
                )}
            </div>
            {!publisher && data.can_edit && (
                <CustomerPromotions data={data} campaign={campaign} />
            )}
            {data.offers.length ? (
                <div className="offers-table-wrap">
                    <table className="offers-table">
                        <thead>
                            <tr>
                                {[
                                    'Offer',
                                    'Outcome',
                                    'Agreed offer rate',
                                    'Status',
                                    ...(!publisher ? ['Publishers'] : []),
                                    'Materials',
                                    'Tracking guide',
                                ].map((label) => (
                                    <th key={label} scope="col">
                                        {t(label)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.offers.map((offer) => (
                                <tr
                                    key={offer.id}
                                    className={
                                        selectedId === offer.id
                                            ? 'is-selected'
                                            : ''
                                    }
                                    onClick={(e) => {
                                        lastTrigger.current =
                                            e.currentTarget.querySelector(
                                                'button',
                                            );
                                        setSelectedId(offer.id);
                                    }}
                                >
                                    <th scope="row">
                                        <button
                                            type="button"
                                            aria-haspopup="dialog"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                lastTrigger.current =
                                                    e.currentTarget;
                                                setSelectedId(offer.id);
                                            }}
                                        >
                                            {offer.name}
                                        </button>
                                    </th>
                                    <td>
                                        {offer.rates.length
                                            ? offer.rates
                                                  .map((rate) =>
                                                      t(
                                                          outcomes[rate.type] ??
                                                              rate.type,
                                                      ),
                                                  )
                                                  .join(' / ')
                                            : t('Not configured')}
                                    </td>
                                    <td>
                                        {offer.rates.length
                                            ? offer.rates
                                                  .map(rateLabel)
                                                  .join(' + ')
                                            : t('Not agreed')}
                                    </td>
                                    <td>
                                        <span
                                            className={`offer-status ${offer.offer_status === 'A' ? 'active' : ''}`}
                                        >
                                            {t(
                                                offer.offer_status === 'A'
                                                    ? 'Active'
                                                    : offer.offer_status === 'P'
                                                      ? 'Paused'
                                                      : 'Inactive',
                                            )}
                                        </span>
                                    </td>
                                    {!publisher && (
                                        <td>
                                            {number(
                                                offer.publishers_count ?? 0,
                                            )}
                                        </td>
                                    )}
                                    <td>{number(offer.materials.length)}</td>
                                    <td>
                                        {offer.tracking_guide_url ? (
                                            <Link
                                                className="campaign-text-action"
                                                href={offer.tracking_guide_url}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {t('Tracking guide')}
                                            </Link>
                                        ) : (
                                            <span className="text-ink-muted">
                                                {t('Awaiting access')}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="offers-empty">
                    <FileText size={30} />
                    <h3>
                        {t(
                            publisher
                                ? 'No offer assigned yet'
                                : 'No offers yet',
                        )}
                    </h3>
                    <p>
                        {t(
                            publisher
                                ? 'Your offer and materials will appear once your application is approved and an offer is assigned.'
                                : 'Create an offer to set commercial terms and add promotional materials.',
                        )}
                    </p>
                    {data.can_create && (
                        <Button
                            onClick={(e) => {
                                lastTrigger.current = e.currentTarget;
                                setEditor('create');
                            }}
                        >
                            {t('Create offer')}
                        </Button>
                    )}
                </div>
            )}
            <Dialog
                open={!!selected || editor === 'create'}
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <DialogContent
                    className={`campaign-offers-overlay ${editor ? 'offer-editor-overlay' : ''}`}
                    onCloseAutoFocus={(e) => {
                        e.preventDefault();
                        lastTrigger.current?.focus();
                    }}
                >
                    {editor ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {t(
                                        editor === 'create'
                                            ? 'Create offer'
                                            : 'Edit offer',
                                    )}
                                </DialogTitle>
                                <DialogDescription>
                                    {t(
                                        'Set the commercial terms and landing page for this offer.',
                                    )}
                                </DialogDescription>
                            </DialogHeader>
                            <CampaignOfferForm
                                key={editor === 'create' ? 'new' : selected?.id}
                                offer={editor === 'edit' ? selected : undefined}
                                campaignId={campaign.id}
                                currency={campaign.currency}
                                commissionTypes={data.commission_types}
                                onCancel={() =>
                                    editor === 'create'
                                        ? close()
                                        : setEditor(null)
                                }
                                onSaved={() => {
                                    setEditor(null);
                                    if (editor === 'create')
                                        setSelectedId(
                                            Number(
                                                new URLSearchParams(
                                                    window.location.search,
                                                ).get('offer'),
                                            ) || null,
                                        );
                                }}
                            />
                        </>
                    ) : (
                        selected && (
                            <OfferDetails
                                key={selected.id}
                                offer={selected}
                                publisher={publisher}
                                canEdit={data.can_edit}
                                canUpload={data.can_upload}
                                canEditMaterials={data.can_edit_materials}
                                rateLabel={rateLabel}
                                onEdit={() => setEditor('edit')}
                            />
                        )
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}

function OfferDetails({
    offer,
    publisher,
    canEdit,
    canUpload,
    canEditMaterials,
    rateLabel,
    onEdit,
}: {
    offer: WorkspaceOffer;
    publisher: boolean;
    canEdit: boolean;
    canUpload: boolean;
    canEditMaterials: boolean;
    rateLabel: (rate: OfferRate) => string;
    onEdit: () => void;
}) {
    const { t, i18n } = useTranslation();
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(
        offer.materials[0]?.id ?? null,
    );
    const [previewId, setPreviewId] = useState<number | null>(null);
    const [materialEditor, setMaterialEditor] = useState<number | 'new' | null>(
        null,
    );
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);
    const materials = offer.materials.filter(
        (material) =>
            filter === 'all' ||
            (filter === 'images'
                ? ['image', 'banner', 'email'].includes(material.type)
                : filter === 'text'
                  ? material.type === 'text'
                  : ['html', 'video'].includes(material.type)),
    );
    const selected =
        materials.find((material) => material.id === selectedId) ??
        materials[0];
    const preview = offer.materials.find(
        (material) => material.id === previewId,
    );
    const number = (value: number) =>
        new Intl.NumberFormat(i18n.language).format(value);
    const lifetime = (hours: number | null) =>
        hours === null
            ? t('Not set')
            : hours > 0 && hours % 24 === 0
              ? t('{{count}} days', { count: hours / 24 })
              : t('{{count}} hours', { count: hours });
    const meta = (material: CampaignMaterial) => {
        const label = materialLabel(material);
        return `${t(label.type)}${label.dimensions ? ` · ${label.dimensions}` : ''}${material.status !== 'A' ? ` · ${t('Inactive')}` : ''}`;
    };
    return (
        <>
            <DialogHeader className="offer-details-heading">
                <div>
                    <DialogTitle>{offer.name}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t(
                            'Offer terms, promotional materials and creative performance',
                        )}
                    </DialogDescription>
                </div>
                {canEdit && (
                    <Button
                        variant="ghost"
                        className="offer-text-action"
                        onClick={onEdit}
                    >
                        <Pencil size={16} />
                        {t('Edit offer')}
                    </Button>
                )}
            </DialogHeader>
            <dl className="offer-facts">
                <div>
                    <dt>{t('Landing page')}</dt>
                    <dd>
                        {offer.preview_url ? (
                            <a
                                href={offer.preview_url}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {offer.preview_url.replace(/^https?:\/\//, '')}
                                <ExternalLink size={14} />
                            </a>
                        ) : (
                            t('Not set')
                        )}
                    </dd>
                </div>
                <div>
                    <dt>{t('Commission')}</dt>
                    <dd>
                        {offer.rates.length
                            ? offer.rates
                                  .map(
                                      (rate) =>
                                          `${rate.type} · ${rateLabel(rate)}`,
                                  )
                                  .join(' + ')
                            : t('Not agreed')}
                    </dd>
                </div>
                <div>
                    <dt>{t('Cookie lifetime')}</dt>
                    <dd>{lifetime(offer.click_cookie_lifetime_hours)}</dd>
                </div>
                <div>
                    <dt>{t('Conversion window')}</dt>
                    <dd>{lifetime(offer.conversion_window_hours)}</dd>
                </div>
            </dl>
            <div className="offer-detail-columns">
                <div className="offer-detail-main">
                    <section className="offer-commission">
                        <h3>{t('Commission rule')}</h3>
                        {offer.rates.length ? (
                            <ul>
                                {offer.rates.map((rate, index) => (
                                    <li key={index}>
                                        {['CPS', 'RevShare'].includes(rate.type)
                                            ? t(
                                                  '{{rate}}% commission on the net sale value for completed purchases.',
                                                  {
                                                      rate: number(
                                                          Number(rate.value),
                                                      ),
                                                  },
                                              )
                                            : `${rateLabel(rate)} · ${t(outcomes[rate.type] ?? rate.type)}`}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>
                                {t(
                                    'No commission has been agreed for this offer.',
                                )}
                            </p>
                        )}
                        <p className="offer-note">
                            <Info size={17} />
                            {t(
                                publisher
                                    ? 'These are the agreed rates for your assignment.'
                                    : 'Existing assignments retain their agreed rate.',
                            )}
                        </p>
                        {offer.description && (
                            <p className="offer-description">
                                {offer.description}
                            </p>
                        )}
                        {offer.terms?.terms?.length ||
                        offer.allowed_traffic_sources?.sources?.length ||
                        offer.prohibited_traffic_sources?.sources?.length ||
                        offer.bonus?.bonuses?.length ? (
                            <details className="offer-terms">
                                <summary>
                                    {t('Additional terms & traffic sources')}
                                </summary>
                                {[
                                    ['Terms', offer.terms?.terms],
                                    ['Bonuses', offer.bonus?.bonuses],
                                    [
                                        'Allowed traffic sources',
                                        offer.allowed_traffic_sources?.sources,
                                    ],
                                    [
                                        'Prohibited traffic sources',
                                        offer.prohibited_traffic_sources
                                            ?.sources,
                                    ],
                                ].map(([label, items]) =>
                                    Array.isArray(items) && items.length ? (
                                        <div key={String(label)}>
                                            <h4>{t(String(label))}</h4>
                                            <ul>
                                                {items.map((item) => (
                                                    <li key={item}>
                                                        {item.replaceAll(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null,
                                )}
                            </details>
                        ) : null}
                    </section>
                    <section className="offer-materials">
                        <div className="offer-materials-heading">
                            <h3>{t('Materials')}</h3>
                            {canUpload && (
                                <Button
                                    className="offer-text-action"
                                    variant="ghost"
                                    onClick={() => setMaterialEditor('new')}
                                >
                                    <Upload size={16} />
                                    {t('Upload material')}
                                </Button>
                            )}
                        </div>
                        <div
                            className="offer-filters"
                            role="group"
                            aria-label={t('Filter materials')}
                        >
                            {[
                                ['all', 'All'],
                                ['images', 'Images'],
                                ['text', 'Text'],
                                ...(offer.materials.some((m) =>
                                    ['html', 'video'].includes(m.type),
                                )
                                    ? [['other', 'Other']]
                                    : []),
                            ].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={filter === key}
                                    onClick={() => {
                                        setFilter(key);
                                        setCopied(false);
                                        setCopyError(false);
                                    }}
                                >
                                    {t(label)}
                                </button>
                            ))}
                        </div>
                        {materials.length ? (
                            <div className="offer-material-grid">
                                {materials.map((material) => (
                                    <article
                                        key={material.id}
                                        className="offer-material-card"
                                    >
                                        <button
                                            className={`offer-material-artwork ${selected?.id === material.id ? 'selected' : ''}`}
                                            type="button"
                                            aria-label={t('Select {{name}}', {
                                                name: material.name,
                                            })}
                                            aria-pressed={
                                                selected?.id === material.id
                                            }
                                            onClick={() => {
                                                setSelectedId(material.id);
                                                setCopied(false);
                                                setCopyError(false);
                                            }}
                                        >
                                            <MaterialArtwork
                                                material={material}
                                            />
                                        </button>
                                        <h4>{material.name}</h4>
                                        <p>{meta(material)}</p>
                                        <div className="offer-material-actions">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedId(material.id);
                                                    setPreviewId(material.id);
                                                }}
                                            >
                                                <Eye size={16} />
                                                {t('Preview')}
                                            </button>
                                            <a href={material.download_url}>
                                                <Download size={16} />
                                                {t('Download')}
                                            </a>
                                            {canEditMaterials && (
                                                <button
                                                    type="button"
                                                    aria-label={t(
                                                        'Edit {{name}}',
                                                        { name: material.name },
                                                    )}
                                                    onClick={() =>
                                                        setMaterialEditor(
                                                            material.id,
                                                        )
                                                    }
                                                >
                                                    <Pencil size={14} />
                                                    {t('Edit')}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="offers-empty materials-empty">
                                <FileImage size={26} />
                                <h4>
                                    {t(
                                        offer.materials.length
                                            ? 'No matching materials'
                                            : 'No materials yet',
                                    )}
                                </h4>
                                <p>
                                    {t(
                                        offer.materials.length
                                            ? 'Choose another filter to see more materials.'
                                            : canUpload
                                              ? 'Upload an image or add a text creative to get started.'
                                              : 'Promotional materials will appear here when they are available.',
                                    )}
                                </p>
                            </div>
                        )}
                    </section>
                </div>
                <aside className="offer-selected-creative">
                    <h3>{t('Selected creative')}</h3>
                    {selected ? (
                        <>
                            <div className="offer-selected-summary">
                                <div className="offer-selected-thumbnail">
                                    <MaterialArtwork
                                        key={selected.id}
                                        material={selected}
                                    />
                                </div>
                                <div>
                                    <h4>{selected.name}</h4>
                                    <p>{meta(selected)}</p>
                                </div>
                            </div>
                            <dl className="offer-creative-stats">
                                <div>
                                    <dt>{t('Impressions')}</dt>
                                    <dd>
                                        {selected.impressions === null
                                            ? '—'
                                            : number(selected.impressions)}
                                    </dd>
                                </div>
                                <div>
                                    <dt>{t('Clicks')}</dt>
                                    <dd>{number(selected.clicks)}</dd>
                                </div>
                                <div>
                                    <dt>{t('CTR')}</dt>
                                    <dd>
                                        {selected.impressions === null
                                            ? '—'
                                            : `${new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(selected.impressions ? (selected.clicks / selected.impressions) * 100 : 0)}%`}
                                    </dd>
                                </div>
                            </dl>
                            <div className="offer-creative-scope">
                                <h4>{t('Scope')}</h4>
                                <p>
                                    {t(
                                        publisher
                                            ? 'Your assignment · cumulative'
                                            : 'All publishers · cumulative',
                                    )}
                                </p>
                                {publisher && (
                                    <p className="offer-stat-note">
                                        {t(
                                            'Impressions and CTR are not recorded per assignment.',
                                        )}
                                    </p>
                                )}
                            </div>
                            {selected.tracking_url && (
                                <div className="offer-tracking">
                                    <LabelledLink url={selected.tracking_url} />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(
                                                    selected.tracking_url!,
                                                );
                                                setCopied(true);
                                                setCopyError(false);
                                            } catch {
                                                setCopyError(true);
                                            }
                                        }}
                                    >
                                        <Copy size={14} />
                                        {t(
                                            copied
                                                ? 'Copied'
                                                : 'Copy tracking link',
                                        )}
                                    </Button>
                                    <span
                                        role="status"
                                        className={
                                            copyError
                                                ? 'text-sm text-danger-ink'
                                                : 'sr-only'
                                        }
                                    >
                                        {copyError
                                            ? t(
                                                  'Could not copy. Select and copy the link above.',
                                              )
                                            : copied
                                              ? t('Tracking link copied')
                                              : ''}
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="offer-note">
                            {t('Select a material to see its performance.')}
                        </p>
                    )}
                </aside>
            </div>
            <Dialog
                open={!!preview}
                onOpenChange={(open) => {
                    if (!open) setPreviewId(null);
                }}
            >
                <DialogContent className="campaign-offers-overlay offer-preview-overlay">
                    <DialogHeader>
                        <DialogTitle>{preview?.name}</DialogTitle>
                        <DialogDescription>
                            {preview && meta(preview)}
                        </DialogDescription>
                    </DialogHeader>
                    {preview && (
                        <>
                            <div className="offer-full-preview">
                                <MaterialArtwork
                                    key={preview.id}
                                    material={preview}
                                    full
                                />
                            </div>
                            <div className="offer-form-actions">
                                <Button asChild>
                                    <a href={preview.download_url}>
                                        <Download size={16} />
                                        {t('Download')}
                                    </a>
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={materialEditor !== null}
                onOpenChange={(open) => {
                    if (!open) setMaterialEditor(null);
                }}
            >
                <DialogContent className="campaign-offers-overlay offer-editor-overlay">
                    <DialogHeader>
                        <DialogTitle>
                            {t(
                                materialEditor === 'new'
                                    ? 'Upload material'
                                    : 'Edit material',
                            )}
                        </DialogTitle>
                        <DialogDescription>{offer.name}</DialogDescription>
                    </DialogHeader>
                    {materialEditor !== null && (
                        <CampaignMaterialForm
                            key={materialEditor}
                            offer={offer}
                            material={offer.materials.find(
                                (material) => material.id === materialEditor,
                            )}
                            onCancel={() => setMaterialEditor(null)}
                            onSaved={() => setMaterialEditor(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
function LabelledLink({ url }: { url: string }) {
    const { t } = useTranslation();
    return (
        <label className="offer-field">
            {t('Your creative tracking link')}
            <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="offer-link-input"
            />
        </label>
    );
}
