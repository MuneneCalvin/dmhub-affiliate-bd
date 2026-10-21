/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button'
import { ActionColumn, MyCreativesColumns } from '@/dev/columns/columns'
import { CustomDialogComponent, ReusablePageTitle, useConfirmationDialog } from '@/dev/core'
import { CustomBaseTable, SearchTools } from '@/dev/table'
import { useCustomDialogContextFactory, useDebounce } from '@/hooks'
import AppLayout from '@/layouts/app-layout'
import advertiser from '@/routes/advertiser'
import { BreadcrumbItem, SingleActionsHandler, TFilterOptions, TPaginationFilters } from '@/types'
import { FILTEROPTIONS, ReusableReducer } from '@/utils/constants'
import { Head, router, usePage } from '@inertiajs/react'
import { Plus } from 'lucide-react'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
const CreativesIndex = () => {
    const { t } = useTranslation();
    const {creatives} = usePage<any>().props;
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const [PageFilter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            creatives?: any,
        }>();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Creatives'),
            href: advertiser.creatives.index.url(),
        }
    ];
    const ActionsHandlerMapping: SingleActionsHandler<any>[] = [
        {
            label: t('View Codes'),
            onSelect: (data: any) => {
                router.visit(`/advertiser/creatives/show/${data?.id}`)
            }
        },
        {
            label: t('Edit'),
            onSelect: (data: any) => {
                router.visit(advertiser.creatives.edit(data?.id))
            }
        },
        {
            label: t('Delete'),
            onSelect: (data: any) => {
                confirm({
                    title: t('Delete Creative'),
                    description: t('Are you sure you want to delete this creative?'),
                    confirmLabel: t('Delete'),
                    cancelLabel: t('Cancel'),
                    variant: 'destructive',
                    onConfirm: () => {
                        router.delete(`/advertiser/creatives/delete/${data.id}`);
                    },
                });
            }
        }
    ];
    return (
        <AppLayout>
            <Head title={t("Creatives")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Creatives")}
                    description={t("Manage creatives here")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-4">
                            <Button
                                className="rounded-xl px-4 py-2 cursor-pointer bg-gray-800 dark:bg-gray-200 dark:text-gray-800"
                                onClick={() =>
                                    router.visit(advertiser.creatives.create.url())
                                }>
                                <Plus size="medium" />
                                <p className="font-medium leading-6 text-lg">
                                    {t('Add Creatives')}
                                </p>
                            </Button>
                        </div>
                    } />
                <div className='w-full'>
                    <CustomBaseTable
                        {...{
                            onPageChange: (page) =>
                                optionsDispatcher({
                                    payload: { page },
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
                                ...MyCreativesColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools:SearchTools,
                            data: creatives?.data ?? [],
                            pageCount: creatives?.last_page ?? 1,
                            title: t('Creatives'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: creatives?.per_page,
                            page: creatives?.current_page,
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
    )
}

export default CreativesIndex