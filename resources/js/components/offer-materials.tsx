import { Button } from '@/components/ui/button';
import { useConfirmationDialog } from '@/dev/core';
import advertiser from '@/routes/advertiser';
import type { Creative } from '@/types';
import { Link, router } from '@inertiajs/react';
import { FileText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type MaterialsPage = {
    data: Creative[];
    total: number;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

export function OfferMaterials({
    offerId,
    materials,
    canUpload,
    canManage,
}: {
    offerId: number;
    materials: MaterialsPage;
    canUpload: boolean;
    canManage: boolean;
}) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">
                        {t('Promotional materials')}
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {t(
                            'Optional banners, videos and copy for publishers. Tracking links work without promotional materials.',
                        )}
                    </p>
                </div>
                {canUpload && (
                    <Button asChild>
                        <Link
                            href={advertiser.creatives.create.url({
                                query: { offer_id: offerId },
                            })}
                        >
                            <Plus className="size-4" />
                            {t('Add promotional material')}
                        </Link>
                    </Button>
                )}
            </div>
            {materials.data.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                    <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <h3 className="font-medium">
                        {t('No promotional materials yet')}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t(
                            'You can start promoting this offer with a tracking link and add materials later.',
                        )}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {materials.data.map((material) => (
                        <article
                            key={material.id}
                            className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
                        >
                            <div className="flex h-40 items-center justify-center bg-muted/40 p-4">
                                {material.preview_url ||
                                (['banner', 'image', 'email'].includes(
                                    material.type,
                                ) &&
                                    material.file_url) ? (
                                    <img
                                        src={
                                            material.preview_url ||
                                            material.file_url
                                        }
                                        alt={material.alt_text || material.name}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                ) : (
                                    <FileText className="size-8 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-4">
                                <div>
                                    <h3 className="font-medium break-words">
                                        {material.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t(material.type)}
                                        {material.width && material.height
                                            ? ` · ${material.width} × ${material.height}`
                                            : ''}{' '}
                                        ·{' '}
                                        {t(
                                            material.status === 'A'
                                                ? 'Active'
                                                : 'Inactive',
                                        )}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('Clicks')}: {material.clicks ?? 0} ·{' '}
                                    {t('Impressions')}:{' '}
                                    {material.impressions ?? 0}
                                </p>
                                {canManage && (
                                    <div className="mt-auto flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={advertiser.creatives.show.url(
                                                    material.id,
                                                )}
                                            >
                                                {t('View Codes')}
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={advertiser.creatives.edit.url(
                                                    material.id,
                                                )}
                                            >
                                                {t('Edit')}
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive"
                                            onClick={() =>
                                                confirm({
                                                    title: t(
                                                        'Delete promotional material',
                                                    ),
                                                    description: t(
                                                        'Are you sure you want to delete this promotional material? Existing embeds for it will stop working.',
                                                    ),
                                                    confirmLabel: t('Delete'),
                                                    cancelLabel: t('Cancel'),
                                                    variant: 'destructive',
                                                    onConfirm: () =>
                                                        router.delete(
                                                            advertiser.creatives.delete.url(
                                                                material.id,
                                                            ),
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        ),
                                                })
                                            }
                                        >
                                            {t('Delete')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
            {materials.last_page > 1 && (
                <nav
                    aria-label={t('Promotional materials pages')}
                    className="flex items-center justify-between gap-3"
                >
                    <Button
                        variant="outline"
                        disabled={!materials.prev_page_url}
                        onClick={() =>
                            materials.prev_page_url &&
                            router.visit(materials.prev_page_url, {
                                preserveScroll: true,
                            })
                        }
                    >
                        {t('Previous')}
                    </Button>
                    <span className="text-sm">
                        {materials.current_page} / {materials.last_page}
                    </span>
                    <Button
                        variant="outline"
                        disabled={!materials.next_page_url}
                        onClick={() =>
                            materials.next_page_url &&
                            router.visit(materials.next_page_url, {
                                preserveScroll: true,
                            })
                        }
                    >
                        {t('Next')}
                    </Button>
                </nav>
            )}
            <ConfirmDialog />
        </section>
    );
}
