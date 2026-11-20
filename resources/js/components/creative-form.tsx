import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ReusablePageTitle } from '@/dev/core';
import { useFilePreview } from '@/hooks/use-file-preview';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { CREATIVE_TYPES } from '@/utils/enums';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type CreativeData = {
    campaign_id: string;
    offer_id: string;
    name: string;
    type: string;
    asset: File | null;
    preview_image: File | null;
    width: string;
    height: string;
    html_code: string;
    alt_text: string;
};
type ExistingCreative = Omit<CreativeData, 'asset' | 'preview_image'> & {
    id: number;
    file_url: string;
    preview_url: string | null;
};
type CampaignOption = { id: number; name: string };
type OfferOption = CampaignOption & { campaign_id: number };
const basics: (keyof CreativeData)[] = [
    'campaign_id',
    'offer_id',
    'name',
    'type',
];
const selectClass =
    'h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

function Field({
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
        <div className="space-y-2">
            <Label htmlFor={id} className="text-sm">
                {label}
            </Label>
            {children}
            {hint && (
                <p
                    id={`${id}-hint`}
                    className="text-sm leading-relaxed text-muted-foreground"
                >
                    {hint}
                </p>
            )}
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export default function CreativeForm() {
    const { t } = useTranslation();
    const { campaigns, offers, creative, offer } = usePage<{
        campaigns: CampaignOption[];
        offers: OfferOption[];
        creative?: ExistingCreative;
        offer: OfferOption;
    }>().props;
    const [step, setStep] = useState(0);
    const form = useForm<CreativeData>({
        campaign_id: String(offer.campaign_id),
        offer_id: String(offer.id),
        name: creative?.name ?? '',
        type:
            creative?.type === 'image'
                ? 'banner'
                : (creative?.type ?? 'banner'),
        asset: null,
        preview_image: null,
        width: String(creative?.width ?? ''),
        height: String(creative?.height ?? ''),
        html_code: creative?.html_code ?? '',
        alt_text: creative?.alt_text ?? '',
    });
    const { data, setData, errors, processing } = form;
    const isImage = ['banner', 'image', 'email'].includes(data.type);
    const isVideo = data.type === 'video';
    const sameAssetType =
        creative &&
        (creative.type === data.type ||
            (isImage && ['image', 'banner', 'email'].includes(creative.type)));
    const existingAsset = sameAssetType ? creative.file_url : '';
    const assetPreview = useFilePreview(data.asset);
    const posterPreview = useFilePreview(data.preview_image);
    const assetUrl = assetPreview || existingAsset;
    const previewUrl =
        posterPreview || (sameAssetType ? creative.preview_url : '') || '';
    const availableOffers = offers.filter(
        (offer) => String(offer.campaign_id) === data.campaign_id,
    );
    const steps = [
        {
            title: t('Name & format'),
            description: t(
                'Name this promotional material and choose its format.',
            ),
        },
        {
            title: t('Material content'),
            description: t(
                'Upload your artwork or add the content for this format.',
            ),
        },
        {
            title: t('Review & save'),
            description: t(
                'Check the material before generating its tracking code.',
            ),
        },
    ];
    const title = creative
        ? t('Edit promotional material')
        : t('Add promotional material');
    const offerUrl = advertiser.offers.show.url(offer.id) + '?tab=materials';
    const fieldProps = (field: keyof CreativeData) => ({
        id: field,
        'aria-invalid': !!errors[field],
        'aria-describedby': `${field}-hint${errors[field] ? ` ${field}-error` : ''}`,
    });

    function validate(stage: number) {
        const found: Partial<Record<keyof CreativeData, string>> = {};
        if (stage === 0) {
            if (!data.campaign_id) found.campaign_id = t('Select a campaign.');
            if (
                !availableOffers.some(
                    (offer) => String(offer.id) === data.offer_id,
                )
            )
                found.offer_id = t('Select an offer from this campaign.');
            if (!data.name.trim()) found.name = t('Enter a material name.');
            if (data.name.length > 100)
                found.name = t('Use 100 characters or fewer.');
        } else {
            if ((isImage || isVideo) && !assetUrl)
                found.asset = t('Upload a promotional material file.');
            if (data.asset && (!data.width || !data.height))
                found.asset = t(
                    'The media could not be read. Choose a valid file.',
                );
            if (data.type === 'html' && !data.html_code.trim())
                found.html_code = t('Enter the HTML content.');
            if (data.type === 'text' && !data.alt_text.trim())
                found.alt_text = t('Enter the link text.');
            if (data.alt_text.length > 255)
                found.alt_text = t('Use 255 characters or fewer.');
            if (errors.asset) found.asset = errors.asset;
            if (errors.preview_image)
                found.preview_image = errors.preview_image;
        }
        form.clearErrors(
            ...(stage === 0
                ? basics
                : ([
                      'asset',
                      'preview_image',
                      'html_code',
                      'alt_text',
                      'width',
                      'height',
                  ] as (keyof CreativeData)[])),
        );
        Object.entries(found).forEach(([key, value]) =>
            form.setError(key as keyof CreativeData, value),
        );
        return Object.keys(found).length === 0;
    }
    function navigate(next: number) {
        if (processing) return;
        if (next > step) {
            for (let stage = 0; stage < next; stage++) {
                if (!validate(stage)) {
                    setStep(stage);
                    return;
                }
            }
        }
        setStep(next);
    }
    function selectFile(file: File | null, preview = false) {
        const key = preview ? 'preview_image' : 'asset';
        form.clearErrors(key);
        if (!preview)
            setData((current) => ({
                ...current,
                asset: null,
                width: '',
                height: '',
            }));
        else setData(key, null);
        if (!file) return;
        const video = isVideo && !preview;
        const types = video
            ? ['video/mp4', 'video/webm']
            : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (
            !types.includes(file.type) ||
            file.size > (video ? 50 : 10) * 1024 * 1024
        ) {
            form.setError(
                key,
                video
                    ? t('Choose an MP4 or WebM file up to 50 MB.')
                    : t('Choose a JPG, PNG, GIF or WebP image up to 10 MB.'),
            );
            return;
        }
        setData(key, file);
    }
    const preview = (
        <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-4">
            {isVideo && assetUrl ? (
                <video
                    key={assetUrl}
                    src={assetUrl}
                    poster={previewUrl || undefined}
                    controls
                    preload="metadata"
                    className="max-h-64 w-full"
                    onLoadedMetadata={(event) => {
                        const { videoWidth, videoHeight } = event.currentTarget;
                        if (data.asset) form.clearErrors('asset');
                        if (data.asset)
                            setData((current) => ({
                                ...current,
                                width: String(videoWidth),
                                height: String(videoHeight),
                            }));
                    }}
                    onError={() => {
                        if (data.asset)
                            form.setError(
                                'asset',
                                t(
                                    'The media could not be read. Choose a valid file.',
                                ),
                            );
                    }}
                />
            ) : (isImage || data.type === 'html') && assetUrl ? (
                <img
                    src={assetUrl}
                    alt={data.alt_text || data.name || t('Material preview')}
                    className="max-h-64 max-w-full object-contain"
                    onLoad={(event) => {
                        const { naturalWidth, naturalHeight } =
                            event.currentTarget;
                        if (data.asset) form.clearErrors('asset');
                        if (data.asset)
                            setData((current) => ({
                                ...current,
                                width: String(naturalWidth),
                                height: String(naturalHeight),
                            }));
                    }}
                    onError={() => {
                        if (data.asset)
                            form.setError(
                                'asset',
                                t(
                                    'The media could not be read. Choose a valid file.',
                                ),
                            );
                    }}
                />
            ) : data.type === 'text' ? (
                <span className="text-primary underline">
                    {data.alt_text || t('Your link text will appear here.')}
                </span>
            ) : (
                <p className="text-center text-sm text-muted-foreground">
                    {data.type === 'html'
                        ? t(
                              'Custom HTML is saved as source code and is not executed in this preview.',
                          )
                        : t('Your uploaded material will appear here.')}
                </p>
            )}
        </div>
    );

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={title}
                    description={t(
                        'Prepare campaign content. DM Hub takes care of the tracking.',
                    )}
                    breadcrumbs={[
                        {
                            title: offer.name,
                            href: advertiser.offers.show.url(offer.id),
                        },
                        {
                            title: t('Promotional materials'),
                            href: offerUrl,
                        },
                        { title, href: '' },
                    ]}
                />
                <form
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (step < 2) {
                            navigate(step + 1);
                            return;
                        }
                        for (let stage = 0; stage < 2; stage++)
                            if (!validate(stage)) {
                                setStep(stage);
                                return;
                            }
                        form.post(
                            creative
                                ? `/advertiser/creatives/update/${creative.id}`
                                : advertiser.creatives.store.url(),
                            {
                                forceFormData: true,
                                preserveScroll: true,
                                onError: (serverErrors) =>
                                    setStep(
                                        Object.keys(serverErrors).some((key) =>
                                            basics.includes(
                                                key as keyof CreativeData,
                                            ),
                                        )
                                            ? 0
                                            : 1,
                                    ),
                            },
                        );
                    }}
                    className="@container mx-auto w-full max-w-5xl overflow-hidden rounded-xl border bg-card"
                >
                    <Tabs
                        value={String(step)}
                        onValueChange={(value) => navigate(Number(value))}
                        activationMode="manual"
                        className="gap-0"
                    >
                        <TabsList
                            aria-label={t('Promotional material setup steps')}
                            className="grid h-auto w-full grid-cols-3 gap-1 rounded-none border-b bg-muted/30 p-2 sm:p-3"
                        >
                            {steps.map((item, index) => (
                                <TabsTrigger
                                    key={item.title}
                                    value={String(index)}
                                    disabled={processing}
                                    className="h-auto min-h-16 flex-col justify-start gap-1 px-2 py-3 text-center whitespace-normal data-[state=active]:shadow-none @min-[640px]:flex-row @min-[640px]:justify-center @min-[640px]:gap-3 @min-[640px]:text-left"
                                >
                                    <span
                                        className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs"
                                        aria-hidden="true"
                                    >
                                        {step > index ? (
                                            <Check className="size-3.5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <span className="text-xs leading-snug sm:text-sm">
                                        {item.title}
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {steps.map((item, index) => (
                            <TabsContent
                                key={item.title}
                                value={String(index)}
                                className="space-y-6 p-5 sm:p-8"
                            >
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold">
                                        {item.title}
                                    </h2>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                                {index === 0 && (
                                    <div className="grid gap-6 @min-[640px]:grid-cols-2">
                                        <div className="rounded-lg bg-muted/40 p-4 text-sm @min-[640px]:col-span-2">
                                            <span className="text-muted-foreground">
                                                {t('Offer')}:{' '}
                                            </span>
                                            <span className="font-medium">
                                                {offer.name}
                                            </span>
                                        </div>
                                        <Field
                                            id="name"
                                            label={t('Material name')}
                                            error={errors.name}
                                        >
                                            <Input
                                                {...fieldProps('name')}
                                                className="h-11"
                                                value={data.name}
                                                maxLength={100}
                                                onChange={(e) =>
                                                    setData(
                                                        'name',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t(
                                                    'e.g. Summer campaign banner',
                                                )}
                                            />
                                        </Field>
                                        <Field
                                            id="type"
                                            label={t('Format')}
                                            error={errors.type}
                                        >
                                            <select
                                                {...fieldProps('type')}
                                                className={selectClass}
                                                value={data.type}
                                                onChange={(e) => {
                                                    const type = e.target.value;
                                                    setData((current) => ({
                                                        ...current,
                                                        type,
                                                        asset: null,
                                                        preview_image: null,
                                                        width: '',
                                                        height: '',
                                                        html_code: '',
                                                        alt_text: '',
                                                    }));
                                                    form.clearErrors();
                                                }}
                                            >
                                                {CREATIVE_TYPES.map((type) => (
                                                    <option
                                                        key={type.value}
                                                        value={type.value}
                                                    >
                                                        {t(type.label)}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                )}
                                {index === 1 && (
                                    <div className="grid items-start gap-8 @min-[720px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                                        <div className="min-w-0 space-y-6">
                                            {data.type !== 'text' && (
                                                <Field
                                                    id="asset"
                                                    label={
                                                        data.type === 'html'
                                                            ? t(
                                                                  'Supporting image (optional)',
                                                              )
                                                            : isVideo
                                                              ? t('Video file')
                                                              : t(
                                                                    'Material image',
                                                                )
                                                    }
                                                    error={
                                                        errors.asset ||
                                                        errors.width ||
                                                        errors.height
                                                    }
                                                    hint={
                                                        isVideo
                                                            ? t(
                                                                  'MP4 or WebM, up to 50 MB. Dimensions are detected automatically.',
                                                              )
                                                            : t(
                                                                  'JPG, PNG, GIF or WebP, up to 10 MB. Dimensions are detected automatically.',
                                                              )
                                                    }
                                                >
                                                    <div className="space-y-3 rounded-lg border border-dashed p-4">
                                                        <Upload
                                                            className="size-5 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                        <Input
                                                            {...fieldProps(
                                                                'asset',
                                                            )}
                                                            key={data.type}
                                                            type="file"
                                                            accept={
                                                                isVideo
                                                                    ? 'video/mp4,video/webm'
                                                                    : 'image/jpeg,image/png,image/gif,image/webp'
                                                            }
                                                            className="h-auto min-h-11 py-2"
                                                            onChange={(e) =>
                                                                selectFile(
                                                                    e.target
                                                                        .files?.[0] ??
                                                                        null,
                                                                )
                                                            }
                                                        />
                                                        {existingAsset && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {t(
                                                                    'The existing file is kept unless you upload a replacement.',
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Field>
                                            )}
                                            {data.type === 'html' && (
                                                <Field
                                                    id="html_code"
                                                    label={t('HTML content')}
                                                    error={errors.html_code}
                                                    hint={t(
                                                        'Use {{click_url}} for the tracked link and {{file_url}} for an optional supporting image.',
                                                        {
                                                            click_url:
                                                                '{{click_url}}',
                                                            file_url:
                                                                '{{file_url}}',
                                                        },
                                                    )}
                                                >
                                                    <Textarea
                                                        {...fieldProps(
                                                            'html_code',
                                                        )}
                                                        value={data.html_code}
                                                        rows={7}
                                                        onChange={(e) =>
                                                            setData(
                                                                'html_code',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </Field>
                                            )}
                                            <Field
                                                id="alt_text"
                                                label={
                                                    data.type === 'text'
                                                        ? t('Link text')
                                                        : t(
                                                              'Alternative text (optional)',
                                                          )
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
                                                    {...fieldProps('alt_text')}
                                                    value={data.alt_text}
                                                    maxLength={255}
                                                    rows={3}
                                                    onChange={(e) =>
                                                        setData(
                                                            'alt_text',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </Field>
                                            {(isVideo ||
                                                data.type === 'html') && (
                                                <Field
                                                    id="preview_image"
                                                    label={t(
                                                        'Preview image (optional)',
                                                    )}
                                                    error={errors.preview_image}
                                                    hint={t(
                                                        'JPG, PNG, GIF or WebP, up to 10 MB.',
                                                    )}
                                                >
                                                    <Input
                                                        {...fieldProps(
                                                            'preview_image',
                                                        )}
                                                        type="file"
                                                        className="h-auto min-h-11 py-2"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        onChange={(e) =>
                                                            selectFile(
                                                                e.target
                                                                    .files?.[0] ??
                                                                    null,
                                                                true,
                                                            )
                                                        }
                                                    />
                                                </Field>
                                            )}
                                        </div>
                                        <aside className="min-w-0 space-y-4">
                                            <h3 className="text-sm font-medium">
                                                {t('Material preview')}
                                            </h3>
                                            {preview}
                                            {data.width && data.height && (
                                                <p className="text-sm text-muted-foreground tabular-nums">
                                                    {t('Detected dimensions')}:{' '}
                                                    {data.width} × {data.height}{' '}
                                                    px
                                                </p>
                                            )}
                                            {previewUrl && !isImage && (
                                                <img
                                                    src={previewUrl}
                                                    alt={t('Preview image')}
                                                    className="max-h-32 rounded-lg object-contain"
                                                />
                                            )}
                                            <p className="text-sm leading-relaxed text-muted-foreground">
                                                {t(
                                                    'Asset URLs are created from your uploads. Tracking links and embed code are generated when you save.',
                                                )}
                                            </p>
                                        </aside>
                                    </div>
                                )}
                                {index === 2 && (
                                    <div className="grid items-start gap-8 @min-[720px]:grid-cols-2">
                                        <div className="space-y-6">
                                            <dl className="space-y-4 text-sm">
                                                {[
                                                    [
                                                        t('Material name'),
                                                        data.name,
                                                    ],
                                                    [
                                                        t('Campaign'),
                                                        campaigns.find(
                                                            (c) =>
                                                                String(c.id) ===
                                                                data.campaign_id,
                                                        )?.name,
                                                    ],
                                                    [
                                                        t('Offer'),
                                                        availableOffers.find(
                                                            (o) =>
                                                                String(o.id) ===
                                                                data.offer_id,
                                                        )?.name,
                                                    ],
                                                    [
                                                        t('Format'),
                                                        t(
                                                            CREATIVE_TYPES.find(
                                                                (c) =>
                                                                    c.value ===
                                                                    data.type,
                                                            )?.label ??
                                                                data.type,
                                                        ),
                                                    ],
                                                    [
                                                        t('Creative file'),
                                                        data.type === 'text'
                                                            ? t(
                                                                  'No file needed',
                                                              )
                                                            : data.asset
                                                                  ?.name ||
                                                              (existingAsset
                                                                  ? t(
                                                                        'Existing file',
                                                                    )
                                                                  : t(
                                                                        'No file needed',
                                                                    )),
                                                    ],
                                                ].map(([label, value]) => (
                                                    <div
                                                        key={label}
                                                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4"
                                                    >
                                                        <dt className="text-muted-foreground">
                                                            {label}
                                                        </dt>
                                                        <dd className="min-w-0 font-medium break-words">
                                                            {value}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                            <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                                                <h3 className="text-sm font-medium">
                                                    {t(
                                                        'Generated automatically',
                                                    )}
                                                </h3>
                                                <p className="text-sm leading-relaxed text-muted-foreground">
                                                    {t(
                                                        'DM Hub generates the asset URL, tracking code, tracking link, embed code and impression pixel. They are available on the creative details page after saving.',
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="min-w-0 space-y-4">
                                            {preview}
                                            {data.type === 'html' && (
                                                <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-4 text-xs break-all whitespace-pre-wrap">
                                                    {data.html_code}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                    {form.progress && (
                        <p role="status" className="px-5 pb-4 text-sm sm:px-8">
                            {t('Uploading')}: {form.progress.percentage}%
                        </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-8">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={processing}
                            onClick={() => router.visit(offerUrl)}
                        >
                            {t('Cancel')}
                        </Button>
                        <div className="flex gap-3">
                            {step > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() => navigate(step - 1)}
                                >
                                    <ArrowLeft className="size-4" />
                                    {t('Back')}
                                </Button>
                            )}
                            <Button type="submit" disabled={processing}>
                                {processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : null}
                                {processing
                                    ? t('Saving…')
                                    : step < 2
                                      ? t('Continue')
                                      : title}
                                {step < 2 && <ArrowRight className="size-4" />}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
