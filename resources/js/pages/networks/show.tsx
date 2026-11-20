import {
    DetailList,
    ProfileBanner,
    ResourceDirectory,
    SectionCard,
    StatCard,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import networks, { activate, deactivate } from '@/routes/networks';
import type { TNetwork, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Ban,
    CalendarClock,
    CheckCircle2,
    Coins,
    Network,
    Pencil,
    Power,
    Settings2,
    Trash2,
    UserPlus,
    UsersRound,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AddUsers from './networks_modals/add_users';
import { EditNetworkModal } from './networks_modals/edit_modal';
import EditNetworkUser from './networks_modals/edit_user';

type NetworkDetails = TNetwork & {
    id: number;
    country_name?: string | null;
    created_at: string;
    updated_at: string;
};
type NetworkUser = User & { id: number; status: string; title?: string };

const STATUS_KEYWORD: Record<string, string> = {
    A: 'active',
    P: 'pending',
    D: 'deactivated',
};

export default function ShowNetwork() {
    const { t } = useTranslation();
    const { network, users = [] } = usePage<{
        network: NetworkDetails;
        users: NetworkUser[];
    }>().props;
    const formatDate = useDate();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<Record<string, unknown>>();
    const activeUsers = users.filter((user) => user.status === 'A').length;
    const fullName = (user: NetworkUser) =>
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.email;
    const userAction = (
        user: NetworkUser,
        action: 'activate' | 'deactivate' | 'remove',
    ) =>
        router.post(
            `/networks/users/${user.id}/${action}`,
            { network_id: network.id },
            { preserveScroll: true },
        );

    return (
        <AppLayout>
            <Head title={network.network_name} />
            <div className="workspace-page flex flex-col gap-[22px]">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: t('Networks'), href: networks.index.url() },
                        {
                            title: network.network_name,
                            href: networks.show.url(network.id),
                        },
                    ]}
                />
                <ProfileBanner
                    name={network.network_name}
                    logoUrl={network.logo_url}
                    status={
                        <StatusBadge
                            status={
                                STATUS_KEYWORD[network.status] ?? network.status
                            }
                        />
                    }
                    chips={[
                        { label: t('Network'), tone: 'partners' },
                        ...(network.country_name
                            ? [
                                  {
                                      label: network.country_name,
                                      tone: 'analytics' as const,
                                  },
                              ]
                            : []),
                        { label: network.default_currency },
                        {
                            label: t('Created {{date}}', {
                                date: formatDate(network.created_at),
                            }),
                        },
                    ]}
                    actions={
                        <>
                            {network.status === 'A' ? (
                                <Button
                                    variant="secondary"
                                    onClick={() =>
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
                                                    deactivate.url(network.id),
                                                ),
                                        })
                                    }
                                >
                                    <Ban className="text-danger-ink" />
                                    {t('Deactivate')}
                                </Button>
                            ) : (
                                <Button
                                    variant="success"
                                    onClick={() =>
                                        confirm({
                                            title: t('Approve network'),
                                            description: t(
                                                'Are you sure you want to approve this network?',
                                            ),
                                            confirmLabel: t('Approve'),
                                            cancelLabel: t('Cancel'),
                                            onConfirm: () =>
                                                router.post(
                                                    activate.url(network.id),
                                                ),
                                        })
                                    }
                                >
                                    <CheckCircle2 />
                                    {t('Approve')}
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: AddUsers,
                                        componentProps: { network },
                                    })
                                }
                            >
                                <UserPlus className="text-partners" />
                                {t('Add users')}
                            </Button>
                            <Button
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: EditNetworkModal,
                                        componentProps: { data: network },
                                    })
                                }
                            >
                                <Pencil />
                                {t('Edit network')}
                            </Button>
                        </>
                    }
                />

                <section
                    aria-label={t('Summary')}
                    className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5"
                >
                    <StatCard
                        variant="solid"
                        tone="partners"
                        label={t('Team members')}
                        value={users.length}
                        icon={<UsersRound />}
                    />
                    <StatCard
                        tone="success"
                        label={t('Active members')}
                        value={activeUsers}
                        icon={<CheckCircle2 />}
                    />
                    <StatCard
                        tone="finance"
                        label={t('Min Payment Threshold')}
                        value={network.min_payment_threshold ?? '—'}
                        icon={<Wallet />}
                    />
                    <StatCard
                        tone="analytics"
                        label={t('Payment Frequency')}
                        value={
                            <StatusBadge status={network.payment_frequency} />
                        }
                        icon={<CalendarClock />}
                    />
                </section>

                <div className="grid gap-[18px] lg:grid-cols-3">
                    <SectionCard
                        title={t('Network information')}
                        icon={<Network />}
                        tone="partners"
                    >
                        <DetailList
                            labelWidth={140}
                            rows={[
                                {
                                    label: t('Name'),
                                    value: network.network_name,
                                },
                                {
                                    label: t('Owner email'),
                                    value: network.owner_email,
                                },
                                {
                                    label: t('Country'),
                                    value: network.country_iso
                                        ? `${network.country_iso} · ${network.country_name ?? ''}`
                                        : null,
                                },
                                {
                                    label: t('Default Currency'),
                                    value: network.default_currency,
                                },
                                {
                                    label: t('Support Email'),
                                    value: network.support_email,
                                },
                                {
                                    label: t('Support Phone'),
                                    value: network.support_phone,
                                },
                            ]}
                        />
                    </SectionCard>
                    <SectionCard
                        title={t('Payouts & commissions')}
                        icon={<Coins />}
                        tone="finance"
                    >
                        <DetailList
                            labelWidth={140}
                            rows={[
                                {
                                    label: t('Default Commission Model'),
                                    value: network.default_commission_model,
                                },
                                {
                                    label: t('Default Commission Value'),
                                    value: network.default_commission_value,
                                },
                                {
                                    label: t('Pay Day of Month'),
                                    value: network.pay_day_of_month,
                                },
                                {
                                    label: t('Pay Day of Week'),
                                    value: network.pay_day_of_week,
                                },
                            ]}
                        />
                    </SectionCard>
                    <SectionCard
                        title={t('Record')}
                        icon={<Settings2 />}
                        tone="neutral"
                    >
                        <DetailList
                            labelWidth={140}
                            rows={[
                                {
                                    label: t('Created'),
                                    value: formatDate(network.created_at),
                                },
                                {
                                    label: t('Updated'),
                                    value: formatDate(network.updated_at),
                                },
                                {
                                    label: t('Approved'),
                                    value: network.approved_at
                                        ? formatDate(network.approved_at)
                                        : null,
                                },
                                {
                                    label: t('Approved By'),
                                    value: network.approved_by,
                                },
                                {
                                    label: t('Logo URL'),
                                    value: network.logo_url && (
                                        <a
                                            href={network.logo_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-ink hover:underline"
                                        >
                                            {network.logo_url}
                                        </a>
                                    ),
                                },
                            ]}
                        />
                    </SectionCard>
                </div>

                <h2 className="-mb-2 text-lg font-extrabold">
                    {t('Network users')}
                </h2>
                <ResourceDirectory<NetworkUser>
                    label={t('Network users')}
                    tone="partners"
                    rows={users}
                    rowKey={(user) => user.id}
                    nameHeader={t('User')}
                    name={fullName}
                    subtitle={(user) => user.email}
                    status={(user) =>
                        STATUS_KEYWORD[user.status] ?? user.status
                    }
                    columns={[
                        {
                            id: 'title',
                            header: t('Title'),
                            cell: (user) => user.title || '—',
                        },
                    ]}
                    actions={() => [
                        {
                            label: t('Edit'),
                            icon: <Pencil />,
                            onSelect: (user) =>
                                handleDialogContextSwitch({
                                    Component: EditNetworkUser,
                                    componentProps: {
                                        user,
                                        networkId: network.id,
                                    },
                                }),
                        },
                        {
                            label: t('Activate'),
                            icon: <Power />,
                            tone: 'success',
                            hidden: (user) => user.status === 'A',
                            onSelect: (user) =>
                                confirm({
                                    title: t('Activate user'),
                                    description: t(
                                        'Are you sure you want to activate this user? They will regain access to this network.',
                                    ),
                                    confirmLabel: t('Activate'),
                                    cancelLabel: t('Cancel'),
                                    onConfirm: () =>
                                        userAction(user, 'activate'),
                                }),
                        },
                        {
                            label: t('Deactivate'),
                            icon: <Ban />,
                            tone: 'warning',
                            hidden: (user) => user.status !== 'A',
                            onSelect: (user) =>
                                confirm({
                                    title: t('Deactivate user'),
                                    description: t(
                                        'Are you sure you want to deactivate this user? They will no longer have access to this network.',
                                    ),
                                    confirmLabel: t('Deactivate'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        userAction(user, 'deactivate'),
                                }),
                        },
                        {
                            label: t('Remove'),
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: (user) =>
                                confirm({
                                    title: t('Remove user from network'),
                                    description: t(
                                        'Are you sure you want to remove this user from the network? This action cannot be undone.',
                                    ),
                                    confirmLabel: t('Remove'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () => userAction(user, 'remove'),
                                }),
                        },
                    ]}
                    emptyTitle={t('No users in this network yet')}
                    emptyAction={
                        <Button
                            variant="soft"
                            tone="partners"
                            onClick={() =>
                                handleDialogContextSwitch({
                                    Component: AddUsers,
                                    componentProps: { network },
                                })
                            }
                        >
                            <UserPlus />
                            {t('Add users')}
                        </Button>
                    }
                />
            </div>
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
        </AppLayout>
    );
}
