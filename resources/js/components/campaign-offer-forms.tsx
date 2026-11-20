import { OfferThumbnailUpload } from '@/components/offer-thumbnail-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFilePreview } from '@/hooks/use-file-preview';
import advertiser from '@/routes/advertiser';
import type {
    CampaignMaterial,
    OffersWorkspace,
    WorkspaceOffer,
} from '@/types/campaign-offers';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

function Field({
    id,
    label,
    error,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="offer-field">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {error && (
                <p
                    role="alert"
                    id={`${id}-error`}
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
const lines = (value: string) =>
    value
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);

export function CampaignOfferForm({
    offer,
    campaignId,
    currency,
    commissionTypes,
    onSaved,
    onCancel,
}: {
    offer?: WorkspaceOffer;
    campaignId: number;
    currency: string;
    commissionTypes: OffersWorkspace['commission_types'];
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        workspace: true,
        name: offer?.name ?? '',
        description: offer?.description ?? '',
        offer_status: offer?.offer_status ?? 'A',
        preview_url: offer?.preview_url ?? '',
        commission_type_1: String(offer?.rates[0]?.id ?? ''),
        commission_value_1: String(offer?.rates[0]?.value ?? ''),
        commission_type_2: String(offer?.rates[1]?.id ?? ''),
        commission_value_2: String(offer?.rates[1]?.value ?? ''),
        click_cookie_lifetime_hours: String(
            offer ? (offer.click_cookie_lifetime_hours ?? '') : 168,
        ),
        conversion_window_hours: String(
            offer ? (offer.conversion_window_hours ?? '') : 720,
        ),
        minimum_payout: String(offer?.minimum_payout ?? 0),
        terms: (offer?.terms?.terms ?? []).join('\n'),
        bonus: (offer?.bonus?.bonuses ?? []).join('\n'),
        allowed_traffic_sources: (
            offer?.allowed_traffic_sources?.sources ?? []
        ).join('\n'),
        prohibited_traffic_sources: (
            offer?.prohibited_traffic_sources?.sources ?? []
        ).join('\n'),
        thumbnail: null as File | null,
    });
    type Key = keyof typeof form.data;
    const input = (key: Key, label: string, type = 'text') => (
        <Field id={`offer-${key}`} label={t(label)} error={form.errors[key]}>
            <Input
                id={`offer-${key}`}
                type={type}
                value={String(form.data[key] ?? '')}
                onChange={(e) => form.setData(key, e.target.value)}
                required={key === 'name'}
                maxLength={
                    key === 'name'
                        ? 255
                        : key === 'preview_url'
                          ? 2048
                          : undefined
                }
                min={type === 'number' ? 0 : undefined}
                step={
                    type === 'number'
                        ? key.includes('hours')
                            ? '1'
                            : '0.01'
                        : undefined
                }
                aria-invalid={!!form.errors[key]}
                aria-describedby={
                    form.errors[key] ? `offer-${key}-error` : undefined
                }
            />
        </Field>
    );
    const textarea = (
        key:
            | 'description'
            | 'terms'
            | 'bonus'
            | 'allowed_traffic_sources'
            | 'prohibited_traffic_sources',
        label: string,
    ) => (
        <Field id={`offer-${key}`} label={t(label)} error={form.errors[key]}>
            <Textarea
                id={`offer-${key}`}
                value={form.data[key]}
                onChange={(e) => form.setData(key, e.target.value)}
                rows={3}
            />
        </Field>
    );
    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.transform((data) => ({
                    ...data,
                    terms: { terms: lines(data.terms) },
                    bonus: { bonuses: lines(data.bonus) },
                    allowed_traffic_sources: {
                        sources: lines(data.allowed_traffic_sources),
                    },
                    prohibited_traffic_sources: {
                        sources: lines(data.prohibited_traffic_sources),
                    },
                }));
                form.post(
                    offer
                        ? advertiser.offers.update.url(offer.id)
                        : advertiser.offers.create.url(campaignId),
                    {
                        preserveScroll: true,
                        onSuccess: (page) => {
                            if (
                                !(page.props.flash as { error?: string })?.error
                            )
                                onSaved();
                        },
                    },
                );
            }}
            className="offer-form"
        >
            <fieldset disabled={form.processing} className="space-y-6">
                <div className="offer-form-grid">
                    {input('name', 'Offer name')}
                    <Field
                        id="offer-status"
                        label={t('Status')}
                        error={form.errors.offer_status}
                    >
                        <select
                            id="offer-status"
                            value={form.data.offer_status}
                            onChange={(e) =>
                                form.setData('offer_status', e.target.value)
                            }
                        >
                            <option value="A">{t('Active')}</option>
                            <option value="I">{t('Inactive')}</option>
                            <option value="P">{t('Paused')}</option>
                        </select>
                    </Field>
                </div>
                {textarea('description', 'Description')}
                {input('preview_url', 'Landing page', 'url')}
                <section className="offer-form-section">
                    <h3>{t('Commission rule')}</h3>
                    <p>
                        {t(
                            'Existing assignments retain their agreed rate. Changes apply to new assignments.',
                        )}
                    </p>
                    {[1, 2].map((index) => {
                        const typeKey = `commission_type_${index}` as
                            | 'commission_type_1'
                            | 'commission_type_2';
                        const valueKey = `commission_value_${index}` as
                            | 'commission_value_1'
                            | 'commission_value_2';
                        const type = commissionTypes.find(
                            (c) => String(c.id) === form.data[typeKey],
                        )?.name;
                        return (
                            <div className="offer-form-grid" key={index}>
                                <Field
                                    id={`offer-${typeKey}`}
                                    label={t(
                                        index === 1
                                            ? 'Commission type'
                                            : 'Second commission (optional)',
                                    )}
                                    error={form.errors[typeKey]}
                                >
                                    <select
                                        id={`offer-${typeKey}`}
                                        value={form.data[typeKey]}
                                        onChange={(e) =>
                                            form.setData(
                                                typeKey,
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">{t('None')}</option>
                                        {commissionTypes.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} · {c.nice_name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                {input(
                                    valueKey,
                                    ['CPS', 'RevShare'].includes(type ?? '')
                                        ? 'Rate (% of sale)'
                                        : `Amount (${currency})`,
                                    'number',
                                )}
                            </div>
                        );
                    })}
                </section>
                <div className="offer-form-grid">
                    {input(
                        'click_cookie_lifetime_hours',
                        'Cookie lifetime (hours)',
                        'number',
                    )}
                    {input(
                        'conversion_window_hours',
                        'Conversion window (hours)',
                        'number',
                    )}
                    {input(
                        'minimum_payout',
                        `Minimum payout (${currency})`,
                        'number',
                    )}
                </div>
                <OfferThumbnailUpload
                    value={form.data.thumbnail}
                    onChange={(file) => form.setData('thumbnail', file)}
                    existingUrl={offer?.thumbnail_url}
                    error={form.errors.thumbnail}
                />
                <details className="offer-extra-fields">
                    <summary>{t('Additional terms & traffic sources')}</summary>
                    <p>{t('Enter one item per line.')}</p>
                    <div className="offer-form-grid">
                        {textarea('terms', 'Terms')}
                        {textarea('bonus', 'Bonuses')}
                        {textarea(
                            'allowed_traffic_sources',
                            'Allowed traffic sources',
                        )}
                        {textarea(
                            'prohibited_traffic_sources',
                            'Prohibited traffic sources',
                        )}
                    </div>
                </details>
            </fieldset>
            {Object.keys(form.errors).length > 0 && (
                <p role="alert" className="text-sm text-destructive">
                    {t('Please correct the highlighted fields before saving.')}
                </p>
            )}
            <div className="offer-form-actions">
                <Button
                    type="button"
                    variant="outline"
                    disabled={form.processing}
                    onClick={onCancel}
                >
                    {t('Cancel')}
                </Button>
                <Button disabled={form.processing}>
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}
                    {t(offer ? 'Save changes' : 'Create offer')}
                </Button>
            </div>
        </form>
    );
}

export function CampaignMaterialForm({
    offer,
    material,
    onSaved,
    onCancel,
}: {
    offer: WorkspaceOffer;
    material?: CampaignMaterial;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const form = useForm({
        workspace: true,
        campaign_id: offer.campaign_id,
        offer_id: offer.id,
        name: material?.name ?? '',
        type: material?.type ?? 'image',
        alt_text: material?.alt_text ?? '',
        html_code: material?.html_code ?? '',
        asset: null as File | null,
        preview_image: null as File | null,
        width: String(material?.width ?? ''),
        height: String(material?.height ?? ''),
    });
    const preview = useFilePreview(form.data.asset);
    const isImage = ['image', 'banner', 'email'].includes(form.data.type);
    const fileUrl =
        preview ||
        (material?.type === form.data.type ||
        (isImage && ['image', 'banner', 'email'].includes(material?.type ?? ''))
            ? material?.file_url
            : '');
    return (
        <form
            className="offer-form"
            onSubmit={(e) => {
                e.preventDefault();
                form.post(
                    material
                        ? advertiser.creatives.update.url(material.id)
                        : advertiser.creatives.store.url(),
                    {
                        preserveScroll: true,
                        onSuccess: (page) => {
                            if (
                                !(page.props.flash as { error?: string })?.error
                            )
                                onSaved();
                        },
                    },
                );
            }}
        >
            <fieldset disabled={form.processing} className="space-y-5">
                <div className="offer-form-grid">
                    <Field
                        id="material-name"
                        label={t('Material name')}
                        error={form.errors.name}
                    >
                        <Input
                            id="material-name"
                            required
                            maxLength={100}
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                    </Field>
                    <Field
                        id="material-type"
                        label={t('Format')}
                        error={form.errors.type}
                    >
                        <select
                            id="material-type"
                            value={form.data.type}
                            onChange={(e) =>
                                form.setData({
                                    ...form.data,
                                    type: e.target.value,
                                    asset: null,
                                    preview_image: null,
                                    width: '',
                                    height: '',
                                })
                            }
                        >
                            {[
                                'image',
                                'banner',
                                'text',
                                'html',
                                'video',
                                'email',
                            ].map((type) => (
                                <option key={type} value={type}>
                                    {t(
                                        {
                                            image: 'Image',
                                            banner: 'Banner',
                                            text: 'Text',
                                            html: 'HTML',
                                            video: 'Video',
                                            email: 'Email',
                                        }[type] ?? type,
                                    )}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                {(isImage || form.data.type === 'video') && (
                    <>
                        <Field
                            id="material-file"
                            label={t(
                                material
                                    ? 'Replace file (optional)'
                                    : 'Upload file',
                            )}
                            error={form.errors.asset}
                        >
                            <Input
                                key={form.data.type}
                                id="material-file"
                                type="file"
                                className="h-auto py-2"
                                accept={
                                    form.data.type === 'video'
                                        ? 'video/mp4,video/webm'
                                        : 'image/jpeg,image/png,image/gif,image/webp'
                                }
                                onChange={(e) =>
                                    form.setData(
                                        'asset',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                required={!fileUrl}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    form.data.type === 'video'
                                        ? 'MP4 or WebM, up to 50 MB.'
                                        : 'JPG, PNG, GIF or WebP, up to 10 MB.',
                                )}
                            </p>
                        </Field>
                        {fileUrl &&
                            (isImage ? (
                                <img
                                    className="offer-upload-preview"
                                    src={fileUrl}
                                    alt={t('Material preview')}
                                />
                            ) : (
                                <video
                                    className="offer-upload-preview"
                                    src={fileUrl}
                                    controls
                                    onLoadedMetadata={(e) => {
                                        const video = e.currentTarget;
                                        form.setData((current) => ({
                                            ...current,
                                            width: String(video.videoWidth),
                                            height: String(video.videoHeight),
                                        }));
                                    }}
                                />
                            ))}
                    </>
                )}
                <Field
                    id="material-alt"
                    label={t(
                        form.data.type === 'text'
                            ? 'Link text'
                            : 'Alternative text',
                    )}
                    error={form.errors.alt_text}
                >
                    <Textarea
                        id="material-alt"
                        maxLength={255}
                        required={form.data.type === 'text'}
                        value={form.data.alt_text}
                        onChange={(e) =>
                            form.setData('alt_text', e.target.value)
                        }
                    />
                </Field>
                {form.data.type === 'html' && (
                    <Field
                        id="material-html"
                        label={t('HTML content')}
                        error={form.errors.html_code}
                    >
                        <Textarea
                            id="material-html"
                            required
                            rows={8}
                            value={form.data.html_code}
                            onChange={(e) =>
                                form.setData('html_code', e.target.value)
                            }
                        />
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'Use {{tracking_url}} for the tracked destination.',
                            )}
                        </p>
                    </Field>
                )}
                {['html', 'video'].includes(form.data.type) && (
                    <Field
                        id="material-preview"
                        label={t('Preview image (optional)')}
                        error={form.errors.preview_image}
                    >
                        <Input
                            id="material-preview"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) =>
                                form.setData(
                                    'preview_image',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                        />
                    </Field>
                )}
            </fieldset>
            {Object.entries(form.errors)
                .filter(([key]) =>
                    ['width', 'height', 'offer_id', 'campaign_id'].includes(
                        key,
                    ),
                )
                .map(([key, error]) => (
                    <p
                        key={key}
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {error}
                    </p>
                ))}
            {form.progress && (
                <p role="status">
                    {t('Uploading')}… {form.progress.percentage}%
                </p>
            )}
            <div className="offer-form-actions">
                <Button
                    type="button"
                    variant="outline"
                    disabled={form.processing}
                    onClick={onCancel}
                >
                    {t('Cancel')}
                </Button>
                <Button disabled={form.processing}>
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}
                    {t(material ? 'Save changes' : 'Upload material')}
                </Button>
            </div>
        </form>
    );
}
