/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import AppLayout from "@/layouts/app-layout";
import { Head, router, usePage } from "@inertiajs/react";
import {
    Download,
} from "lucide-react";
import { useReducer } from "react";
import { useTranslation } from "react-i18next";
import { ReusablePageTitle, StatCard } from "@/dev/core";
import { BreadcrumbItem, Lead, LeadsIndexProps, SingleActionsHandler, TFilterOptions, TPaginationFilters } from "@/types";
import { CustomBaseTable, SearchTools } from "@/dev/table";
import { FILTEROPTIONS, ReusableReducer } from "@/utils/constants";
import { useDebounce } from "@/hooks";
import { ActionColumn, LeadsColumns } from "@/dev/columns/columns";
import advertiser from "@/routes/advertiser";

const LeadsIndex = () => {
    const { t } = useTranslation();
    const { leads, stats } = usePage<any>().props as LeadsIndexProps;

    const [filter, optionsDispatcher] = useReducer(
        ReusableReducer<TPaginationFilters & TFilterOptions>,
        { ...FILTEROPTIONS, page: 1, pageSize: 25 }
    );
    const optionsDispatcherDebounce = useDebounce({
        debounceCallback: optionsDispatcher,
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t("Leads"), href: "/leads/index" },
    ];

    const handleExport = () => {
        window.location.href = advertiser.leads.export.url();
    };

    const ActionsHandlerMapping: SingleActionsHandler<Lead>[] = [
        {
            label: t('View'),
            onSelect: (data) => {
                router.visit(advertiser.leads.show(data?.id))
            }
        }
    ]
    return (
        <AppLayout>
            <Head title={t("Leads CRM")} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Leads")}
                    description={t("Manage and track your leads")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <Button onClick={handleExport} variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            {t("Export Excel")}
                        </Button>
                    } />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard
                        title={t("Total Leads")}
                        value={stats?.total || 0}
                    />
                    <StatCard
                        title={t("New")}
                        value={stats?.new || 0}
                        titleClassName="text-blue-500"
                        valueClassName="text-blue-600"
                    />

                    <StatCard
                        title={t("Contacted")}
                        value={stats?.contacted || 0}
                        titleClassName="text-yellow-500"
                        valueClassName="text-yellow-600"
                    />

                    <StatCard
                        title={t("Qualified")}
                        value={stats?.qualified || 0}
                        titleClassName="text-purple-500"
                        valueClassName="text-purple-600"
                    />
                    <StatCard
                        title={t("Converted")}
                        value={stats?.converted || 0}
                        titleClassName="text-green-500"
                        valueClassName="text-green-600"
                    />
                </div>
                <div className="w-full">
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
                                ...LeadsColumns,
                                ActionColumn({ ActionsHandlerMapping }),
                            ],
                            OtherTools: SearchTools,
                            data: leads?.data ?? [],
                            pageCount: leads?.last_page ?? 1,
                            title: t('Leads'),
                            showPagination: true,
                            setPageSize: (pageSize) =>
                                optionsDispatcher({
                                    payload: { pageSize },
                                    type: 'pageSize',
                                }),
                            pageSize: leads?.per_page ?? 25,
                            page: leads?.current_page ?? 1,
                        }}
                    />
                </div>
            </div>
        </AppLayout>
    );
};

export default LeadsIndex;
