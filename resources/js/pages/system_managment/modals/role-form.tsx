import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ReusableTextInput, ReusableCheckbox } from '@/dev/core';
import { RoleFormModalProps, TPermissions } from '@/types';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';


const RoleFormModal = ({ componentProps, handleDialogContextSwitch }: RoleFormModalProps) => {
    const { t } = useTranslation();
    const { role, allPermissions, isEdit } = componentProps;

    const initialPermissions = useMemo(() => {
        return role?.permissions?.map((p: TPermissions) => p.id) || [];
    }, [role]);

    const [name, setName] = useState(role?.name || '');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPermissions);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handlePermissionToggle = (permissionId: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSelectAll = () => {
        if (selectedPermissions.length === allPermissions.length) {
            setSelectedPermissions([]);
        } else {
            setSelectedPermissions(allPermissions.map((p: TPermissions) => p.id));
        }
    };

    const filteredPermissions = allPermissions.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = {
            name,
            permissions: selectedPermissions,
        };

        if (isEdit && role?.id) {
            router.put(`/system/settings/role/${role.id}`, data, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    handleDialogContextSwitch({ open: false });
                },
                onFinish: () => setIsSubmitting(false),
            });
        } else {
            router.post('/system/settings/role', data, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    handleDialogContextSwitch({ open: false });
                },
                onFinish: () => setIsSubmitting(false),
            });
        }
    };

    return (
        <div className='w-full'>
            <div className='flex flex-col gap-1.5 mb-6'>
                <h1 className='font-bold text-2xl'>
                    {isEdit
                        ? t('Update the role name and permissions')
                        : t('Create a new role and assign permissions')}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <ReusableTextInput
                    id="name"
                    label={t('Role Name')}
                    value={name}
                    onChange={setName}
                    placeholder={t('Enter role name')}
                    required
                />

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>{t('Permissions')}</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                        >
                            {selectedPermissions.length === allPermissions.length
                                ? t('Deselect All')
                                : t('Select All')}
                        </Button>
                    </div>

                    <ReusableTextInput
                        id="search-permissions"
                        label=""
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={t('Search permissions...')}
                    />
                    <div className="h-auto overflow-y-auto border rounded-md p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredPermissions.map((permission: TPermissions) => (
                                <ReusableCheckbox
                                    key={permission.id}
                                    id={`permission-${permission.id}`}
                                    label={permission.name}
                                    checked={selectedPermissions.includes(permission.id)}
                                    onChange={() => handlePermissionToggle(permission.id)}
                                />
                            ))}
                        </div>
                        {filteredPermissions.length === 0 && (
                            <p className="text-center text-muted-foreground py-4">
                                {t('No permissions found')}
                            </p>
                        )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                        {t('Selected')}: {selectedPermissions.length} / {allPermissions.length}
                    </p>
                </div>

                <div className='flex items-center justify-between w-full gap-12'>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogContextSwitch({ open: false })}
                        disabled={isSubmitting}
                    >
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !name.trim()}>
                        {isSubmitting
                            ? t('Saving...')
                            : isEdit
                                ? t('Update Role')
                                : t('Create Role')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default RoleFormModal;
