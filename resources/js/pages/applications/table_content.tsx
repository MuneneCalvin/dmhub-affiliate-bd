/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionColumn, ApplicationsColumns } from '@/dev/columns/columns'
import { CustomBaseTable, SearchTools } from '@/dev/table'
import { ApplicationData, SingleActionsHandler } from '@/types'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ApplicationTableContentProps {
    applications: {
        data: ApplicationData[];
        last_page: number;
    } | null;
    PageFilter: any;
    optionsDispatcher: (action: any) => void;
    optionsDispatcherDebounce: (action: any) => void;
    ActionsHandlerMapping: SingleActionsHandler<ApplicationData>[];
    handleStatusFilter: (status: string) => void;
    tab: string;
}

const ApplicationTableContent = ({
    applications,
    PageFilter,
    optionsDispatcher,
    optionsDispatcherDebounce,
    ActionsHandlerMapping,
    handleStatusFilter,
    tab,
}: ApplicationTableContentProps) => {
    const { t } = useTranslation();

    useEffect(() => {
        if (tab) {
            handleStatusFilter(tab);
        }
    }, [tab, handleStatusFilter]);

    return (
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
                        ...ApplicationsColumns,
                        ActionColumn({ ActionsHandlerMapping }),
                    ],
                    OtherTools: SearchTools,
                    data: applications?.data ?? [],
                    pageCount: applications?.last_page ?? 1,
                    title: t('Applications'),
                    showPagination: true,
                    setPageSize: (pageSize) =>
                        optionsDispatcher({
                            payload: { pageSize },
                            type: 'pageSize',
                        }),
                    pageSize: PageFilter?.pageSize,
                    page: PageFilter?.page,
                }}
            />
        </div>
    );
};

export default ApplicationTableContent;
