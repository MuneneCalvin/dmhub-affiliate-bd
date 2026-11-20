/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
    CopyButton,
    InfoCardSkeleton,
    InfoRow,
    ReusablePageTitle,
} from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import { BreadcrumbItem, Creative } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Code,
    ExternalLink,
    Eye,
    Image,
    Info,
    Link2,
    MousePointerClick,
    Pencil,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CreativeShow = () => {
    const { t } = useTranslation();
    const { creative, auth } = usePage<any>().props as {
        creative: Creative;
        auth: { user: { is_super_admin: boolean }; permissions: string[] };
    };
    const canManage =
        auth.user.is_super_admin ||
        auth.permissions?.includes('manage_creatives');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: creative.offer?.name ?? t('Offer'),
            href: advertiser.offers.show.url(creative.offer!.id),
        },
        {
            title: t('Promotional materials'),
            href:
                advertiser.offers.show.url(creative.offer!.id) +
                '?tab=materials',
        },
        {
            title: creative?.name,
            href: advertiser.creatives.show(creative?.id).url,
        },
    ];

    const trackingUrl = creative?.tracking_code
        ? `${window.location.origin}/c/${creative?.tracking_code}`
        : '';
    const impressionUrl = creative?.tracking_code
        ? `${window.location.origin}/i/${creative?.tracking_code}`
        : '';

    const getCtr = () => {
        if (!creative?.impressions || creative?.impressions === 0)
            return '0.00';
        return ((creative?.clicks / creative?.impressions) * 100).toFixed(2);
    };

    return (
        <AppLayout>
            <Head title={`${creative?.name} - Material details`} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-4">
                <ReusablePageTitle
                    title={creative?.name}
                    description={t('Promotional material details and tracking')}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex gap-2">
                            {canManage && (
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        router.visit(
                                            advertiser.creatives.edit(
                                                creative?.id,
                                            ),
                                        )
                                    }
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t('Edit promotional material')}
                                </Button>
                            )}
                        </div>
                    }
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <InfoCardSkeleton
                            title={t('Direct Tracking URL')}
                            description={t(
                                'Use this URL to track clicks directly to this creative',
                            )}
                            icon={<Link2 className="h-5 w-5" />}
                            children={
                                <div className="flex gap-2">
                                    <Input
                                        value={trackingUrl}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton
                                        text={trackingUrl}
                                        label={t('Copy URL')}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            window.open(trackingUrl, '_blank')
                                        }
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            }
                        />
                        <InfoCardSkeleton
                            title={t('Embed Code (Click Tracking)')}
                            description={t(
                                'Copy this HTML code to embed the creative with click tracking',
                            )}
                            icon={<MousePointerClick className="h-5 w-5" />}
                            children={
                                <div className="space-y-4">
                                    <Textarea
                                        value={creative?.embed_code || ''}
                                        readOnly
                                        rows={6}
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton
                                        text={creative?.embed_code || ''}
                                        label={t('Copy Embed Code')}
                                    />
                                </div>
                            }
                        />
                        <InfoCardSkeleton
                            title={t('Impression Tracking Pixel')}
                            description={t(
                                'Add this invisible pixel to track impressions (views)',
                            )}
                            icon={<Eye className="h-5 w-5" />}
                            children={
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Pixel URL')}</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={impressionUrl}
                                                readOnly
                                                className="font-mono text-sm"
                                            />
                                            <CopyButton
                                                text={impressionUrl}
                                                label={t('Copy')}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('HTML Pixel Code')}</Label>
                                        <Textarea
                                            value={
                                                creative?.tracking_pixel || ''
                                            }
                                            readOnly
                                            rows={2}
                                            className="font-mono text-sm"
                                        />
                                        <CopyButton
                                            text={
                                                creative?.tracking_pixel || ''
                                            }
                                            label={t('Copy Pixel Code')}
                                        />
                                    </div>
                                </div>
                            }
                        />
                        <InfoCardSkeleton
                            title={t('Complete Code (Embed + Pixel)')}
                            description={t(
                                'Use this code to track both clicks and impressions',
                            )}
                            icon={<Code className="h-5 w-5" />}
                            children={
                                <div className="space-y-4">
                                    <Textarea
                                        value={`${creative.embed_code || ''}\n${creative.tracking_pixel || ''}`}
                                        readOnly
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton
                                        text={`${creative.embed_code || ''}\n${creative.tracking_pixel || ''}`}
                                        label={t('Copy Complete Code')}
                                    />
                                </div>
                            }
                        />
                    </div>
                    <div className="space-y-6">
                        <InfoCardSkeleton
                            title={t('Preview')}
                            icon={<Image className="h-5 w-5" />}
                            children={
                                <>
                                    {creative?.file_url && (
                                        <div className="rounded-lg border bg-muted/50 p-4">
                                            {creative?.type === 'video' ? (
                                                <video
                                                    src={creative?.file_url}
                                                    poster={
                                                        creative?.preview_url ||
                                                        undefined
                                                    }
                                                    controls
                                                    className="h-auto max-w-full"
                                                />
                                            ) : (
                                                <img
                                                    src={creative?.file_url}
                                                    alt={
                                                        creative?.alt_text ||
                                                        creative?.name
                                                    }
                                                    className="h-auto max-w-full"
                                                />
                                            )}
                                        </div>
                                    )}
                                </>
                            }
                        />
                        <InfoCardSkeleton
                            title={t('Material details')}
                            icon={<Info className="h-5 w-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t('Type')}
                                        value={
                                            <StatusBadge
                                                status={creative?.type}
                                            />
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('Dimensions')}
                                        value={
                                            creative?.width && creative?.height
                                                ? `${creative?.width} x ${creative?.height}`
                                                : '-'
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('Campaign')}
                                        value={creative?.campaign?.name || '-'}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('Offer')}
                                        value={creative?.offer?.name || '-'}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('Status')}
                                        value={
                                            <StatusBadge
                                                status={creative?.status}
                                            />
                                        }
                                    />
                                </>
                            }
                        />

                        <InfoCardSkeleton
                            title={t('Performance')}
                            icon={<BarChart3 className="h-5 w-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t('Impressions')}
                                        value={
                                            <span className="font-semibold">
                                                {creative?.impressions?.toLocaleString() ||
                                                    0}
                                            </span>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('Clicks')}
                                        value={
                                            <span className="font-semibold">
                                                {creative?.clicks?.toLocaleString() ||
                                                    0}
                                            </span>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t('CTR')}
                                        value={
                                            <span className="font-semibold">
                                                {getCtr()}%
                                            </span>
                                        }
                                    />
                                </>
                            }
                        />

                        <InfoCardSkeleton
                            title={t('Tracking Code')}
                            icon={<Link2 className="h-5 w-5" />}
                            children={
                                <code className="rounded bg-muted px-2 py-1 text-sm">
                                    {creative?.tracking_code || '-'}
                                </code>
                            }
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CreativeShow;
