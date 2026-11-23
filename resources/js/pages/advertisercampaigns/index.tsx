import {
    MutedCell,
    PageHeader,
    ProgressBar,
    ResourceDirectory,
} from '@/components/app';
import { InfoTip } from '@/components/app/info-tip';
import { campaignStatusKey } from '@/components/campaigns';
import { Button } from '@/components/ui/button';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import advertiser from '@/routes/advertiser';
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    LayoutGrid,
    Megaphone,
    Pause,
    Pencil,
    Plus,
    Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type CampaignRow = {
    id: number;
    name: string;
    advertiser_name: string;
    network_name: string;
    campaign_status: string;
    currency: string;
    total_budget: string | number;
    spent_amount: string | number;
    start_date: string | null;
    end_date: string | null;
    offers_count: number;
};

type Props = SharedData & {
    campaigns: { results: LaravelPage<CampaignRow> };
    status: string;
    statusCounts: { all: number; A: number; P: number; I: number };
};

function BudgetCell({ row }: { row: CampaignRow }) {
    const { t, i18n } = useTranslation();
    const total = Number(row.total_budget);
    const spent = Number(row.spent_amount ?? 0);
    const money = (value: number) =>
        new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency: row.currency,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    if (!(total > 0)) {
        return (
            <MutedCell>
                {t('{{spent}} spent · no limit', { spent: money(spent) })}
            </MutedCell>
        );
    }
    return (
        <ProgressBar
            className="min-w-[150px]"
            value={Math.min(spent, total)}
            max={total}
            tone="finance"
            size="sm"
            label={t('Budget spent for {{name}}', { name: row.name })}
            caption={`${money(spent)} / ${money(total)}`}
        />
    );
}

export default function AdvertiserCampaignsIndex() {
    const { t } = useTranslation();
    const { auth, campaigns, status, statusCounts } = usePage<Props>().props;
    const formatDate = useDate();
    const query = useDirectoryQuery();
    const can = (permission: string) =>
        Boolean(
            auth.user.is_super_admin || auth.permissions?.includes(permission),
        );
    const page = campaigns?.results;
    const ended = (row: CampaignRow) =>
        !row.end_date || row.end_date.startsWith('2100')
            ? t('No end date')
            : formatDate(row.end_date);

    return (
        <AppLayout>
            <Head title={t('Campaigns')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Campaigns')}
                    description={
                        <>
                            {t(
                                'Campaigns, their offers and how much of each budget is used.',
                            )}{' '}
                            <InfoTip term="campaign" />
                            <InfoTip term="offer" />
                        </>
                    }
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                    ]}
                    icon={<Megaphone />}
                    tone="brand"
                    actions={
                        can('create_campaigns') ? (
                            <Button asChild>
                                <Link href={advertiser.campaign.create.url()}>
                                    <Plus />
                                    {t('Create campaign')}
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
                <ResourceDirectory<CampaignRow>
                    label={t('Campaign list')}
                    tone="brand"
                    rows={page?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Campaign')}
                    name={(row) => row.name}
                    subtitle={(row) => row.advertiser_name}
                    status={(row) => campaignStatusKey(row.campaign_status)}
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All campaigns'),
                            count: statusCounts?.all,
                            tone: 'brand',
                            icon: <LayoutGrid />,
                        },
                        {
                            value: 'A',
                            label: t('Active'),
                            count: statusCounts?.A,
                            tone: 'success',
                            icon: <CheckCircle2 />,
                        },
                        {
                            value: 'P',
                            label: t('Paused'),
                            count: statusCounts?.P,
                            tone: 'warning',
                            icon: <Pause />,
                        },
                        {
                            value: 'I',
                            label: t('Inactive'),
                            count: statusCounts?.I,
                            tone: 'neutral',
                            icon: <Ban />,
                        },
                    ]}
                    statusValue={status ?? 'all'}
                    onStatusChange={query.setStatus}
                    columns={[
                        {
                            id: 'offers',
                            header: t('Offers'),
                            cell: (row) => (
                                <span className="inline-flex items-center gap-1.5 tabular-nums">
                                    <Tag
                                        className="size-3.5 text-brand"
                                        aria-hidden="true"
                                    />
                                    {row.offers_count ?? 0}
                                </span>
                            ),
                        },
                        {
                            id: 'budget',
                            header: t('Budget'),
                            cell: (row) => <BudgetCell row={row} />,
                        },
                        {
                            id: 'dates',
                            header: t('Dates'),
                            cell: (row) => (
                                <MutedCell>
                                    {`${formatDate(row.start_date)} – ${ended(row)}`}
                                </MutedCell>
                            ),
                        },
                        ...(auth.user.is_super_admin
                            ? [
                                  {
                                      id: 'network',
                                      header: t('Network'),
                                      cell: (row: CampaignRow) =>
                                          row.network_name || '—',
                                  },
                              ]
                            : []),
                    ]}
                    href={(row) => advertiser.campaign.show.url(row.id)}
                    actions={() =>
                        can('manage_campaigns')
                            ? [
                                  {
                                      label: t('Edit'),
                                      icon: <Pencil />,
                                      onSelect: (row) =>
                                          router.visit(
                                              advertiser.campaign.edit.url(
                                                  row.id,
                                              ),
                                          ),
                                  },
                              ]
                            : []
                    }
                    pagination={query.pagination(page)}
                    emptyTitle={t('No campaigns yet')}
                    emptyDescription={t(
                        'Create a campaign, then add offers for publishers to promote.',
                    )}
                    emptyAction={
                        can('create_campaigns') ? (
                            <Button asChild>
                                <Link href={advertiser.campaign.create.url()}>
                                    <Plus />
                                    {t('Create campaign')}
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
            </div>
        </AppLayout>
    );
}
