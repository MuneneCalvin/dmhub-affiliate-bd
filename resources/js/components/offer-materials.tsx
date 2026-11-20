import { DirectoryPager, EmptyState, SectionCard } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { CreativeCard } from '@/components/creatives';
import { Button } from '@/components/ui/button';
import advertiser from '@/routes/advertiser';
import type { Creative } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Image, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type MaterialsPage = {
    data: Creative[];
    total: number;
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

/** Offer page "Promotional materials" tab: the offer's creatives as library cards. */
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
    // The paginator uses `materials_page` (OffersController@show).
    const goToPage = (page: number) => {
        const base = materials.next_page_url ?? materials.prev_page_url;
        if (!base) return;
        const url = new URL(base, window.location.origin);
        url.searchParams.set('materials_page', String(page));
        router.visit(url.pathname + url.search, { preserveScroll: true });
    };

    return (
        <SectionCard
            title={t('Promotional materials')}
            description={t(
                'Optional banners, videos and copy for publishers. Tracking links work without promotional materials.',
            )}
            icon={<Image />}
            tone="admin"
            action={
                canUpload ? (
                    <Button asChild>
                        <Link
                            href={advertiser.creatives.create.url({
                                query: { offer_id: offerId },
                            })}
                        >
                            <Plus />
                            {t('Add promotional material')}
                        </Link>
                    </Button>
                ) : undefined
            }
            bodyClassName="flex flex-col gap-5"
        >
            {materials.data.length === 0 ? (
                <EmptyState
                    icon={<Image />}
                    tone="admin"
                    title={t('No promotional materials yet')}
                    description={t(
                        'You can start promoting this offer with a tracking link and add materials later.',
                    )}
                />
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[18px]">
                    {materials.data.map((material) => (
                        <CreativeCard
                            key={material.id}
                            creative={material}
                            href={advertiser.creatives.show.url(material.id)}
                            editHref={
                                canManage
                                    ? advertiser.creatives.edit.url(material.id)
                                    : undefined
                            }
                            onDelete={
                                canManage
                                    ? () =>
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
                                                      { preserveScroll: true },
                                                  ),
                                          })
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}
            {materials.last_page > 1 && (
                <DirectoryPager
                    page={materials.current_page}
                    pageCount={materials.last_page}
                    onPageChange={goToPage}
                />
            )}
            <ConfirmDialog />
        </SectionCard>
    );
}
