import {
    EmptyState,
    IconTile,
    PageHeader,
    PermissionGrid,
    type PermissionOption,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import { roleLabel } from '@/lib/permissions';
import { toneFromName, type DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import system from '@/routes/system';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronRight,
    KeyRound,
    Pencil,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RoleFormModal, { type RoleFormTarget } from './modals/role-form';

type RoleRow = {
    id: number;
    name: string;
    users_count: number;
    permissions: number[];
    built_in: boolean;
};

type Props = {
    roles: RoleRow[];
    allPermissions: PermissionOption[];
    selectedRoleId: number | null;
};

const ROLE_TONES: Record<string, DomainTone> = {
    super_admin: 'admin',
    'super-admin': 'admin',
    network_owner: 'brand',
    advertiser: 'finance',
    publisher: 'partners',
};
const roleTone = (name: string) => ROLE_TONES[name] ?? toneFromName(name);

const selectedCard: Record<DomainTone, string> = {
    brand: 'border-2 border-brand shadow-[0_0_0_4px_var(--brand-soft)]',
    partners:
        'border-2 border-partners shadow-[0_0_0_4px_var(--partners-soft)]',
    finance: 'border-2 border-finance shadow-[0_0_0_4px_var(--finance-soft)]',
    admin: 'border-2 border-admin shadow-[0_0_0_4px_var(--admin-soft)]',
    analytics:
        'border-2 border-analytics shadow-[0_0_0_4px_var(--analytics-soft)]',
};

const sameSet = (a: (number | string)[], b: (number | string)[]) =>
    a.length === b.length &&
    a.every((id) => b.map(String).includes(String(id)));

/**
 * Remounts the workspace when the server selects another role or the role
 * list changes (after create, rename, save or delete), so the selection and
 * the draft always start from the saved state.
 */
export default function RolesPage(props: Props) {
    const key = `${props.selectedRoleId ?? 'first'}:${props.roles
        .map((role) => `${role.id}-${role.permissions.length}`)
        .join(',')}`;
    return <RolesWorkspace key={key} {...props} />;
}

function RolesWorkspace({ roles, allPermissions, selectedRoleId }: Props) {
    const { t } = useTranslation();
    const panelTitleId = useId();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const initial =
        roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
    const [selectedId, setSelectedId] = useState<number | null>(
        initial?.id ?? null,
    );
    const selected = roles.find((role) => role.id === selectedId) ?? null;
    const [draft, setDraft] = useState<(number | string)[]>(
        initial?.permissions ?? [],
    );
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<{
        open: boolean;
        role: RoleFormTarget;
    }>({ open: false, role: null });
    const dirty = selected ? !sameSet(draft, selected.permissions) : false;
    const name = (role: RoleRow) => t(roleLabel(role.name));
    const permissionTotal = allPermissions.length;

    const select = (role: RoleRow) => {
        const apply = () => {
            setSelectedId(role.id);
            setDraft(role.permissions);
        };
        if (!dirty || role.id === selectedId) return apply();
        confirm({
            title: t('Discard unsaved changes?'),
            description: t(
                'Your permission changes to {{role}} have not been saved.',
                { role: selected ? name(selected) : '' },
            ),
            confirmLabel: t('Discard changes'),
            cancelLabel: t('Keep editing'),
            variant: 'destructive',
            onConfirm: apply,
        });
    };

    const save = () => {
        if (!selected) return;
        router.post(
            system.settings.roles.permissions.sync.url(selected.id),
            { permissions: draft },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );
    };

    const remove = (role: RoleRow) =>
        confirm({
            title: t('Delete role'),
            description: t(
                'Delete the role "{{name}}"? Everyone with this role loses its permissions. This cannot be undone.',
                { name: name(role) },
            ),
            confirmLabel: t('Delete role'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            onConfirm: () =>
                new Promise<void>((resolve) =>
                    router.delete(system.settings.roles.destroy.url(role.id), {
                        preserveScroll: true,
                        onFinish: () => resolve(),
                    }),
                ),
        });

    const counts = useMemo(
        () =>
            new Map(
                roles.map((role) => [
                    role.id,
                    role.id === selectedId
                        ? draft.length
                        : role.permissions.length,
                ]),
            ),
        [roles, selectedId, draft],
    );

    return (
        <AppLayout>
            <Head title={t('Roles & permissions')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Roles & permissions')}
                    description={t(
                        'Choose what each role may see and do across Brand New Day',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Administration'),
                            href: system.settings.roles.url(),
                        },
                        {
                            title: t('Roles'),
                            href: system.settings.roles.url(),
                        },
                    ]}
                    icon={<ShieldCheck />}
                    tone="admin"
                    actions={
                        <>
                            <Button variant="secondary" asChild>
                                <Link href={system.settings.Permissions.url()}>
                                    <KeyRound
                                        className="text-admin"
                                        aria-hidden="true"
                                    />
                                    {t('All permissions')}
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                onClick={() =>
                                    setForm({ open: true, role: null })
                                }
                            >
                                <Plus aria-hidden="true" />
                                {t('New role')}
                            </Button>
                        </>
                    }
                />

                <div className="flex flex-col items-start gap-5 lg:flex-row">
                    <section
                        aria-label={t('Roles')}
                        className="flex w-full flex-col gap-2.5 lg:w-[320px] lg:shrink-0"
                    >
                        {roles.map((role) => {
                            const on = role.id === selectedId;
                            const tone = roleTone(role.name);
                            return (
                                <button
                                    key={role.id}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => select(role)}
                                    className={cn(
                                        'flex min-h-11 w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left text-ink shadow-card transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                        on && selectedCard[tone],
                                        on && 'p-[13px]',
                                    )}
                                >
                                    <IconTile
                                        size={40}
                                        tone={tone}
                                        variant={on ? 'solid' : 'soft'}
                                    >
                                        <ShieldCheck />
                                    </IconTile>
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <strong className="[overflow-wrap:anywhere]">
                                            {name(role)}
                                        </strong>
                                        <span className="text-xs text-ink-muted">
                                            {t('{{count}} users', {
                                                count: role.users_count,
                                            })}
                                            {' · '}
                                            {t('{{count}} permissions', {
                                                count: counts.get(role.id),
                                            })}
                                        </span>
                                    </span>
                                    <ChevronRight
                                        className="size-4 text-ink-muted"
                                        aria-hidden="true"
                                    />
                                </button>
                            );
                        })}
                    </section>

                    {selected ? (
                        <section
                            aria-labelledby={panelTitleId}
                            className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card"
                        >
                            <header className="flex flex-wrap items-center gap-3 border-b border-border px-[22px] py-[18px]">
                                <div className="min-w-[200px] flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2
                                            id={panelTitleId}
                                            className="text-lg font-extrabold [overflow-wrap:anywhere]"
                                        >
                                            {name(selected)}
                                        </h2>
                                        {selected.built_in && (
                                            <StatusBadge
                                                status="neutral"
                                                tone="neutral"
                                                label={t('Built-in')}
                                            />
                                        )}
                                    </div>
                                    <p className="text-[13px] text-ink-muted">
                                        {t('{{count}} users have this role', {
                                            count: selected.users_count,
                                        })}
                                    </p>
                                </div>
                                <InputGroup
                                    className="w-full sm:w-60"
                                    leading={
                                        <Search
                                            className="text-brand"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    <Input
                                        type="search"
                                        aria-label={t('Search permissions')}
                                        placeholder={t('Search permissions')}
                                        value={query}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                    />
                                </InputGroup>
                                {!selected.built_in && (
                                    <>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() =>
                                                setForm({
                                                    open: true,
                                                    role: selected,
                                                })
                                            }
                                        >
                                            <Pencil aria-hidden="true" />
                                            {t('Rename')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="soft"
                                            tone="danger"
                                            onClick={() => remove(selected)}
                                        >
                                            <Trash2 aria-hidden="true" />
                                            {t('Delete role')}
                                        </Button>
                                    </>
                                )}
                            </header>
                            <div className="px-[22px] pt-4 pb-[22px]">
                                <PermissionGrid
                                    permissions={allPermissions}
                                    value={draft}
                                    onValueChange={setDraft}
                                    query={query}
                                />
                            </div>
                            <footer className="flex flex-wrap items-center gap-2.5 border-t border-border bg-surface-muted px-[22px] py-3.5">
                                <p
                                    role="status"
                                    className="mr-auto text-[13px] text-ink-muted"
                                >
                                    {dirty
                                        ? t('Unsaved changes')
                                        : t(
                                              '{{count}} of {{total}} permissions on',
                                              {
                                                  count: draft.length,
                                                  total: permissionTotal,
                                              },
                                          )}
                                </p>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={!dirty || saving}
                                    onClick={() =>
                                        setDraft(selected.permissions)
                                    }
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    disabled={!dirty || saving}
                                    onClick={save}
                                >
                                    {t('Save permissions')}
                                </Button>
                            </footer>
                        </section>
                    ) : (
                        <EmptyState
                            className="flex-1"
                            icon={<ShieldCheck />}
                            tone="admin"
                            title={t('No roles yet')}
                            description={t(
                                'Create a role to group permissions for your team.',
                            )}
                        />
                    )}
                </div>

                {form.open && (
                    <RoleFormModal
                        open
                        role={form.role}
                        allPermissions={allPermissions}
                        onClose={() => setForm({ open: false, role: null })}
                    />
                )}
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
