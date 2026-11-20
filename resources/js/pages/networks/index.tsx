import { PageHeader } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import {
    MutedCell,
    ResourceDirectory,
} from '@/components/app/resource-directory';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import { useDirectoryQuery } from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import networks, { activate, deactivate, show } from '@/routes/networks';
import type { NetworkPageProps, SharedData, TNetwork } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    Clock3,
    LayoutGrid,
    Network,
    Pencil,
    Plus,
    Power,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EditNetworkModal } from './networks_modals/edit_modal';
import { AddNetworksForm } from './networks_modals/index_modals';

type NetworkRow = TNetwork & {
    id: number;
    network_name: string;
    owner_email?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    status: string;
    created_at: string;
};

type Props = NetworkPageProps &
    SharedData & {
        status: string;
        statusCounts: { all: number; A: number; P: number; D: number };
        networksData: {
            results: NetworkRow[];
            total: number;
            pageCount: number;
            currentPage: number;
            from: number | null;
            to: number | null;
        };
    };

const STATUS_KEYWORD: Record<string, string> = {
    A: 'active',
    P: 'pending',
    D: 'deactivated',
};

export default function NetworksPage() {
    const { t } = useTranslation();
    const { networksData, status, statusCounts } = usePage<Props>().props;
    const formatDate = useDate();
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{ networks?: TNetwork }>();

    return (
        <AppLayout>
            <Head title={t('Networks')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Networks')}
                    description={t(
                        'Your networks and the people building them.',
                    )}
                    breadcrumbs={[
                        { title: t('Partners'), href: networks.index.url() },
                        { title: t('Networks'), href: networks.index.url() },
                    ]}
                    icon={<Network />}
                    tone="partners"
                    actions={
                        <Button
                            onClick={() =>
                                handleDialogContextSwitch({
                                    Component: AddNetworksForm,
                                })
                            }
                        >
                            <Plus />
                            {t('Add network')}
                        </Button>
                    }
                />
                <ResourceDirectory<NetworkRow>
                    label={t('Network list')}
                    tone="partners"
                    rows={networksData?.results ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Network')}
                    name={(row) => row.network_name}
                    subtitle={(row) => row.owner_email}
                    status={(row) => STATUS_KEYWORD[row.status] ?? row.status}
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All networks'),
                            count: statusCounts?.all,
                            tone: 'brand',
                            icon: <LayoutGrid />,
                        },
                        {
                            value: 'active',
                            label: t('Active'),
                            count: statusCounts?.A,
                            tone: 'success',
                            icon: <CheckCircle2 />,
                        },
                        {
                            value: 'pending',
                            label: t('Pending approval'),
                            count: statusCounts?.P,
                            tone: 'warning',
                            icon: <Clock3 />,
                        },
                        {
                            value: 'deactivated',
                            label: t('Deactivated'),
                            count: statusCounts?.D,
                            tone: 'danger',
                            icon: <Ban />,
                        },
                    ]}
                    statusValue={STATUS_KEYWORD[status] ?? 'all'}
                    onStatusChange={(value) =>
                        query.visit({
                            status:
                                Object.entries(STATUS_KEYWORD).find(
                                    ([, keyword]) => keyword === value,
                                )?.[0] ?? null,
                            page: null,
                        })
                    }
                    columns={[
                        {
                            id: 'support_email',
                            header: t('Support email'),
                            cell: (row) => row.support_email || '—',
                        },
                        {
                            id: 'support_phone',
                            header: t('Support contact'),
                            cell: (row) => row.support_phone || '—',
                        },
                        {
                            id: 'created',
                            header: t('Created'),
                            cell: (row) => (
                                <MutedCell>
                                    {formatDate(row.created_at)}
                                </MutedCell>
                            ),
                        },
                    ]}
                    href={(row) => show.url(row.id)}
                    actions={() => [
                        {
                            label: t('Edit'),
                            icon: <Pencil />,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: EditNetworkModal,
                                    componentProps: { data: row },
                                }),
                        },
                        {
                            label: t('Approve'),
                            icon: <Power />,
                            tone: 'success',
                            hidden: (row) => row.status === 'A',
                            onSelect: (row) =>
                                confirm({
                                    title: t('Approve network'),
                                    description: t(
                                        'Are you sure you want to approve this network?',
                                    ),
                                    confirmLabel: t('Approve'),
                                    cancelLabel: t('Cancel'),
                                    onConfirm: () =>
                                        router.post(
                                            activate.url(row.id),
                                            {},
                                            {
                                                preserveScroll: true,
                                            },
                                        ),
                                }),
                        },
                        {
                            label: t('Deactivate'),
                            icon: <Ban />,
                            destructive: true,
                            hidden: (row) => row.status !== 'A',
                            onSelect: (row) =>
                                confirm({
                                    title: t('Deactivate network'),
                                    description: t(
                                        'Are you sure you want to deactivate this network?',
                                    ),
                                    confirmLabel: t('Deactivate'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.post(
                                            deactivate.url(row.id),
                                            {},
                                            {
                                                preserveScroll: true,
                                            },
                                        ),
                                }),
                        },
                    ]}
                    pagination={
                        networksData && {
                            page: networksData.currentPage,
                            pageCount: networksData.pageCount,
                            total: networksData.total,
                            from: networksData.from,
                            to: networksData.to,
                            onPageChange: (page) => query.visit({ page }),
                        }
                    }
                    emptyTitle={t('No networks yet')}
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
