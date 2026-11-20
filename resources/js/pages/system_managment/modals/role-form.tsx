import {
    FormField,
    PermissionGrid,
    type PermissionOption,
} from '@/components/app';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input, InputGroup } from '@/components/ui/input';
import system from '@/routes/system';
import { router } from '@inertiajs/react';
import { Search, ShieldPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export type RoleFormTarget = { id: number; name: string } | null;

/**
 * Create a role (name + permissions) or rename an existing one. Permissions
 * of an existing role are edited in the grid on the page, not here.
 */
export default function RoleFormModal({
    open,
    role,
    allPermissions,
    onClose,
}: {
    open: boolean;
    /** The role to rename; null creates a new role. */
    role: RoleFormTarget;
    allPermissions: PermissionOption[];
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const editing = role !== null;
    const [name, setName] = useState(role?.name ?? '');
    const [permissions, setPermissions] = useState<(number | string)[]>([]);
    const [query, setQuery] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            setErrors({ name: t('Enter a role name.') });
            document.getElementById('role-name')?.focus();
            return;
        }
        const options = {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onError: (next: Record<string, string>) => setErrors(next),
            onSuccess: () => onClose(),
        };
        if (editing) {
            router.put(
                system.settings.roles.update.url(role.id),
                { name: name.trim() },
                options,
            );
        } else {
            router.post(
                system.settings.roles.store.url(),
                { name: name.trim(), permissions },
                options,
            );
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => !next && !processing && onClose()}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
                <form
                    onSubmit={submit}
                    noValidate
                    className="flex flex-col gap-5"
                >
                    <DialogHeader icon={<ShieldPlus />} tone="admin">
                        <DialogTitle>
                            {editing ? t('Rename role') : t('New role')}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? t(
                                      'The new name applies to everyone who has this role.',
                                  )
                                : t(
                                      'Name the role and choose what people with it may do.',
                                  )}
                        </DialogDescription>
                    </DialogHeader>
                    <FormField
                        id="role-name"
                        label={t('Role name')}
                        error={errors.name}
                    >
                        <Input
                            id="role-name"
                            required
                            maxLength={255}
                            autoFocus
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </FormField>
                    {!editing && (
                        <fieldset className="flex flex-col gap-3">
                            <legend className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-bold">
                                <span>{t('Permissions')}</span>
                                <span className="text-xs font-semibold text-ink-muted tabular-nums">
                                    {t('{{count}} selected', {
                                        count: permissions.length,
                                    })}
                                </span>
                            </legend>
                            <InputGroup
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
                            <PermissionGrid
                                permissions={allPermissions}
                                value={permissions}
                                onValueChange={setPermissions}
                                query={query}
                            />
                            {errors.permissions && (
                                <p className="text-[13px] font-semibold text-danger-ink">
                                    {errors.permissions}
                                </p>
                            )}
                        </fieldset>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={processing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {editing ? t('Save name') : t('Create role')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
