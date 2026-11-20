import { PageHeader } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import {
    MutedCell,
    ResourceDirectory,
} from '@/components/app/resource-directory';
import { PartnerDiscoveryDialog } from '@/components/partner-discovery-dialog';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import advertisers, { show } from '@/routes/advertisers';
import type { SharedData, TAdvertiser } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Ban,
    Building2,
    CheckCircle2,
    LayoutGrid,
    Megaphone,
    Pencil,
    Plus,
    Power,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChangeNetworkModal } from './modals/change-network';
import CreateAdvertiser from './modals/create';
import EditAdvertiser from './modals/edit';

type AdvertiserRow = TAdvertiser & {
    id: number;
    user_id: number;
    business_name: string;
    email: string;
    status: string;
    industry?: string | null;
    networkName?: string | null;
    network_id?: number | null;
    netId?: number | null;
    currencyCode?: string;
    campaigns_count?: number;
    created_at: string;
};

type Props = SharedData & {
    advrts: LaravelPage<AdvertiserRow>;
    status: string;
    statusCounts: { all: number; active: number; inactive: number };
};

export default function AdvertisersPage() {
    const { t } = useTranslation();
    const {
        advrts,
        status,
        statusCounts,
        auth: { user },
    } = usePage<Props>().props;
    const formatDate = useDate();
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{ advertisers?: TAdvertiser }>();
    const isSuperAdmin = Boolean(user?.is_super_admin);

    return (
        <AppLayout>
            <Head title={t('Advertisers')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Advertisers')}
                    description={t('Brands running campaigns in your network.')}
                    breadcrumbs={[
                        { title: t('Partners'), href: advertisers.index.url() },
                        {
                            title: t('Advertisers'),
                            href: advertisers.index.url(),
                        },
                    ]}
                    icon={<Building2 />}
                    tone="partners"
                    actions={
                        <>
                            <PartnerDiscoveryDialog kind="advertisers" />
                            <Button
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: CreateAdvertiser,
                                        componentProps: {
                                            handleDialogContextSwitch,
                                        },
                                    })
                                }
                            >
                                <Plus />
                                {t('Add advertiser')}
                            </Button>
                        </>
                    }
                />
                <ResourceDirectory<AdvertiserRow>
                    label={t('Advertiser list')}
                    tone="partners"
                    rows={advrts?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Advertiser')}
                    name={(row) => row.business_name}
                    subtitle={(row) => row.email}
                    status={(row) =>
                        row.status === 'A' ? 'active' : 'inactive'
                    }
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All advertisers'),
                            count: statusCounts?.all,
                            tone: 'brand',
                            icon: <LayoutGrid />,
                        },
                        {
                            value: 'active',
                            label: t('Active'),
                            count: statusCounts?.active,
                            tone: 'success',
                            icon: <CheckCircle2 />,
                        },
                        {
                            value: 'inactive',
                            label: t('Inactive'),
                            count: statusCounts?.inactive,
                            tone: 'neutral',
                            icon: <Ban />,
                        },
                    ]}
                    statusValue={status ?? 'all'}
                    onStatusChange={query.setStatus}
                    columns={[
                        {
                            id: 'campaigns',
                            header: t('Campaigns'),
                            cell: (row) => (
                                <span className="inline-flex items-center gap-1.5 tabular-nums">
                                    <Megaphone
                                        className="size-3.5 text-brand"
                                        aria-hidden="true"
                                    />
                                    {row.campaigns_count ?? 0}
                                </span>
                            ),
                        },
                        {
                            id: 'industry',
                            header: t('Industry'),
                            cell: (row) => row.industry || '—',
                        },
                        ...(isSuperAdmin
                            ? [
                                  {
                                      id: 'network',
                                      header: t('Network'),
                                      cell: (row: AdvertiserRow) =>
                                          row.networkName || '—',
                                  },
                              ]
                            : []),
                        {
                            id: 'currency',
                            header: t('Currency'),
                            cell: (row) => row.currencyCode ?? '—',
                        },
                        {
                            id: 'joined',
                            header: t('Joined'),
                            cell: (row) => (
                                <MutedCell>
                                    {formatDate(row.created_at)}
                                </MutedCell>
                            ),
                        },
                    ]}
                    href={(row) => show.url(row.user_id)}
                    actions={() => [
                        {
                            label: t('Edit'),
                            icon: <Pencil />,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: EditAdvertiser,
                                    componentProps: { data: row },
                                }),
                        },
                        {
                            label: t('Change network'),
                            icon: <ArrowLeftRight />,
                            tone: 'partners',
                            // The route is limited to platform administrators.
                            hidden: () => !isSuperAdmin,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: ChangeNetworkModal,
                                    componentProps: {
                                        entityId: row.id,
                                        currentNetworkId:
                                            row.network_id ?? row.netId,
                                        data: row,
                                    },
                                }),
                        },
                        {
                            label: t('Activate'),
                            icon: <Power />,
                            tone: 'success',
                            hidden: (row) => row.status === 'A',
                            onSelect: (row) =>
                                router.post(
                                    advertisers.activate.url(row.id),
                                    {},
                                    { preserveScroll: true },
                                ),
                        },
                        {
                            label: t('Deactivate'),
                            icon: <Ban />,
                            destructive: true,
                            hidden: (row) => row.status !== 'A',
                            onSelect: (row) =>
                                confirm({
                                    title: t('Deactivate advertiser'),
                                    description: t(
                                        'Are you sure you want to deactivate {{name}}?',
                                        { name: row.business_name },
                                    ),
                                    confirmLabel: t('Deactivate'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.post(
                                            advertisers.deactivate.url(row.id),
                                            {},
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                    ]}
                    pagination={query.pagination(advrts)}
                    emptyTitle={t('No advertisers yet')}
                    emptyDescription={t(
                        'Add an advertiser or discover one in the partner pool.',
                    )}
                />
                <FormDialog
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className="sm:max-w-[700px]"
                >
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </FormDialog>
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
