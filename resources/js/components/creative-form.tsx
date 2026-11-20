import { PageHeader, SectionCard } from '@/components/app';
import {
    CREATIVE_KIND_META,
    CreativeDropZone,
    CreativePreview,
    IMAGE_UPLOAD,
    VIDEO_UPLOAD,
    isImageKind,
    type CreativeKind,
} from '@/components/creatives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { Textarea } from '@/components/ui/textarea';
import { useFilePreview } from '@/hooks/use-file-preview';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Code2,
    Eye,
    FileText,
    Film,
    Image,
    ImagePlus,
    Link2,
    Loader2,
    Mail,
    Save,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type CreativeData = {
    campaign_id: string;
    offer_id: string;
    name: string;
    type: CreativeKind;
    asset: File | null;
    preview_image: File | null;
    width: string;
    height: string;
    html_code: string;
    alt_text: string;
    return_to: string;
};
type ExistingCreative = {
    id: number;
    name: string;
    type: string;
    width: string | number | null;
    height: string | number | null;
    html_code: string | null;
    alt_text: string | null;
    file_url: string;
    preview_url: string | null;
};
type CampaignOption = { id: number; name: string };
type OfferOption = CampaignOption & { campaign_id: number };
type Field = keyof CreativeData;

const FORMAT_ICONS: Record<CreativeKind, ReactNode> = {
    banner: <Image className="text-admin" />,
    text: <Link2 className="text-analytics" />,
    html: <Code2 className="text-brand" />,
    email: <Mail className="text-finance" />,
    video: <Film className="text-partners" />,
};
const FORMAT_HINTS: Record<CreativeKind, string> = {
    banner: 'Image banner for websites',
    text: 'A tracked text link',
    html: 'Your own HTML snippet',
    email: 'Image for newsletters',
    video: 'MP4 or WebM video',
};
/** Order of the fields on the page, used to focus the first error. */
const FIELD_ORDER: Field[] = [
    'name',
    'type',
    'asset',
    'width',
    'height',
    'html_code',
    'alt_text',
    'preview_image',
];

