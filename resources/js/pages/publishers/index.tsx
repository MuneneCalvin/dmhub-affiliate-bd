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
import publishers, { show } from '@/routes/publishers';
import type { SharedData, TPublisher } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Ban,
    CheckCircle2,
    LayoutGrid,
    Megaphone,
    Newspaper,
    Pencil,
    Plus,
    Power,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChangeNetworkModal } from './publisher_modals/change-network';
import CreatePublisherForm from './publisher_modals/create';
import EditPublisherForm from './publisher_modals/edit';

type PublisherRow = TPublisher & {
    id: number;
    first_name: string | null;
    last_name: string | null;
    business_name?: string | null;
    email: string;
    status: string;
    website_url?: string | null;
    network_id?: number | null;
    network_name?: string | null;
    currency?: string | null;
    campaigns_count?: number;
    created_at: string;
};

type Props = SharedData & {
    pbshers: LaravelPage<PublisherRow>;
    status: string;
    statusCounts: { all: number; active: number; inactive: number };
};

const displayName = (row: PublisherRow) =>
    row.business_name ||
    [row.first_name, row.last_name].filter(Boolean).join(' ') ||
    row.email;

export default function PublishersPage() {
    const { t } = useTranslation();
    const {
        pbshers,
        status,
        statusCounts,
        auth: { user },
    } = usePage<Props>().props;
    const formatDate = useDate();
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{ publishers?: TPublisher }>();
    const isSuperAdmin = Boolean(user?.is_super_admin);

    return (
        <AppLayout>
            <Head title={t('Publishers')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Publishers')}
                    description={t(
                        'Your publishing community, all in one place.',
                    )}
                    breadcrumbs={[
                        { title: t('Partners'), href: publishers.index.url() },
                        {
                            title: t('Publishers'),
                            href: publishers.index.url(),
                        },
                    ]}
                    icon={<Newspaper />}
                    tone="partners"
                    actions={
                        <>
                            <PartnerDiscoveryDialog kind="publishers" />
                            <Button
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: CreatePublisherForm,
                                    })
                                }
                            >
                                <Plus />
                                {t('Add publisher')}
                            </Button>
                        </>
                    }
                />
                <ResourceDirectory<PublisherRow>
                    label={t('Publisher list')}
                    tone="partners"
                    rows={pbshers?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Publisher')}
                    name={displayName}
                    subtitle={(row) => row.website_url || row.email}
                    status={(row) =>
                        row.status === 'A' ? 'active' : 'inactive'
                    }
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All publishers'),
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
                            header: t('Campaigns joined'),
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
                            id: 'contact',
                            header: t('Contact'),
                            cell: (row) =>
                                [row.first_name, row.last_name]
                                    .filter(Boolean)
                                    .join(' ') || '—',
                        },
                        ...(isSuperAdmin
                            ? [
                                  {
                                      id: 'network',
                                      header: t('Network'),
                                      cell: (row: PublisherRow) =>
                                          row.network_name || '—',
                                  },
                              ]
                            : []),
                        {
                            id: 'currency',
                            header: t('Currency'),
                            cell: (row) => row.currency || '—',
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
                    href={(row) => show.url(row.id)}
                    actions={() => [
                        {
                            label: t('Edit'),
                            icon: <Pencil />,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: EditPublisherForm,
                                    componentProps: { data: row },
                                }),
                        },
                        {
                            label: t('Change network'),
                            icon: <ArrowLeftRight />,
                            tone: 'partners',
                            hidden: () => !isSuperAdmin,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: ChangeNetworkModal,
                                    componentProps: {
                                        data: row,
                                        currentNetworkId: row.network_id,
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
                                    publishers.activate.url(row.id),
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
                                    title: t('Deactivate publisher'),
                                    description: t(
                                        'Are you sure you want to deactivate {{name}}?',
                                        { name: displayName(row) },
                                    ),
                                    confirmLabel: t('Deactivate'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.post(
                                            publishers.deactivate.url(row.id),
                                            {},
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                    ]}
                    pagination={query.pagination(pbshers)}
                    emptyTitle={t('No publishers yet')}
                    emptyDescription={t(
                        'Add a publisher or discover one in the partner pool.',
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
