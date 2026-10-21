/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { DateRange, TQueryFieldProps, TSearchToolProps, TTableReusableComponent } from "@/types";
import { Table as TableType, flexRender } from '@tanstack/react-table';
import { router, usePage } from "@inertiajs/react";

import { getCoreRowModel, getFilteredRowModel, useReactTable, } from '@tanstack/react-table';
import { ReusablePagination, TableComponentHeadings } from "./core";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, ChevronDownIcon, ListFilter, SearchIcon, XIcon } from "lucide-react";
import { Separator } from "@radix-ui/react-separator";
import { Input } from "@/components/ui/input";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

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
        <div className='w-full shadow rounded-xl border overflow-clip'>
            <Table className='px-6 py-2'>
                <TableHeader className='select-none rounded-[8px] border'>
                    {table.getHeaderGroups().map((headerGroup, index) => (
                        <TableRow
                            key={`table-R-${index}`}
                            className='h-11 overflow-auto font-medium text-[12px] leading-5'>
                            {headerGroup.headers.map((header, index) => (
                                <TableHead
                                    key={`tableH-${index}`}
                                    className={cn('text-left')}
                                    align={'left'}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody className='px-6 py-5 select-none'>
                    {isLoading || isError ? (
                        <TableRow>
                            <TableCell
                                colSpan={table.getAllColumns().length}
                                className='h-24 text-center'>
                                {/* <CustomLoader
									{...{
										...(isError ? { title: 'Error fetching data.' } : {}),
									}}
								/> */}
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
                                                    onClick: () => onClick(row),
                                                }
                                                : {}),
                                        }}
                                        className='h-14 overflow-auto pb-1 border-b-1px border-table-border-color px-6 py-4'
                                        data-state={row.getIsSelected() && 'selected'}>
                                        {row.getVisibleCells().map((cell, index) => (
                                            <TableCell key={`cell-index-${index}`} align={'left'}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={table.getAllColumns().length}
                                        className='h-24 text-center'>
                                        {t('No data to display.')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </>
                    )}
                </TableBody>
            </Table>
            {showPagination && table.getRowModel().rows?.length > 0 ? (
                <div className='flex gap-5 justify-between p-5'>
                    <Button
                        className='flex gap-2 items-center'
                        {...{
                            onClick: () => onPageChange(page > 1 ? page - 1 : page),
                            ...(page <= 1 ? { disabled: true } : {}),
                            variant: 'outline',
                        }}>
                        <ArrowRightIcon
                            {...{
                                svgElementClassName: 'stroke-black hover:stroke-black/2',
                                className: 'w-5 h-5 rotate-180',
                            }}
                        />

                        <p className='text-sm font-semibold leading-5 text-filter-stroke-color'>
                            {t('Previous')}
                        </p>
                    </Button>

                    <ReusablePagination {...{ onPageChange, page, pageCount }} />

                    <Button
                        className='flex gap-2 items-center'
                        {...{
                            onClick: () => onPageChange(page < pageCount ? page + 1 : page),
                            variant: 'outline',
                            ...(page >= pageCount ? { disabled: true } : {}),
                        }}>
                        <p className='text-sm font-semibold leading-5 text-filter-stroke-color'>
                            {t('Next')}
                        </p>

                        <ArrowRightIcon
                            {...{
                                svgElementClassName: 'stroke-black hover:stroke-black/2',
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
        [queryString]
    );

    useEffect(() => {
        setInternalPage(page);
    }, [page]);

    const handlePageChange = useCallback(
        (nextPage: number) => {
            const resolvedPage = Math.min(Math.max(1, nextPage), Math.max(1, pageCount));
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
                }
            );
        },
        [existingParams, onPageChange, pageCount, pageSize, pathname, showPagination]
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
    return (
        <div className='md:col-span-6'>
            {(title || OtherTools) && (
                <TableComponentHeadings>
                    <div className='flex justify-between items-center w-full gap-6 flex-wrap'>
                        {title && (
                            <div className='leading-7 text-label-text text-md md:text-md tracking-[-.5%] capitalize  py-3 font-semibold'>
                                {title}
                            </div>
                        )}
                        <div className='flex justify-end gap-2 items-center'>
                            {OtherTools && (
                                <div className='w-fit'>
                                    <OtherTools
                                        {...{
                                            ...(OtherToolsProps ?? {}),
                                            onChange:
                                                OtherToolsProps?.onChange ?? ((data: any) => console.log(data)),
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
    className = 'border-primary',
    placeholder = 'Search',
    includeFilter = false,
    advancedHandler,
    onChange,
}: TSearchToolProps) => {
    return (
        <div className='flex gap-4 items-center select-none'>
            <ProductQueryField {...{ onChange, placeholder, className }} />
            {includeFilter && <ReuseableDateFilters {...{ advancedHandler }} />}
        </div>
    );
};


export const ProductQueryField = ({
    className = 'bg-secondary border-primary',
    placeholder,
    onChange,
}: TQueryFieldProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className='relative'>
            <Input
                className={cn(
                    'rounded-lg w-55 h-8 pl-10 outline-accent border border-accent focus:border-primary focus:outline-primary',
                    className
                )}
                {...{
                    onChange: (e) => onChange(e.currentTarget.value.trim()),
                    ref: inputRef,
                    placeholder,
                    type: 'text',
                }}
            />
            <SearchIcon
                className='absolute h-4 w-4 left-4 top-[calc(calc(100%-1rem)/2)] cursor-pointer stroke-gray-400'
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
        <div className='border border-neutral-300 bg-neutral-100 py-1 px-3 flex gap-2 items-center rounded-[8px] w-28 select-none cursor-pointer h-8'>
            <ListFilter className='size-6' />
            <p className='font-medium text-sm leading-4 text-gray-600'>{t('Filter')}</p>
            <Separator
                className='w-4 h-4 my-4 bg-gray-300'
                {...{
                    orientation: 'vertical',
                }}
            />
            <XIcon className='size-6' />
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
        (advancedHandler as (data: { startDate?: string; endDate?: string }) => void)({
            startDate: range?.from
                ? format(range.from, 'yyyy-MM-dd')
                : undefined,
            endDate: range?.to
                ? format(range.to, 'yyyy-MM-dd')
                : undefined,
        });
    }, [range, advancedHandler]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-8 w-fit justify-between text-left font-normal">
                    {range?.from ? (
                        range.to ? (
                            `${format(range.from, 'PPP')} – ${format(
                                range.to,
                                'PPP'
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
