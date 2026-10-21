import { ActionColumn, SystemUsersColumns } from '@/dev/columns/columns';
import { CustomDialogComponent, ReusablePageTitle } from '@/dev/core';
import { CustomBaseTable, SearchTools } from '@/dev/table';
import { useCustomDialogContextFactory, useDebounce } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import system from '@/routes/system';
import { BreadcrumbItem, SingleActionsHandler, SystemUser, User } from '@/types';
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants';
import { Head, router, usePage } from '@inertiajs/react';
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next';
import AssignRoles from './modals/assign_roles';

const SystemUsers = () => {
    const { t } = useTranslation();
    const { users } = usePage<{ users: SystemUser['users'] }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('System'),
            href: system.settings.users.url(),
        },
        {
            title: t('System Users'),
            href: '',
        },
    ];

    const [, optionsDispatcher] = useReducer(
        ReusableReducer,
        { ...FILTEROPTIONS, page: 1, pageSize: 10 }
    );

    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            users?: User,
        }>();

    const handleActivate = (user: User) => {
        router.patch(system.settings.users.activate.url(Number(user.id)), {}, {
            preserveScroll: true,
        });
    };
    const handleAssignRoles = (user: User) => {
        handleDialogContextSwitch({
            Component: AssignRoles,
            componentProps: {
                user: user || [],
            },
        });
    };

    const handleDeactivate = (user: User) => {
        router.patch(system.settings.users.deactivate.url(Number(user.id)), {}, {
            preserveScroll: true,
        });
    };

    const ActionsHandlerMapping: SingleActionsHandler<User>[] = [
        {
            label: t('Activate'),
            onSelect: handleActivate,
            conditional: (user) => user.status !== 'A',
        },
        {
            label: t('Deactivate'),
            onSelect: handleDeactivate,
            conditional: (user) => user.status === 'A',
        },
         {
            label: t('Assign Roles'),
            onSelect: handleAssignRoles,
            conditional: (user) => user.status === 'A',
        },
    ];

    return (
        <AppLayout>
            <Head title={t("System Users")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("System Users")}
                    description={t('Manage System Users here')}
                    breadcrumbs={breadcrumbs}/>
                <div className='w-full'>
                    <CustomBaseTable
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: { page },
                                    type: 'page',
                                }),
                            OtherToolsProps: {
                                onChange: (data: string) =>
                                    optionsDispatcherDebounce({
                                        payload: { term: data },
                                        type: 'term',
                                    }),
                                placeholder: t('Search'),
                                includeFilter: true,
                            },
                            columns: [
                                ...SystemUsersColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools:SearchTools,
                            data: users?.data ?? [],
                            pageCount: users?.last_page ?? 1,
                            title: t('System Users'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: users?.per_page,
                            page: users?.current_page,
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
            </div>
        </AppLayout>
    )
}

export default SystemUsers;