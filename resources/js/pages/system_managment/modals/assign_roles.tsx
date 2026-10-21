/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { ReusableCheckbox } from '@/dev/core';
import system from '@/routes/system';
import { TRoles } from '@/types';
import { router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const AssignRoles: React.FC<any> = ({
    componentProps,
    handleDialogContextSwitch,
}) => {
    const { t } = useTranslation();
    const { roles } = usePage<{ roles: TRoles[] }>().props;

    const [selectedRole, setSelectedRole] = useState<number | null>(
        componentProps.user.role_id ?? null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRoleToggle = (roleId: number) => {
        setSelectedRole((prev) => (prev === roleId ? null : roleId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole) return;

        setIsSubmitting(true);

        router.post(
            system.settings.users.assign.roles(componentProps.user.id),
            {
                role_id: selectedRole,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => handleDialogContextSwitch({ open: false }),
            }
        );
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-1.5 mb-6">
                <h1 className="font-bold text-2xl">
                    {t('Assign Role to')} - {componentProps.user.first_name}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="h-auto overflow-y-auto border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {roles.map((role) => (
                            <ReusableCheckbox
                                key={role.id}
                                id={`role-${role.id}`}
                                label={role.name}
                                checked={selectedRole === Number(role.id)}
                                onChange={() => handleRoleToggle(Number(role.id))}
                            />
                        ))}
                    </div>

                    {roles.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                            {t('No roles found')}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between w-full gap-12">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogContextSwitch({ open: false })}
                        disabled={isSubmitting}
                    >
                        {t('Cancel')}
                    </Button>

                    <Button type="submit" disabled={isSubmitting || !selectedRole}>
                        {isSubmitting ? t('Saving...') : t('Assign Role')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AssignRoles;