function FormField({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && (
                <p id={`${id}-hint`} className="text-[13px] text-ink-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm font-medium text-danger-ink"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

/** Create / edit form for one promotional material (creative). */
export default function CreativeForm() {
    const { t } = useTranslation();
    const { creative, offer, returnTo } = usePage<{
        campaigns: CampaignOption[];
        offers: OfferOption[];
        creative?: ExistingCreative;
        offer: OfferOption & { campaign?: { name: string } | null };
        returnTo?: 'library' | null;
    }>().props;
    const fromLibrary = returnTo === 'library';
    const form = useForm<CreativeData>({
        campaign_id: String(offer.campaign_id),
        offer_id: String(offer.id),
        name: creative?.name ?? '',
        type:
            creative?.type === 'image'
                ? 'banner'
                : ((creative?.type as CreativeKind) ?? 'banner'),
        asset: null,
        preview_image: null,
        width: creative?.width ? String(creative.width) : '',
        height: creative?.height ? String(creative.height) : '',
        html_code: creative?.html_code ?? '',
        alt_text: creative?.alt_text ?? '',
        return_to: fromLibrary ? 'library' : '',
    });
    const { data, setData, errors, processing } = form;
    const isImage = isImageKind(data.type);
    const isVideo = data.type === 'video';
    const sameAssetType =
        creative &&
        (creative.type === data.type ||
            (isImage && isImageKind(creative.type)));
    const existingAsset = sameAssetType ? creative.file_url : '';
    const assetPreview = useFilePreview(data.asset);
    const posterPreview = useFilePreview(data.preview_image);
    const assetUrl = assetPreview || existingAsset;
    const posterUrl =
        posterPreview || (sameAssetType ? creative.preview_url : '') || '';
    const rules = isVideo ? VIDEO_UPLOAD : IMAGE_UPLOAD;

    const title = creative ? t('Edit creative') : t('New creative');
    const offerUrl = `${advertiser.offers.show.url(offer.id)}?tab=materials`;
    const cancelUrl = fromLibrary
        ? creative
            ? advertiser.creatives.show.url(creative.id)
            : advertiser.creatives.index.url()
        : offerUrl;
    const describedBy = (field: Field, hint = true) =>
        [hint && `${field}-hint`, errors[field] && `${field}-error`]
            .filter(Boolean)
            .join(' ') || undefined;
    const mediaError = t('The media could not be read. Choose a valid file.');

    const changeType = (type: CreativeKind) => {
        setData((current) => ({
            ...current,
            type,
            asset: null,
            preview_image: null,
            width: '',
            height: '',
            html_code: type === 'html' ? current.html_code : '',
            alt_text: current.alt_text,
        }));
        form.clearErrors();
    };
    const chooseAsset = (file: File) => {
        form.clearErrors('asset');
        setData((current) => ({
            ...current,
            asset: file,
            width: '',
            height: '',
        }));
    };
    const mediaLoaded = (width: number, height: number) => {
        if (!data.asset) return;
        form.clearErrors('asset');
        setData((current) => ({
            ...current,
            width: String(width),
            height: String(height),
        }));
    };

    function validate() {
        const found: Partial<Record<Field, string>> = {};
        if (!data.name.trim()) found.name = t('Enter a material name.');
        if (data.name.length > 100)
            found.name = t('Use 100 characters or fewer.');
        if ((isImage || isVideo) && !assetUrl)
            found.asset = t('Upload a promotional material file.');
        if (data.asset && (!data.width || !data.height))
            found.asset = mediaError;
        if (data.type === 'html' && !data.html_code.trim())
            found.html_code = t('Enter the HTML content.');
        if (data.type === 'text' && !data.alt_text.trim())
            found.alt_text = t('Enter the link text.');
        if (data.alt_text.length > 255)
            found.alt_text = t('Use 255 characters or fewer.');
        form.clearErrors();
        Object.entries(found).forEach(([key, value]) =>
            form.setError(key as Field, value),
        );
        return found;
    }
    const focusFirstError = (keys: string[]) => {
        const first = FIELD_ORDER.find((field) => keys.includes(field));
        if (first)
            window.requestAnimationFrame(() =>
                document.getElementById(first)?.focus(),
            );
    };

    const preview = (
        <CreativePreview
            size="panel"
            type={data.type}
            name={data.name}
            imageUrl={isVideo ? posterUrl : assetUrl || posterUrl}
            videoUrl={isVideo ? assetUrl : undefined}
            altText={data.alt_text}
            badge={
                data.width && data.height
                    ? `${data.width}×${data.height}`
                    : undefined
            }
            onMediaLoad={mediaLoaded}
            onMediaError={() => {
                if (data.asset) form.setError('asset', mediaError);
            }}
        />
    );

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={t(
                        'Prepare campaign content. Brand New Day takes care of the tracking.',
                    )}
                    breadcrumbs={
                        fromLibrary
                            ? [
                                  {
                                      title: t('Creatives'),
                                      href: advertiser.creatives.index.url(),
                                  },
                                  { title, href: '' },
                              ]
                            : [
                                  {
                                      title: offer.name,
                                      href: advertiser.offers.show.url(
                                          offer.id,
                                      ),
                                  },
                                  {
                                      title: t('Promotional materials'),
                                      href: offerUrl,
                                  },
                                  { title, href: '' },
                              ]
                    }
                    icon={creative ? <Image /> : <ImagePlus />}
                    tone="admin"
                />
                <form
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        const found = validate();
                        if (Object.keys(found).length) {
                            focusFirstError(Object.keys(found));
                            return;
                        }
                        form.post(
                            creative
                                ? advertiser.creatives.update.url(creative.id)
                                : advertiser.creatives.store.url(),
                            {
                                forceFormData: true,
                                preserveScroll: true,
                                onError: (serverErrors) =>
                                    focusFirstError(Object.keys(serverErrors)),
                            },
                        );
                    }}
                    className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]"
                >
                    <div className="flex min-w-0 flex-col gap-[18px]">
                        <SectionCard
                            title={t('Details')}
                            description={t(
                                'Name this promotional material and choose its format.',
                            )}
                            icon={<FileText />}
                            tone="brand"
                            bodyClassName="grid gap-5"
                        >
                            <div className="rounded-[14px] bg-surface-muted px-4 py-3 text-sm">
                                <span className="text-ink-muted">
                                    {t('Offer')}:{' '}
                                </span>
                                <span className="font-bold">{offer.name}</span>
                                {offer.campaign?.name && (
                                    <span className="text-ink-muted">
                                        {' '}
                                        · {offer.campaign.name}
                                    </span>
                                )}
                            </div>
                            <FormField
                                id="name"
                                label={t('Material name')}
                                error={errors.name}
                            >
                                <Input
                                    id="name"
                                    value={data.name}
                                    maxLength={100}
                                    aria-invalid={Boolean(errors.name)}
                                    aria-describedby={describedBy(
                                        'name',
                                        false,
                                    )}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder={t(
                                        'e.g. Summer campaign banner',
                                    )}
                                />
                            </FormField>
                            <fieldset className="grid gap-2">
                                <legend className="mb-2 text-[13px] font-bold">
                                    {t('Format')}
                                </legend>
                                <RadioCardGroup
                                    id="type"
                                    name="type"
                                    value={data.type}
                                    onValueChange={(value) =>
                                        changeType(value as CreativeKind)
                                    }
                                    disabled={processing}
                                    className="sm:grid-cols-2 xl:grid-cols-3"
                                >
                                    {(
                                        Object.keys(
                                            CREATIVE_KIND_META,
                                        ) as CreativeKind[]
                                    ).map((kind) => (
                                        <RadioCard
                                            key={kind}
                                            value={kind}
                                            title={t(
                                                CREATIVE_KIND_META[kind].label,
                                            )}
                                            hint={t(FORMAT_HINTS[kind])}
                                            icon={FORMAT_ICONS[kind]}
                                            tone={CREATIVE_KIND_META[kind].tone}
                                        />
                                    ))}
                                </RadioCardGroup>
                                {errors.type && (
                                    <p
                                        role="alert"
                                        className="text-sm font-medium text-danger-ink"
                                    >
                                        {errors.type}
                                    </p>
                                )}
                            </fieldset>
                        </SectionCard>

                        <SectionCard
                            title={t('Content')}
                            description={t(
                                'Upload your artwork or add the content for this format.',
                            )}
                            icon={FORMAT_ICONS[data.type]}
                            tone={CREATIVE_KIND_META[data.type].tone}
                            bodyClassName="grid gap-5"
                        >
                            {data.type !== 'text' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="asset">
                                        {data.type === 'html'
                                            ? t('Supporting image (optional)')
                                            : isVideo
                                              ? t('Video file')
                                              : t('Material image')}
                                    </Label>
                                    <CreativeDropZone
                                        key={data.type}
                                        id="asset"
                                        layout="field"
                                        rules={rules}
                                        title={
                                            data.asset || existingAsset
                                                ? t('Drop a file to replace it')
                                                : t('Drop a file to upload')
                                        }
                                        fileName={
                                            data.asset?.name ??
                                            (existingAsset
                                                ? t(
                                                      'The existing file is kept unless you upload a replacement.',
                                                  )
                                                : null)
                                        }
                                        error={
                                            errors.asset ||
                                            errors.width ||
                                            errors.height
                                        }
                                        disabled={processing}
                                        onFile={chooseAsset}
                                    />
                                    <p className="text-[13px] text-ink-muted">
                                        {t(
                                            'Dimensions are detected automatically.',
                                        )}
                                    </p>
                                </div>
                            )}
                            {data.type === 'html' && (
                                <FormField
                                    id="html_code"
                                    label={t('HTML content')}
                                    error={errors.html_code}
                                    hint={t(
                                        'Use {{click_url}} for the tracked link and {{file_url}} for an optional supporting image.',
                                        {
                                            click_url: '{{click_url}}',
                                            file_url: '{{file_url}}',
                                        },
                                    )}
                                >
                                    <Textarea
                                        id="html_code"
                                        className="font-mono text-[13px]"
                                        value={data.html_code}
                                        rows={8}
                                        aria-invalid={Boolean(errors.html_code)}
                                        aria-describedby={describedBy(
                                            'html_code',
                                        )}
                                        onChange={(e) =>
                                            setData('html_code', e.target.value)
                                        }
                                    />
                                </FormField>
                            )}
                            <FormField
                                id="alt_text"
                                label={
                                    data.type === 'text'
                                        ? t('Link text')
                                        : t('Alternative text (optional)')
                                }
                                error={errors.alt_text}
                                hint={
                                    data.type === 'text'
                                        ? t(
                                              'The visible text for the generated tracking link.',
                                          )
                                        : t(
                                              'Describe the creative for people using a screen reader.',
                                          )
                                }
                            >
                                <Textarea
                                    id="alt_text"
                                    value={data.alt_text}
                                    maxLength={255}
                                    rows={3}
                                    aria-invalid={Boolean(errors.alt_text)}
                                    aria-describedby={describedBy('alt_text')}
                                    onChange={(e) =>
                                        setData('alt_text', e.target.value)
                                    }
                                />
                            </FormField>
                            {(isVideo || data.type === 'html') && (
                                <div className="grid gap-2">
                                    <Label htmlFor="preview_image">
                                        {t('Preview image (optional)')}
                                    </Label>
                                    <CreativeDropZone
                                        key={`${data.type}-poster`}
                                        id="preview_image"
                                        layout="field"
                                        title={t('Drop a preview image')}
                                        fileName={data.preview_image?.name}
                                        error={errors.preview_image}
                                        disabled={processing}
                                        onFile={(file) => {
                                            form.clearErrors('preview_image');
                                            setData('preview_image', file);
                                        }}
                                    />
                                </div>
                            )}
                        </SectionCard>
                    </div>

                    <aside className="flex min-w-0 flex-col gap-[18px] lg:sticky lg:top-24">
                        <SectionCard
                            title={t('Live preview')}
                            icon={<Eye />}
                            tone="analytics"
                            bodyClassName="grid gap-4"
                        >
                            {preview}
                            {data.type === 'html' && data.html_code && (
                                <pre className="max-h-48 overflow-auto rounded-[14px] bg-sidebar p-4 font-mono text-xs break-all whitespace-pre-wrap text-sidebar-text">
                                    {data.html_code}
                                </pre>
                            )}
                            <p className="text-[13px] text-ink-muted">
                                {t(
                                    'Asset URLs are created from your uploads. Tracking links and embed code are generated when you save.',
                                )}
                            </p>
                        </SectionCard>
                        {form.progress && (
                            <p role="status" className="text-sm text-ink-muted">
                                {t('Uploading')}: {form.progress.percentage}%
                            </p>
                        )}
                        <div className="flex flex-wrap justify-end gap-3">
                            <Button
                                asChild
                                variant="secondary"
                                disabled={processing}
                            >
                                <Link href={cancelUrl}>{t('Cancel')}</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save />
                                )}
                                {processing
                                    ? t('Saving…')
                                    : creative
                                      ? t('Save changes')
                                      : t('Create creative')}
                            </Button>
                        </div>
                    </aside>
                </form>
            </div>
        </AppLayout>
    );
}
