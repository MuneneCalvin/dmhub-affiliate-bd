/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { ActionColumn, RolesColumns } from '@/dev/columns/columns';
import { CustomDialogComponent, ReusablePageTitle, useConfirmationDialog } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import { roles } from '@/routes/system/settings';
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters, TPermissions, TRoles } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import RoleFormModal from './modals/role-form';


const Roles_page = () => {
    const { t } = useTranslation();
    const { data, allPermissions } = usePage<TRoles>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );

    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            role?: TRoles;
            allPermissions?: TPermissions[];
            isEdit?: boolean;
        }>();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('System Management'),
            href: '',
        },
        {
            title: t('Roles'),
            href: roles().url,
        },
    ];

    const handleCreateRole = () => {
        handleDialogContextSwitch({
            Component: RoleFormModal,
            componentProps: {
                allPermissions: allPermissions || [],
                isEdit: false,
            },
        });
    };

    const handleEditRole = async (role: TRoles) => {
        try {
            const response = await fetch(`/system/settings/role/${role.id}`);
            const data = await response.json();
            handleDialogContextSwitch({
                Component: RoleFormModal,
                componentProps: {
                    role: data.role,
                    allPermissions: data.allPermissions,
                    isEdit: true,
                },
            });
        } catch (error) {
            console.error('Failed to fetch role details:', error);
        }
    };

    const handleDeleteRole = (role: TRoles) => {
        confirm({
            title: t('Delete Role'),
            description: t('Are you sure you want to delete the role "{{name}}"? This action cannot be undone. All users with this role will lose the associated permissions.', { name: role.name }),
            confirmLabel: t('Delete'),
            cancelLabel: t('Cancel'),
            variant: 'destructive',
            onConfirm: () => {
                return new Promise<void>((resolve) => {
                    router.delete(`/system/settings/role/${role.id}`, {
                        preserveScroll: true,
                        onFinish: () => resolve(),
                    });
                });
            },
        });
    };

    const handleManagePermissions = async (role: TRoles) => {
        try {
            const response = await fetch(`/system/settings/role/${role.id}/permissions`);
            const data = await response.json();
            handleDialogContextSwitch({
                Component: RoleFormModal,
                componentProps: {
                    role: { ...data.role, permissions: data.role.permissions },
                    allPermissions: data.allPermissions,
                    isEdit: true,
                },
            });
        } catch (error) {
            console.error('Failed to fetch role permissions:', error);
        }
    };

    const ActionsHandlerMapping: SingleActionsHandler<TRoles>[] = [
        {
            label: t('Edit Role'),
            onSelect: handleEditRole,
        },
        {
            label: t('Permissions'),
            onSelect: handleManagePermissions,
        },
        {
            label: t('Delete Role'),
            onSelect: handleDeleteRole,
            conditional: (role: TRoles) => role.name !== 'super-admin',
        },
    ];

    return (
        <AppLayout>
            <Head title={t("Roles")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Roles")}
                    description={t("Manage user roles and access permissions")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button onClick={handleCreateRole}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t("Create Role")}
                        </Button>
                    }
                />
                <div className='w-full'>
                    <CustomBaseTable
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: {
                                        page,
                                    },
                                    type: 'page',
                                }),
                            OtherToolsProps: {
                                onChange: (data: any) =>
                                    optionsDispatcherDebounce({
                                        payload: { term: data },
                                        type: 'term',
                                    }),
                                placeholder: t('Search'),
                                includeFilter: true,
                            },
                            columns: [
                                ...RolesColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            data: data?.results ?? [],
                            pageCount: data?.pageCount ?? 1,
                            title: t('Roles'),
                            OtherTools: SearchTools,
                            showPagination: true,
                            setPageSize: (page) =>
                                optionsDispatcher({
                                    payload: {
                                        page,
                                    },
                                    type: 'page',
                                }),
                            pageSize: filter?.pageSize,
                            page: filter?.page,
                        }}
                    />
                </div>

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className='sm:max-w-[700px]'>
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>

                <ConfirmDialog />
            </div>
        </AppLayout>
    );
};

export default Roles_page;
