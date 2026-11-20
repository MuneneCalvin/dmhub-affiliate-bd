import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { roleLabel } from '@/lib/permissions';
import system from '@/routes/system';
import { router, usePage } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type RoleOption = { id: number; name: string };
type AssignTarget = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    roles?: RoleOption[];
};

/**
 * Adds one role to a user (the server keeps the roles they already have).
 * Rendered inside the system users page dialog.
 */
export default function AssignRoles({
    componentProps,
    handleDialogContextSwitch,
}: {
    componentProps: { user: AssignTarget };
    handleDialogContextSwitch: (context: { open?: boolean }) => void;
}) {
    const { t } = useTranslation();
    const { roles } = usePage<{ roles: RoleOption[] }>().props;
    const user = componentProps.user;
    const assigned = new Set((user.roles ?? []).map((role) => role.id));
    const [selected, setSelected] = useState<string>('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const name =
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.email ||
        '';
    const close = () => handleDialogContextSwitch({ open: false });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!selected) {
            setError(t('Choose a role to assign.'));
            return;
        }
        router.post(
            system.settings.users.assign.roles.url(user.id),
            { role_id: Number(selected) },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (errors) => setError(errors.role_id ?? ''),
                onSuccess: close,
            },
        );
    };

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <DialogHeader icon={<KeyRound />} tone="admin">
                <DialogTitle>
                    {t('Assign a role to {{name}}', { name })}
                </DialogTitle>
                <DialogDescription>
                    {t(
                        'The role is added to the roles they already have. Their menu updates the next time they load a page.',
                    )}
                </DialogDescription>
            </DialogHeader>
            {roles.length ? (
                <RadioCardGroup
                    name="role_id"
                    label={t('Role')}
                    value={selected}
                    onValueChange={(value) => {
                        setSelected(value);
                        setError('');
                    }}
                >
                    {roles.map((role) => (
                        <RadioCard
                            key={role.id}
                            value={String(role.id)}
                            title={t(roleLabel(role.name))}
                            hint={
                                assigned.has(role.id)
                                    ? t('Already assigned')
                                    : undefined
                            }
                            tone="admin"
                            disabled={assigned.has(role.id)}
                        />
                    ))}
                </RadioCardGroup>
            ) : (
                <p className="text-sm text-ink-muted">{t('No roles found')}</p>
            )}
            {error && (
                <p className="text-[13px] font-semibold text-danger-ink">
                    {error}
                </p>
            )}
            <DialogFooter>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={close}
                    disabled={processing}
                >
                    {t('Cancel')}
                </Button>
                <Button type="submit" disabled={processing}>
                    {t('Assign role')}
                </Button>
            </DialogFooter>
        </form>
    );
}
