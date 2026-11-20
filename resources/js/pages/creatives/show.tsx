import {
    CopyField,
    DetailList,
    PageHeader,
    SectionCard,
    StatCard,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import {
    CreativePreview,
    CreativeTypePill,
    creativeSize,
} from '@/components/creatives';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import type { Creative, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Code2,
    ExternalLink,
    Eye,
    Image,
    Info,
    MousePointerClick,
    Pencil,
    Percent,
    Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = SharedData & {
    creative: Creative;
    trackingBase: string;
    can?: { manage: boolean };
};

export default function CreativeShow() {
    const { t, i18n } = useTranslation();
    const { creative, trackingBase, can } = usePage<Props>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const canManage = Boolean(can?.manage);
    const number = (value: number | null | undefined) =>
        new Intl.NumberFormat(i18n.language).format(Number(value ?? 0));

    const trackingUrl = creative.tracking_code
        ? `${trackingBase}c/${creative.tracking_code}`
        : '';
    const impressionUrl = creative.tracking_code
        ? `${trackingBase}i/${creative.tracking_code}`
        : '';
    const impressions = Number(creative.impressions ?? 0);
    const clicks = Number(creative.clicks ?? 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const completeCode = [creative.embed_code, creative.tracking_pixel]
        .filter(Boolean)
        .join('\n');
    const image =
        creative.preview_url ||
        (['banner', 'image', 'email'].includes(creative.type)
            ? creative.file_url
            : '');

    const remove = () =>
        confirm({
            title: t('Delete promotional material'),
            description: t(
                'Are you sure you want to delete this promotional material? Existing embeds for it will stop working.',
            ),
            confirmLabel: t('Delete'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            onConfirm: () =>
                router.delete(advertiser.creatives.delete.url(creative.id), {
                    data: { return_to: 'library' },
                }),
        });

    return (
        <AppLayout>
            <Head title={creative.name} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={creative.name}
                    description={
                        <span className="inline-flex flex-wrap items-center gap-2">
                            <CreativeTypePill type={creative.type} />
                            {[creative.campaign?.name, creative.offer?.name]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                    }
                    breadcrumbs={[
                        {
                            title: t('Creatives'),
                            href: advertiser.creatives.index.url(),
                        },
                        {
                            title: creative.name,
                            href: advertiser.creatives.show.url(creative.id),
                        },
                    ]}
                    icon={<Image />}
                    tone="admin"
                    actions={
                        canManage ? (
                            <>
                                <Button variant="secondary" onClick={remove}>
                                    <Trash2 className="text-danger-dot" />
                                    {t('Delete')}
                                </Button>
                                <Button asChild>
                                    <Link
                                        href={advertiser.creatives.edit.url(
                                            creative.id,
                                            { query: { from: 'library' } },
                                        )}
                                    >
                                        <Pencil />
                                        {t('Edit creative')}
                                    </Link>
                                </Button>
                            </>
                        ) : undefined
                    }
                />

                <div className="grid gap-[18px] sm:grid-cols-3">
                    <StatCard
                        label={t('Impressions')}
                        value={number(impressions)}
                        icon={<Eye />}
                        tone="analytics"
                    />
                    <StatCard
                        label={t('Clicks')}
                        value={number(clicks)}
                        icon={<MousePointerClick />}
                        tone="brand"
                    />
                    <StatCard
                        label={t('CTR')}
                        value={`${ctr.toFixed(2)}%`}
                        icon={<Percent />}
                        tone="partners"
                    />
                </div>

                <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                    <SectionCard
                        title={t('Embed code')}
                        description={t(
                            'Give publishers this code. Clicks and impressions are tracked automatically.',
                        )}
                        icon={<Code2 />}
                        tone="analytics"
                        bodyClassName="flex flex-col gap-5"
                    >
                        {trackingUrl && (
                            <div className="flex items-end gap-2">
                                <CopyField
                                    className="flex-1"
                                    label={t('Direct tracking URL')}
                                    value={trackingUrl}
                                    copiedMessage={t('Tracking URL copied')}
                                />
                                <Button
                                    asChild
                                    variant="secondary"
                                    size="icon"
                                    aria-label={t('Open tracking URL')}
                                >
                                    <a
                                        href={trackingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink />
                                    </a>
                                </Button>
                            </div>
                        )}
                        <CopyField
                            label={t('Embed code (click tracking)')}
                            value={creative.embed_code || ''}
                            copiedMessage={t('Embed code copied')}
                            multiline
                            variant="code"
                        />
                        {impressionUrl && (
                            <CopyField
                                label={t('Impression pixel URL')}
                                value={impressionUrl}
                            />
                        )}
                        {creative.tracking_pixel && (
                            <CopyField
                                label={t('HTML pixel code')}
                                value={creative.tracking_pixel}
                                multiline
                            />
                        )}
                        {creative.tracking_pixel && (
                            <CopyField
                                label={t('Complete code (embed + pixel)')}
                                value={completeCode}
                                multiline
                                variant="code"
                            />
                        )}
                    </SectionCard>

                    <div className="flex min-w-0 flex-col gap-[18px]">
                        <SectionCard
                            title={t('Preview')}
                            icon={<Image />}
                            tone="admin"
                        >
                            <CreativePreview
                                size="panel"
                                type={creative.type}
                                name={creative.name}
                                imageUrl={image}
                                videoUrl={
                                    creative.type === 'video'
                                        ? creative.file_url
                                        : undefined
                                }
                                altText={creative.alt_text}
                                badge={creativeSize(creative)}
                            />
                        </SectionCard>
                        <SectionCard
                            title={t('Material details')}
                            icon={<Info />}
                            tone="brand"
                        >
                            <DetailList
                                rows={[
                                    {
                                        label: t('Type'),
                                        value: (
                                            <CreativeTypePill
                                                type={creative.type}
                                            />
                                        ),
                                    },
                                    {
                                        label: t('Dimensions'),
                                        value: creativeSize(creative),
                                    },
                                    {
                                        label: t('Campaign'),
                                        value: creative.campaign?.name,
                                    },
                                    {
                                        label: t('Offer'),
                                        value: creative.offer ? (
                                            <Link
                                                href={`${advertiser.offers.show.url(creative.offer.id)}?tab=materials`}
                                                className="font-semibold text-brand-ink hover:underline"
                                            >
                                                {creative.offer.name}
                                            </Link>
                                        ) : null,
                                    },
                                    {
                                        label: t('Status'),
                                        value: (
                                            <StatusBadge
                                                status={creative.status}
                                            />
                                        ),
                                    },
                                    {
                                        label: t('Tracking code'),
                                        value: creative.tracking_code ? (
                                            <code className="font-mono text-[13px]">
                                                {creative.tracking_code}
                                            </code>
                                        ) : null,
                                    },
                                ]}
                            />
                        </SectionCard>
                    </div>
                </div>
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
