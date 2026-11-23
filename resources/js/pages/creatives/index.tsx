import {
    DirectoryPager,
    EmptyState,
    MutedCell,
    PageHeader,
    ResourceDirectory,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { InfoTip } from '@/components/app/info-tip';
import {
    CREATIVE_KIND_META,
    CREATIVE_KINDS,
    CreativeCard,
    CreativeDropZone,
    creativeSize,
    CreativeTypePill,
    CreativeUploadDialog,
    type CreativeCardData,
    type CreativeFilter,
    type CreativeOfferOption,
} from '@/components/creatives';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCopyToast } from '@/hooks/use-copy-toast';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { toneClasses } from '@/lib/tones';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import type { SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Image, LayoutGrid, List, Megaphone, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type CreativeRow = CreativeCardData & {
    offer_id: number;
    campaign_id: number;
    status: string;
    impressions?: number | null;
    tracking_pixel?: string | null;
    offer?: { id: number; name: string } | null;
};

type Props = SharedData & {
    creatives: LaravelPage<CreativeRow>;
    type: CreativeFilter;
    typeCounts: Record<CreativeFilter, number>;
    campaign: number | null;
    campaigns: { id: number; name: string }[];
    offers: CreativeOfferOption[];
    can: { upload: boolean; manage: boolean };
};

const VIEW_KEY = 'creatives.view';

function readView(): 'grid' | 'list' {
    try {
        return window.localStorage.getItem(VIEW_KEY) === 'list'
            ? 'list'
            : 'grid';
    } catch {
        return 'grid';
    }
}

const detailsUrl = (row: { id: number }) =>
    advertiser.creatives.show.url(row.id);
const editUrl = (row: { id: number }) =>
    advertiser.creatives.edit.url(row.id, { query: { from: 'library' } });

export default function CreativesIndex() {
    const { t, i18n } = useTranslation();
    const { creatives, type, typeCounts, campaign, campaigns, offers, can } =
        usePage<Props>().props;
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { copy } = useCopyToast();
    const [view, setView] = useState<'grid' | 'list'>(readView);
    const [upload, setUpload] = useState<{
        open: boolean;
        file: File | null;
        key: number;
    }>({ open: false, file: null, key: 0 });
    const rows = creatives?.data ?? [];
    const canUpload = can.upload && offers.length > 0;
    const number = (value: number | null | undefined) =>
        new Intl.NumberFormat(i18n.language).format(Number(value ?? 0));

    const changeView = (next: 'grid' | 'list') => {
        setView(next);
        try {
            window.localStorage.setItem(VIEW_KEY, next);
        } catch {
            // Storage is optional; the view still changes for this visit.
        }
    };
    const openUpload = (file: File | null) =>
        setUpload((current) => ({ open: true, file, key: current.key + 1 }));
    const remove = (row: CreativeRow) =>
        confirm({
            title: t('Delete promotional material'),
            description: t(
                'Are you sure you want to delete this promotional material? Existing embeds for it will stop working.',
            ),
            confirmLabel: t('Delete'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            onConfirm: () =>
                router.delete(advertiser.creatives.delete.url(row.id), {
                    data: { return_to: 'library' },
                    preserveScroll: true,
                }),
        });

    const typeOptions = [
        {
            value: 'all' as CreativeFilter,
            label: t('All'),
            count: typeCounts.all,
        },
        ...CREATIVE_KINDS.filter(
            (kind) =>
                ['banner', 'text', 'email'].includes(kind) ||
                typeCounts[kind] > 0 ||
                type === kind,
        ).map((kind) => ({
            value: kind as CreativeFilter,
            label: (
                <span className="inline-flex items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-2 rounded-full',
                            toneClasses[CREATIVE_KIND_META[kind].tone].fill,
                        )}
                    />
                    {t(CREATIVE_KIND_META[kind].plural)}
                </span>
            ),
            count: typeCounts[kind],
        })),
    ];

    const filtered = type !== 'all' || campaign !== null;
    const emptyTitle = filtered
        ? t('No creatives match these filters')
        : t('No creatives yet');
    const emptyDescription = filtered
        ? t('Choose another type or campaign.')
        : t(
              'Upload banners, text links and email assets for publishers to use.',
          );

    return (
        <AppLayout>
            <Head title={t('Creatives')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Creatives')}
                    description={
                        <>
                            {t(
                                'Banners, text links and email assets publishers can use',
                            )}{' '}
                            <InfoTip term="creative" />
                        </>
                    }
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        {
                            title: t('Creatives'),
                            href: advertiser.creatives.index.url(),
                        },
                    ]}
                    icon={<Image />}
                    tone="admin"
                    actions={
                        canUpload ? (
                            <Button onClick={() => openUpload(null)}>
                                <Plus />
                                {t('New creative')}
                            </Button>
                        ) : undefined
                    }
                />

                <section
                    aria-label={t('Filters')}
                    className="flex flex-wrap items-center gap-2.5"
                >
                    <SegmentedControl<CreativeFilter>
                        label={t('Creative type')}
                        options={typeOptions}
                        value={type}
                        onValueChange={(value) =>
                            query.visit({
                                type: value === 'all' ? null : value,
                                page: null,
                            })
                        }
                        className="border border-border bg-surface"
                    />
                    <Select
                        value={campaign ? String(campaign) : 'all'}
                        onValueChange={(value) =>
                            query.visit({
                                campaign: value === 'all' ? null : value,
                                page: null,
                            })
                        }
                    >
                        <SelectTrigger
                            aria-label={t('Campaign')}
                            className="w-auto min-w-[200px] bg-surface"
                        >
                            <Megaphone
                                className="text-brand"
                                aria-hidden="true"
                            />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                {t('All campaigns')}
                            </SelectItem>
                            {campaigns.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={String(item.id)}
                                >
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="flex-1" />
                    <div
                        role="group"
                        aria-label={t('View')}
                        className="inline-flex gap-1"
                    >
                        {(
                            [
                                ['grid', t('Grid view'), LayoutGrid],
                                ['list', t('List view'), List],
                            ] as const
                        ).map(([value, label, Icon]) => (
                            <Button
                                key={value}
                                type="button"
                                size="icon"
                                variant={view === value ? 'soft' : 'secondary'}
                                aria-label={label}
                                aria-pressed={view === value}
                                onClick={() => changeView(value)}
                            >
                                <Icon />
                            </Button>
                        ))}
                    </div>
                </section>

                {view === 'grid' ? (
                    <section
                        aria-label={t('Creatives')}
                        className="flex flex-col gap-5"
                    >
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
                            {can.upload && (
                                <CreativeDropZone
                                    onFile={openUpload}
                                    disabled={offers.length === 0}
                                    disabledReason={t(
                                        'Create an offer first to upload creatives.',
                                    )}
                                />
                            )}
                            {rows.map((row) => (
                                <CreativeCard
                                    key={row.id}
                                    creative={row}
                                    href={detailsUrl(row)}
                                    editHref={
                                        can.manage ? editUrl(row) : undefined
                                    }
                                />
                            ))}
                        </div>
                        {rows.length === 0 && (
                            <EmptyState
                                icon={<Image />}
                                tone="admin"
                                title={emptyTitle}
                                description={emptyDescription}
                                className="rounded-card border border-border bg-surface"
                            />
                        )}
                        {creatives && (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {creatives.total > 0 && (
                                    <p className="text-[13px] text-ink-muted tabular-nums">
                                        {t(
                                            'Showing {{from}}–{{to}} of {{total}}',
                                            {
                                                from: creatives.from ?? 0,
                                                to: creatives.to ?? 0,
                                                total: creatives.total,
                                            },
                                        )}
                                    </p>
                                )}
                                <DirectoryPager
                                    page={creatives.current_page}
                                    pageCount={creatives.last_page}
                                    onPageChange={(page) =>
                                        query.visit({ page })
                                    }
                                />
                            </div>
                        )}
                    </section>
                ) : (
                    <ResourceDirectory<CreativeRow>
                        label={t('Creatives')}
                        tone="admin"
                        rows={rows}
                        rowKey={(row) => row.id}
                        nameHeader={t('Creative')}
                        name={(row) => row.name}
                        subtitle={(row) => row.offer?.name}
                        logoUrl={(row) =>
                            row.preview_url ||
                            (['banner', 'image', 'email'].includes(row.type)
                                ? row.file_url
                                : null)
                        }
                        href={detailsUrl}
                        columns={[
                            {
                                id: 'type',
                                header: t('Type'),
                                cell: (row) => (
                                    <CreativeTypePill type={row.type} />
                                ),
                            },
                            {
                                id: 'size',
                                header: t('Size'),
                                cell: (row) => (
                                    <MutedCell>
                                        {creativeSize(row) ?? '—'}
                                    </MutedCell>
                                ),
                            },
                            {
                                id: 'campaign',
                                header: t('Campaign'),
                                cell: (row) => row.campaign?.name ?? '—',
                            },
                            {
                                id: 'clicks',
                                header: t('Clicks'),
                                align: 'end',
                                cell: (row) => (
                                    <span className="tabular-nums">
                                        {number(row.clicks)}
                                    </span>
                                ),
                            },
                        ]}
                        actions={(row) => [
                            {
                                label: t('Copy embed code'),
                                onSelect: () =>
                                    copy(
                                        row.embed_code ?? '',
                                        t('Embed code copied'),
                                    ),
                                hidden: () => !row.embed_code,
                            },
                            {
                                label: t('Edit'),
                                onSelect: () => router.visit(editUrl(row)),
                                hidden: () => !can.manage,
                            },
                            {
                                label: t('Delete'),
                                destructive: true,
                                onSelect: remove,
                                hidden: () => !can.manage,
                            },
                        ]}
                        pagination={query.pagination(creatives)}
                        emptyTitle={emptyTitle}
                        emptyDescription={emptyDescription}
                        emptyAction={
                            canUpload ? (
                                <Button
                                    variant="soft"
                                    onClick={() => openUpload(null)}
                                >
                                    <Plus />
                                    {t('New creative')}
                                </Button>
                            ) : undefined
                        }
                    />
                )}

                {can.upload && (
                    <CreativeUploadDialog
                        key={upload.key}
                        open={upload.open}
                        file={upload.file}
                        onOpenChange={(open) =>
                            setUpload((current) => ({ ...current, open }))
                        }
                        campaigns={campaigns}
                        offers={offers}
                        campaignId={campaign}
                    />
                )}
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
