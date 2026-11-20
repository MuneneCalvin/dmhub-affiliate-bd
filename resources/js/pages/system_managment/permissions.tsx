import { EmptyState, PageHeader, SectionCard } from '@/components/app';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import {
    groupPermissions,
    permissionLabel,
    roleLabel,
} from '@/lib/permissions';
import system from '@/routes/system';
import { Head, Link } from '@inertiajs/react';
import {
    BarChart3,
    Handshake,
    KeyRound,
    Megaphone,
    Search,
    SearchX,
    Settings2,
    ShieldCheck,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type PermissionRow = { id: number; name: string; roles: string[] };

const GROUP_ICONS: Record<string, LucideIcon> = {
    campaigns: Megaphone,
    partners: Handshake,
    finance: Wallet,
    analytics: BarChart3,
    administration: Settings2,
    other: KeyRound,
};

/** Read-only catalogue: every permission, its domain and the roles that have it. */
export default function Permissions({
    permissions,
    canManageRoles,
}: {
    permissions: PermissionRow[];
    canManageRoles: boolean;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const needle = query.trim().toLowerCase();
    const groups = groupPermissions(
        permissions.filter(
            (permission) =>
                !needle ||
                permission.name.toLowerCase().includes(needle) ||
                t(permissionLabel(permission.name))
                    .toLowerCase()
                    .includes(needle),
        ),
    );

    return (
        <AppLayout>
            <Head title={t('Permissions')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Permissions')}
                    description={t(
                        'Every permission in DM Hub and the roles that grant it',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Roles & permissions'),
                            href: system.settings.roles.url(),
                        },
                        {
                            title: t('Permissions'),
                            href: system.settings.Permissions.url(),
                        },
                    ]}
                    icon={<KeyRound />}
                    tone="admin"
                    actions={
                        canManageRoles && (
                            <Button asChild>
                                <Link href={system.settings.roles.url()}>
                                    <ShieldCheck aria-hidden="true" />
                                    {t('Edit roles')}
                                </Link>
                            </Button>
                        )
                    }
                />
                <InputGroup
                    className="w-full sm:max-w-sm"
                    leading={
                        <Search className="text-brand" aria-hidden="true" />
                    }
                >
                    <Input
                        type="search"
                        aria-label={t('Search permissions')}
                        placeholder={t('Search permissions')}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </InputGroup>
                {groups.length ? (
                    <div className="grid gap-[18px] xl:grid-cols-2">
                        {groups.map((group) => {
                            const Icon = GROUP_ICONS[group.key];
                            return (
                                <SectionCard
                                    key={group.key}
                                    title={t(group.title)}
                                    description={t('{{count}} permissions', {
                                        count: group.items.length,
                                    })}
                                    icon={<Icon />}
                                    tone={group.tone}
                                    flush
                                >
                                    <ul className="divide-y divide-border border-t border-border">
                                        {group.items.map((permission) => (
                                            <li
                                                key={permission.id}
                                                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-[22px] py-3"
                                            >
                                                <span className="flex min-w-[180px] flex-1 flex-col">
                                                    <span className="text-sm font-semibold">
                                                        {t(
                                                            permissionLabel(
                                                                permission.name,
                                                            ),
                                                        )}
                                                    </span>
                                                    <code className="font-mono text-xs text-ink-muted">
                                                        {permission.name}
                                                    </code>
                                                </span>
                                                <span className="flex flex-wrap gap-1.5">
                                                    {permission.roles.length ? (
                                                        permission.roles.map(
                                                            (role) => (
                                                                <Badge
                                                                    key={role}
                                                                    variant="neutral"
                                                                >
                                                                    {t(
                                                                        roleLabel(
                                                                            role,
                                                                        ),
                                                                    )}
                                                                </Badge>
                                                            ),
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-ink-muted">
                                                            {t('No roles')}
                                                        </span>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </SectionCard>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<SearchX />}
                        tone="neutral"
                        title={t('No permissions found')}
                        description={t('Try a different search term.')}
                    />
                )}
            </div>
        </AppLayout>
    );
}
