import { ResourceDirectory } from '@/components/resource-directory';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
    DateRange,
    TQueryFieldProps,
    TSearchToolProps,
    TTableReusableComponent,
} from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Table as TableType, flexRender } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Separator } from '@radix-ui/react-separator';
import {
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    ArrowRightIcon,
    ChevronDownIcon,
    ListFilter,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ReusablePagination, TableComponentHeadings } from './core';

export const DataTable = ({
    showPagination,
    onPageChange = () => undefined,
    pageCount = 1,
    isLoading,
    // pageSize,
    onClick,
    isError,
    table,
    page = 1,
}: { table: TableType<any> } & Pick<
    TTableReusableComponent,
    | 'showPagination'
    | 'onPageChange'
    | 'pageCount'
    | 'pageSize'
    | 'isLoading'
    | 'onClick'
    | 'isError'
> &
    Required<Pick<TTableReusableComponent, 'page'>>) => {
    const { t } = useTranslation();
    return (
        <div className="w-full overflow-hidden rounded-xl border bg-card">
            <Table className="px-6 py-2">
                <TableHeader className="bg-muted/60 select-none">
                    {table.getHeaderGroups().map((headerGroup, index) => (
                        <TableRow
                            key={`table-R-${index}`}
                            className="h-11 overflow-auto text-[12px] leading-5 font-medium"
                        >
                            {headerGroup.headers.map((header, index) => (
                                <TableHead
                                    key={`tableH-${index}`}
                                    className={cn('text-left')}
                                    align={'left'}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody className="px-6 py-5">
                    {isLoading || isError ? (
                        <TableRow>
                            <TableCell
                                colSpan={table.getAllColumns().length}
                                className="h-24 text-center"
                            >
                                {isError ? (
                                    <p
                                        role="alert"
                                        className="text-destructive"
                                    >
                                        {t(
                                            'Unable to load data. Please refresh and try again.',
                                        )}
                                    </p>
                                ) : (
                                    <div
                                        role="status"
                                        className="mx-auto h-3 w-2/3 animate-pulse rounded bg-muted"
                                    >
                                        <span className="sr-only">
                                            {t('Loading')}
                                        </span>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ) : (
                        <>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row, index) => (
                                    <TableRow
                                        key={`tableBody-${index}`}
                                        {...{
                                            ...(onClick
                                                ? {
                                                      onClick: () =>
                                                          onClick(row),
                                                  }
                                                : {}),
                                        }}
                                        className="border-b-1px border-table-border-color h-14 overflow-auto px-6 py-4 pb-1"
                                        data-state={
                                            row.getIsSelected() && 'selected'
                                        }
                                    >
                                        {row
                                            .getVisibleCells()
                                            .map((cell, index) => (
                                                <TableCell
                                                    key={`cell-index-${index}`}
                                                    align={'left'}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={table.getAllColumns().length}
                                        className="h-40 text-center text-muted-foreground"
                                    >
                                        {t('No data to display.')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </>
                    )}
                </TableBody>
            </Table>
            {showPagination && table.getRowModel().rows?.length > 0 ? (
                <div className="flex flex-wrap justify-between gap-3 border-t px-4 py-4">
                    <Button
                        className="flex items-center gap-2"
                        {...{
                            onClick: () =>
                                onPageChange(page > 1 ? page - 1 : page),
                            ...(page <= 1 ? { disabled: true } : {}),
                            variant: 'outline',
                        }}
                    >
                        <ArrowRightIcon
                            {...{
                                svgElementClassName:
                                    'stroke-black hover:stroke-black/2',
                                className: 'w-5 h-5 rotate-180',
                            }}
                        />

                        <p className="text-filter-stroke-color text-sm leading-5 font-semibold">
                            {t('Previous')}
                        </p>
                    </Button>

                    <ReusablePagination
                        {...{ onPageChange, page, pageCount }}
                    />

                    <Button
                        className="flex items-center gap-2"
                        {...{
                            onClick: () =>
                                onPageChange(
                                    page < pageCount ? page + 1 : page,
                                ),
                            variant: 'outline',
                            ...(page >= pageCount ? { disabled: true } : {}),
                        }}
                    >
                        <p className="text-filter-stroke-color text-sm leading-5 font-semibold">
                            {t('Next')}
                        </p>

                        <ArrowRightIcon
                            {...{
                                svgElementClassName:
                                    'stroke-black hover:stroke-black/2',
                                className: 'w-5 h-5',
                            }}
                        />
                    </Button>
                </div>
            ) : null}
        </div>
    );
};

export const CustomBaseTable = <T,>({
    presentation = 'table',
    onRowSelectionChange,
    showPagination = false,
    OtherToolsProps,
    onPageChange,
    rowSelection,
    // setPageSize,
    OtherTools,
    pageCount = 1,
    isLoading,
    pageSize = 25,
    columns,
    isError,
    onClick,
    page = 1,
    data,
    title,
}: TTableReusableComponent<T>) => {
    const { url } = usePage();
    const [internalPage, setInternalPage] = useState(page);
    const [pathname, queryString = ''] = url.split('?');
    const existingParams = useMemo(
        () => Object.fromEntries(new URLSearchParams(queryString).entries()),
        [queryString],
    );

    useEffect(() => {
        setInternalPage(page);
    }, [page]);

    const handlePageChange = useCallback(
        (nextPage: number) => {
            const resolvedPage = Math.min(
                Math.max(1, nextPage),
                Math.max(1, pageCount),
            );
            setInternalPage(resolvedPage);
            onPageChange(resolvedPage);

            if (!showPagination) {
                return;
            }

            router.get(
                pathname,
                {
                    ...existingParams,
                    page: resolvedPage,
                    pageSize,
                },
                {
                    preserveState: false,
                    preserveScroll: true,
                    replace: true,
                },
            );
        },
        [
            existingParams,
            onPageChange,
            pageCount,
            pageSize,
            pathname,
            showPagination,
        ],
    );

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        getFilteredRowModel: getFilteredRowModel(),

        getCoreRowModel: getCoreRowModel(),
        ...(onRowSelectionChange
            ? {
                  onRowSelectionChange,
              }
            : {}),
        columns,
        data,
        state: {
            ...(rowSelection ? { rowSelection } : {}),
        },
    });
    if (presentation === 'cards') return <ResourceDirectory table={table} title={title} page={internalPage} pageCount={pageCount} onPageChange={handlePageChange} isLoading={isLoading} isError={isError} />;
    return (
        <div className="md:col-span-6">
            {(title || OtherTools) && (
                <TableComponentHeadings>
                    <div className="flex w-full flex-wrap items-center justify-between gap-6">
                        {title && (
                            <div className="text-label-text text-md md:text-md py-3 leading-7 font-semibold tracking-[-.5%] capitalize">
                                {title}
                            </div>
                        )}
                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                            {OtherTools && (
                                <div className="w-full sm:w-fit">
                                    <OtherTools
                                        {...{
                                            ...(OtherToolsProps ?? {}),
                                            onChange:
                                                OtherToolsProps?.onChange ??
                                                ((data: any) =>
                                                    console.log(data)),
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </TableComponentHeadings>
            )}
            <DataTable
                key={`${url}|${page}|${pageCount}|${data?.length ?? 0}`}
                {...{
                    pagination: showPagination,
                    showPagination,
                    onPageChange: handlePageChange,
                    pageCount,
                    isLoading,
                    pageSize,
                    isError,
                    onClick,
                    table,
                    page: internalPage,
                }}
            />
        </div>
    );
};

export const SearchTools = ({
    className = '',
    placeholder = 'Search',
    includeFilter = false,
    advancedHandler,
    onChange,
}: TSearchToolProps) => {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <ProductQueryField {...{ onChange, placeholder, className }} />
            {includeFilter && <ReuseableDateFilters {...{ advancedHandler }} />}
        </div>
    );
};

export const ProductQueryField = ({
    className = '',
    placeholder,
    onChange,
}: TQueryFieldProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative min-w-0">
            <Input
                className={cn('h-10 w-full pl-10 sm:w-64', className)}
                {...{
                    onChange: (e) => onChange(e.currentTarget.value.trim()),
                    ref: inputRef,
                    placeholder,
                    type: 'text',
                }}
            />
            <SearchIcon
                className="absolute top-[calc(calc(100%-1rem)/2)] left-4 h-4 w-4 cursor-pointer stroke-gray-400"
                {...{
                    onClick: () => inputRef.current?.focus(),
                }}
            />
        </div>
    );
};

export const ReusableFilterButton = ({
    advancedHandler,
}: Partial<Pick<TSearchToolProps, 'advancedHandler'>>) => {
    const { t } = useTranslation();
    return (
        <div className="flex h-8 w-28 cursor-pointer items-center gap-2 rounded-[8px] border border-neutral-300 bg-neutral-100 px-3 py-1 select-none">
            <ListFilter className="size-6" />
            <p className="text-sm leading-4 font-medium text-gray-600">
                {t('Filter')}
            </p>
            <Separator
                className="my-4 h-4 w-4 bg-gray-300"
                {...{
                    orientation: 'vertical',
                }}
            />
            <XIcon className="size-6" />
        </div>
    );
};

export const ReuseableDateFilters = ({
    advancedHandler,
}: Partial<Pick<TSearchToolProps, 'advancedHandler'>>) => {
    const { t } = useTranslation();
    const [range, setRange] = React.useState<DateRange>();
    React.useEffect(() => {
        if (!advancedHandler) return;
        (
            advancedHandler as (data: {
                startDate?: string;
                endDate?: string;
            }) => void
        )({
            startDate: range?.from
                ? format(range.from, 'yyyy-MM-dd')
                : undefined,
            endDate: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
        });
    }, [range, advancedHandler]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-8 w-fit justify-between text-left font-normal"
                >
                    {range?.from ? (
                        range.to ? (
                            `${format(range.from, 'PPP')} – ${format(
                                range.to,
                                'PPP',
                            )}`
                        ) : (
                            format(range.from, 'PPP')
                        )
                    ) : (
                        <span className="text-muted-foreground">
                            {t('selectRange')}
                        </span>
                    )}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    selected={range as any}
                    onSelect={setRange}
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    );
};
