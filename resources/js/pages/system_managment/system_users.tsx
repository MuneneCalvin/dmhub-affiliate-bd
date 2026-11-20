import { PageHeader } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import { ResourceDirectory } from '@/components/app/resource-directory';
import { Badge } from '@/components/ui/badge';
import { useCustomDialogContextFactory } from '@/hooks';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import system from '@/routes/system';
import type { User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    KeyRound,
    LayoutGrid,
    Power,
    UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AssignRoles from './modals/assign_roles';

type UserRow = User & {
    id: number;
    status: string;
    is_super_admin?: boolean;
    is_network?: boolean;
    is_advertiser?: boolean;
    is_publisher?: boolean;
};

type Props = {
    users: LaravelPage<UserRow>;
    status: string;
    statusCounts: { all: number; active: number; inactive: number };
};

const ACCOUNT_TYPES = [
    ['is_super_admin', 'Super admin'],
    ['is_network', 'Network owner'],
    ['is_advertiser', 'Advertiser'],
    ['is_publisher', 'Publisher'],
] as const;

export default function SystemUsers() {
    const { t } = useTranslation();
    const { users, status, statusCounts } = usePage<Props>().props;
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{ users?: User }>();
    const fullName = (row: UserRow) =>
        [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email;

    return (
        <AppLayout>
            <Head title={t('System Users')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Team directory')}
                    description={t(
                        'The people behind your workspace. Open a profile to review access and responsibilities.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Administration'),
                            href: system.settings.users.url(),
                        },
                        {
                            title: t('System Users'),
                            href: system.settings.users.url(),
                        },
                    ]}
                    icon={<UsersRound />}
                    tone="admin"
                />
                <ResourceDirectory<UserRow>
                    label={t('User list')}
                    tone="admin"
                    rows={users?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('User')}
                    name={fullName}
                    subtitle={(row) => row.email}
                    status={(row) =>
                        row.status === 'A' ? 'active' : 'inactive'
                    }
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All users'),
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
                            id: 'type',
                            header: t('Account type'),
                            cell: (row) => (
                                <div className="flex flex-wrap gap-1.5">
                                    {ACCOUNT_TYPES.filter(
                                        ([key]) => row[key],
                                    ).map(([key, label]) => (
                                        <Badge key={key} variant="secondary">
                                            {t(label)}
                                        </Badge>
                                    ))}
                                </div>
                            ),
                        },
                        {
                            id: 'title',
                            header: t('Title'),
                            cell: (row) => row.title || '—',
                        },
                    ]}
                    actions={() => [
                        {
                            label: t('Assign roles'),
                            icon: <KeyRound />,
                            tone: 'admin',
                            hidden: (row) => row.status !== 'A',
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: AssignRoles,
                                    componentProps: { user: row },
                                }),
                        },
                        {
                            label: t('Activate'),
                            icon: <Power />,
                            tone: 'success',
                            hidden: (row) => row.status === 'A',
                            onSelect: (row) =>
                                router.patch(
                                    system.settings.users.activate.url(row.id),
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
                                    title: t('Deactivate user'),
                                    description: t(
                                        'Are you sure you want to deactivate {{name}}?',
                                        { name: fullName(row) },
                                    ),
                                    confirmLabel: t('Deactivate'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.patch(
                                            system.settings.users.deactivate.url(
                                                row.id,
                                            ),
                                            {},
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                    ]}
                    pagination={query.pagination(users)}
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
