/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomDialogComponent, ReusablePageTitle, ReusableTabComponent } from '@/dev/core'
import { useCustomDialogContextFactory, useDebounce } from '@/hooks'
import AppLayout from '@/layouts/app-layout'
import applications from '@/routes/applications'
import { 
    ApplicationData, 
    ApplicationsPageProps, 
    BreadcrumbItem, 
    SingleActionsHandler, 
    TFilterOptions, 
    TPaginationFilters 
} from '@/types'
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants'
import { Head, router, usePage } from '@inertiajs/react'
import { useReducer, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import RejectApplicationModal from './modals/reject'
import { ReviewApplicationTabs } from '@/dev/tabs'

const ApplicationsPage = () => {
    const { t } = useTranslation();
    const { applications: initialApplications, currentStatus } = usePage<ApplicationsPageProps>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Publisher Applications'),
            href: applications.index.url(),
        },
    ];

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );

    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            application?: ApplicationData,
        }>();

    const handleStatusFilter = (status: string) => {
        if (status === currentStatus) return;
        router.get(applications.index.url(), { status }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const ActionsHandlerMapping: SingleActionsHandler<ApplicationData>[] = [
        {
            label: t('View Details'),
            onSelect: (data: any) => {
                router.visit(applications.show.url(data.id));
            },
        },
        {
            label: t('Approve'),
            onSelect: (data: any) => {
                router.visit(applications.show.url(data.id));
            },
            conditional: (data: any) => data.status === 'P',
        },
        {
            label: t('Reject'),
            onSelect: (data: any) => {
                handleDialogContextSwitch({
                    Component: RejectApplicationModal,
                    componentProps: {
                        application: data,
                    },
                });
            },
            conditional: (data: any) => data.status === 'P',
        },
    ];

    const translatedTabs = useMemo(() => {
        return ReviewApplicationTabs.map(tab => ({
            ...tab,
            title: t(tab.title)
        }));
    }, [t]);

    return (
        <AppLayout>
            <Head title={t("Publisher Applications")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Publisher Applications")}
                    description={t("Review and manage publisher campaign applications")}
                    breadcrumbs={breadcrumbs}
                />
                
                <ReusableTabComponent
                    key={currentStatus}
                    defaultTab={currentStatus}
                    tabs={translatedTabs}
                    tabProps={{
                        applications: initialApplications,
                        PageFilter: PageFilter,
                        optionsDispatcher: optionsDispatcher,
                        optionsDispatcherDebounce: optionsDispatcherDebounce,
                        ActionsHandlerMapping: ActionsHandlerMapping,
                        handleStatusFilter: handleStatusFilter
                    }}
                    onTabChange={handleStatusFilter}
                />

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className='sm:max-w-[500px]'>
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
    );
};

export default ApplicationsPage;
