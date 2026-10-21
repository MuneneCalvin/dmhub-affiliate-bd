/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-extra-boolean-cast */

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { dashboard } from "@/routes";
import { markAsRead as markAsReadRoute, markAllAsRead as markAllAsReadRoute } from "@/routes/notifications";
import { Link, usePage, router } from "@inertiajs/react";
import React, { Fragment, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    type BreadcrumbItem as BreadcrumbItemType,
    ConfirmationDialogProps,
    InfoCardProps,
    ReusableAlertModalProps,
    ReusableCheckboxProps,
    ReusableCheckBoxGroupProps,
    ReusableDateInputProps,
    ReusableEmailInputProps,
    ReusableFileInputProps,
    ReusableNormalSelectProps,
    ReusableNumberInputProps,
    ReusableSearchMultiSelectProps,
    ReusableSearchSelectProps,
    ReusableSheetProps,
    ReusableTabComponentProps,
    ReusableTextareaProps,
    ReusableTextInputProps,
    SharedData,
    StatCardProps,
    TAvatartTypes,
    TCustomDialogProps,
    TKeyValueStringType,
    TLANG,
    TNodeChildrentType,
    TNotifs,
    TReusableDropdownCheckProp,
    TReusableDropdownProp,
    TReusableModalHeaderProps,
    TReusablePageProps,
    TReusablePopupProps,
    TReusableSelectProp,
    TReusableSelectProps,
    TTableReusableComponent,
    TUseTabsProps,
    UseConfirmationDialogReturn
} from "@/types";
import {
    Bell,
    Check,
    ChevronDown,
    ChevronsUpDown,
    CircleCheckBig,
    CircleUser,
    Copy,
    Download,
    Eye,
    FileIcon,
    FileText,
    Globe,
    Search,
    User,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { VARIANTCOLOR } from "@/utils/enums";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import { useLanguage } from "@/context/language-context";
import {
    Command,
    CommandList,
    CommandGroup,
    CommandItem,
} from "cmdk";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserMenuContent } from "@/components/user-menu-content";

export const BreadCrumbComponent = ({ breadcrumbs }: { breadcrumbs: BreadcrumbItemType[] }) => {
    const { t } = useTranslation();
    return (
        <div className="w-auto">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href={dashboard().url} className="flex items-center gap-1">
                                <p className="capitalize font-medium select-none leading-6">
                                    {t("Dashboard")}
                                </p>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1;
                        return (
                            <Fragment key={index}>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={item.href}>{item.title}</Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
};

export const ReusablePageTitle = ({
    children = null,
    description,
    title,
    breadcrumbs,
}: TReusablePageProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <p className="text-primary font-semibold text-xl leading-8">
                        {title}
                    </p>
                    <p className="font-normal text-base leading-7">
                        {description}
                    </p>
                </div>
                <div className="shrink-0">
                    <BreadCrumbComponent breadcrumbs={breadcrumbs} />
                </div>
            </div>
            {children && <div className="w-fit self-end">{children}</div>}
        </div>
    );
};

export const NavBarLanguageChanger = () => {
    const { currentLocale, setLanguage } = useLanguage();
    const languages: TLANG[] = [
        { code: 'nl', name: 'Dutch' },
        { code: 'en', name: 'English' },
    ];
    const selected = languages.find((l) => l.code === currentLocale) ?? languages[0];
    const onSelect = (lang: TLANG) => {
        setLanguage(lang.code);
    };
    return (
        <div className="w-fit">
            <ReusableDropDownWithCheckComponent<TLANG>
                ActionsHandlerMapping={languages.map((lang) => ({
                    label: lang.name,
                    value: lang,
                    onSelect,
                }))}
                triggerEl={
                    <div className={cn(
                        'w-fit flex justify-between items-center cursor-pointer border-none bg-neutral-100 dark:bg-black h-10 min-w-8 rounded-3xl p-2'
                    )}
                        role="button">
                        <Globe className="size-6" />
                        <span className="mx-2">{selected.name}</span>
                        <ChevronDown />
                    </div>
                }
                className="w-fit"
            />
        </div>
    );
};

export const ReusableDropDownWithCheckComponent = <T = string>({
    ActionsHandlerMapping,
    className = 'w-fit',
    triggerEl,
}: TReusableDropdownCheckProp<T>) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>

            <DropdownMenuContent
                {...{
                    className,
                }}>
                {ActionsHandlerMapping.map(({ label, value, onSelect }, index) => {
                    return (
                        <DropdownMenuCheckboxItem
                            className='w-full'
                            {...{
                                onSelect: () => value && onSelect(value),
                                onCheckedChange: () => value && onSelect(value),
                            }}
                            key={index}>
                            {label}
                        </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const ReusablePopOverComponent = ({
    onOpenChange,
    className = '',
    triggerEl,
    children,
    open,
}: TReusablePopupProps) => {
    return (
        <Popover
            {...{
                ...(onOpenChange ? { onOpenChange } : {}),
                ...(!!open ? { open } : {}),
                modal: true,
            }}>
            <PopoverTrigger asChild {...{}}>
                {triggerEl}
            </PopoverTrigger>
            <PopoverContent
                className={cn('p-0 w-44', className)}
                {...{
                    collisionBoundary: document.querySelector('body'),
                    avoidCollisions: true,
                    collisionPadding: 8,
                    sticky: 'partial',
                    alignOffset: -8,
                    sideOffset: 8,
                    side: 'bottom',
                    align: 'end',
                }}>
                {children}
            </PopoverContent>
        </Popover>
    );
};

export const NavBarNotification = () => {
    const { auth } = usePage<SharedData>().props;
    const userNotifications = React.useMemo(
        () => (auth?.user as any)?.notifications ?? [],
        [auth]
    );
    const { t } = useTranslation();
    const mappedNotifications: TNotifs[] = userNotifications.map((n: any) => ({
        id: n.id,
        message: n.data.message,
        unread: n.read_at === null,
        avatar: n.data.avatar || <CircleUser />,
        color: n.data.color || 'bg-blue-600',
        time: new Date(n.created_at).toLocaleString(),
        type: n.data.type || 'info',
        created_at: n.created_at,
        updated_at: n.updated_at
    }));
    const [notifications, setNotifications] = useState<TNotifs[]>(mappedNotifications);
    useEffect(() => {
        setNotifications(mappedNotifications);
    }, [mappedNotifications]);
    const unreadCount = notifications.filter((n) => n.unread).length;
    const markAsRead = (id: string) => {
        router.post(markAsReadRoute.url({ id }), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setNotifications((prev) =>
                    prev.map((notification) =>
                        notification.id === id
                            ? { ...notification, unread: false }
                            : notification
                    )
                );
            }
        });
    };
    const markAllAsRead = () => {
        router.post(markAllAsReadRoute.url(), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setNotifications((prev) =>
                    prev.map((notification) => ({ ...notification, unread: false }))
                );
            }
        });
    };
    return (
        <div className='relative'>
            <ReusablePopOverComponent
                className='rounded-lg shadow-lg border border-gray-200 divide-y divide-gray-100 w-80'
                {...{
                    triggerEl: (
                        <Button
                            className='relative cursor-pointer inline-flex items-center p-2 text-sm font-medium  transition-colors duration-200 rounded-full w-10 h-10'
                            {...{ variant: 'outline' }}>
                            <Bell />
                            {unreadCount > 0 && (
                                <div className='absolute flex items-center justify-center w-4 h-4 p-2 border-2 border-white bg-primary text-white rounded-full -top-1 -right-1 text-xs font-medium'>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </div>
                            )}
                        </Button>
                    ),
                    children: (
                        <div className='w-full max-h-96 overflow-hidden'>
                            <div className='flex items-center justify-between px-4 py-3 border-b border-slate-200'>
                                <h3 className='font-medium'>{t('Notifications')}</h3>
                                {unreadCount > 0 && (
                                    <Button
                                        onClick={markAllAsRead}
                                        className='text-xs font-medium cursor-pointer'>
                                        {t('Mark all as read')}
                                    </Button>
                                )}
                            </div>
                            <div className='max-h-64 overflow-y-auto p-2'>
                                {notifications.length > 0 ? notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start p-4 transition-colors duration-150 border-b border-slate-100 last:border-b-0 ${notification.unread ? 'bg-primary-50/50' : ''
                                            }`}>
                                        <div className='relative flex-0'>
                                            {notification?.avatar && typeof notification.avatar === 'string' ? (
                                                <img
                                                    className='w-10 h-10 rounded-full object-cover'
                                                    src={notification?.avatar}
                                                    alt='Notification Avatar'
                                                />
                                            ) : (
                                                <CircleUser />
                                            )}
                                        </div>
                                        <div className='ml-3 flex-1 min-w-0'>
                                            <p className='text-sm leading-relaxed'>
                                                {notification?.message}
                                            </p>
                                            <p className='text-xs mt-1'>
                                                {notification?.time}
                                            </p>
                                        </div>
                                        {notification.unread && (
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => markAsRead(notification?.id)}>
                                                <CircleCheckBig className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )) : (
                                    <div className="p-4 text-center text-gray-500">
                                        {t('No notifications')}
                                    </div>
                                )}
                            </div>
                            <div className='px-4 py-3 border-t border-slate-200'>
                                <button className='w-full flex items-center justify-center text-sm font-medium'>
                                    <Eye className='w-4 h-4 mr-2' />
                                    {t('View all notifications')}
                                </button>
                            </div>
                        </div>
                    ),
                }}
            />
        </div>
    );
};

export const EmployeeAvatar = ({ className, alt, url }: TAvatartTypes) => {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user;
    const initials = getInitials(user?.user_name ?? '');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    className={cn(
                        'flex items-center justify-center border-[.8px] border-gray-100 overflow-clip rounded-full select-none cursor-pointer',
                        className ?? ''
                    )}>
                    {url ? (
                        <img src={url} alt={alt} className='w-full h-full object-cover' />
                    ) : initials ? (
                        <p className='text-sm flex items-center justify-center font-semibold'>
                            {initials}
                        </p>
                    ) : (
                        <User className='w-5 h-5 text-gray-500' />
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='w-56' align='end'>
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const TableComponentHeadings = ({ children }: TNodeChildrentType) => {
    return (
        <div className='flex flex-col justify-between items-center w-full gap-6 flex-wrap px-6 py-2.5'>
            {children}
        </div>
    );
};

export const PageForPagination = ({
    active = false,
    content,
    handler,
}: {
    handler: (data: any) => void;
    content: string;
    active?: boolean;
}) => (
    <div className={`rounded-[8px] selection:bg-inherit flex items-center justify-center leading-6 hover:bg-[#F9F5FF] text-[14px] font-medium text-center cursor-pointer w-10 h-10 ${active ? 'bg-[#F9F5FF] text-[#7F56D9]' : 'text-main-orange'
        }`}
        onClick={handler}>
        {content}
    </div>
);

export const ReusablePagination = ({
    onPageChange,
    pageCount,
    page,
}: Pick<TTableReusableComponent, 'onPageChange' | 'pageCount'> &
    Required<Pick<TTableReusableComponent, 'page'>>) => {
    const renderSlidingPages = () => {
        if (pageCount <= 6) {
            return Array.from({ length: pageCount }, (_, index) => ({
                key: `page-${index + 1}`,
                label: `${index + 1}`,
                value: index + 1,
                isEllipsis: false,
            }));
        }

        const leftStart = Math.min(Math.max(page - 1, 1), pageCount - 5);
        const leftPages = [leftStart, leftStart + 1, leftStart + 2];
        const rightPages = [pageCount - 2, pageCount - 1, pageCount];
        const gap = rightPages[0] - leftPages[2];

        const items = [
            ...leftPages.map((value) => ({
                key: `left-${value}`,
                label: `${value}`,
                value,
                isEllipsis: false,
            })),
            ...(gap > 1
                ? [{ key: 'ellipsis', label: '...', value: -1, isEllipsis: true }]
                : []),
            ...rightPages
                .filter((value) => !leftPages.includes(value))
                .map((value) => ({
                    key: `right-${value}`,
                    label: `${value}`,
                    value,
                    isEllipsis: false,
                })),
        ];

        return items;
    };

    const pages = renderSlidingPages();

    return (
        <div className='flex flex-col items-center'>
            <div className='flex items-center justify-center'>
                {pages.map((item) => (
                    <PageForPagination
                        key={item.key}
                        content={item.label}
                        handler={item.isEllipsis ? () => { } : () => onPageChange(item.value)}
                        active={!item.isEllipsis && page === item.value}
                    />
                ))}
            </div>
        </div>
    );
};

export const useTabs = <KeyType extends string>({
    tabs,
    defaultTab,
}: TUseTabsProps<KeyType>) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const switchTab = useCallback((key: KeyType) => setActiveTab(key), []);

    const activeTabComponent = useMemo(
        () => tabs.find((tab) => tab.key === activeTab),
        [activeTab, tabs]
    );

    return {
        tabList: tabs.map(({ title, key }) => ({ title, key })),
        ActiveTabComponent: activeTabComponent?.Tab ?? null,
        activeTab,
        switchTab,
    };
};

export const ReusableTabComponent = <KeyType extends string>({
    Children = () => <></>,
    tabProps = {},
    className = '',
    defaultTab,
    header,
    tabs,
}: ReusableTabComponentProps<KeyType>) => {
    const { activeTab, tabList, ActiveTabComponent, switchTab } =
        useTabs<KeyType>({
            defaultTab,
            tabs,
        });

    const onValueChange = (val: string) => switchTab(val as KeyType);
    return (
        <div className={cn('w-full flex flex-col gap-2')}>
            {header}
            <Tabs
                {...{
                    defaultValue: defaultTab,
                    value: activeTab,
                    onValueChange,
                }}>
                <div className='w-full flex items-center justify-between mb-2'>
                    <TabsList
                        className={cn(
                            'bg-neutral-200 px-1.5 py-2 rounded-xl h-9',
                            className
                        )}>
                        {tabList.map(({ title, key }) => (
                            <TabsTrigger
                                className={cn(
                                    'cursor-pointer rounded-sm px-3 py-1 transition-all duration-200 font-medium leading-5 text-sm h-7',
                                    'data-[state=active]:bg-white data-[state=active]:text-dark-brown data-[state=active]:shadow-sm',
                                    'data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-800'
                                )}
                                {...{ value: key }}
                                key={key}>
                                {title}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {Children && <Children {...tabProps} />}
                </div>

                {ActiveTabComponent && (
                    <TabsContent value={activeTab} className='mt-4'>
                        <ActiveTabComponent
                            {...{
                                ...tabProps,
                                filter: activeTab,
                                tab: activeTab,
                            }}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
};
export const ReusableReportDropdownFilter = ({
    parentClassName = '',
    onValueChange,
    className = '',
    actionsMap,
    triggerEl,
    title,
}: TReusableSelectProps) => {
    return (
        <div className={cn(parentClassName, 'w-full flex flex-col gap-2')}>
            <p className='text-sm font-medium leading-5'>{title}</p>
            <ReusableSelectComponent
                className={cn('w-56', className)}
                {...{
                    onValueChange,
                    actionsMap,
                    triggerEl,
                }}
            />
        </div>
    );
};

export const ReusableSelectComponent = ({
    className = 'w-fit max-w-20',
    onValueChange,
    isLoading = false,
    actionsMap,
    triggerEl,
}: TReusableSelectProp<string>) => (
    <Select {...{ onValueChange }}>
        <SelectTrigger className={cn('w-44', className)}>{triggerEl}</SelectTrigger>

        <SelectContent className={cn(className)}>
            {isLoading ? (
                <SelectItem
                    className='w-full'
                    {...{
                        disabled: isLoading,
                        value: 'loading...',
                        align: 'end',
                    }}>
                    {t('Loading...')}
                </SelectItem>
            ) : Array.isArray(actionsMap) && actionsMap.length > 0 ? (
                actionsMap.map(({ label, value }, index) => (
                    <SelectItem
                        className='w-full'
                        {...{
                            value: value!,
                            align: 'end',
                        }}
                        key={index}>
                        {label}
                    </SelectItem>
                ))
            ) : (
                <SelectItem
                    className='w-full'
                    {...{
                        value: 'no-records',
                        disabled: true,
                        align: 'end',
                    }}>
                    {t('No records found to show')}
                </SelectItem>
            )}
        </SelectContent>
    </Select>
);

export const CustomDialogComponent = <T = TKeyValueStringType>({
    handleDialogContextSwitch,
    dialogOpen,
    className,
    children,
}: Pick<
    TCustomDialogProps<T>,
    'children' | 'dialogOpen' | 'handleDialogContextSwitch' | 'className'
>) => {
    return (
        <Dialog
            {...{
                onOpenChange: () => handleDialogContextSwitch({}),
                open: dialogOpen,
                modal: true,
            }}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className={cn(
                    'select-none max-h-[80dvh] flex flex-col overflow-hidden p-0! m-0!',
                    className ?? ''
                )}>
                <div
                    {...{
                        className: `relative w-full flex-1 h-full overflow-y-auto py-5 px-4`,
                    }}>
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const ReusableDropDownComponent = <T,>({
    className = "w-fit max-w-40",
    ActionsHandlerMapping,
    triggerEl,
}: TReusableDropdownProp<T>) => {
    return (
        <DropdownMenu
            {...{
                modal: true,
            }}>
            <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
            <DropdownMenuContent className={cn(className)}>
                {ActionsHandlerMapping.map(({ label, value, onSelect }, index) => {
                    return (
                        <DropdownMenuItem
                            className='w-full capitalize'
                            {...{
                                onSelect: () => value && onSelect(value),
                                align: 'end',
                            }}
                            key={index}>
                            {label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const ReusableModalHeader = ({ title, className }: TReusableModalHeaderProps) => {
    return (
        <>
            <DialogTitle
                className={cn(
                    "text-xl font-semibold border-b pb-2",
                    className
                )}>
                {title}
            </DialogTitle>
            <hr />
        </>
    );
};

export const ReusableAlertModal: React.FC<ReusableAlertModalProps> = ({
    componentProps,
}) => {
    const {
        title,
        description,
        confirmText = "Confirm",
        cancelText = "Cancel",
        onConfirm,
        onClose,
        variant = VARIANTCOLOR.default,
    } = componentProps || {};
    return (
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onClose?.();
                        }}>
                        {cancelText}
                    </Button>
                </DialogClose>
                <Button
                    variant={VARIANTCOLOR[variant as keyof typeof VARIANTCOLOR] || VARIANTCOLOR.default}
                    onClick={() => {
                        onConfirm?.();
                        onClose?.();
                    }}>
                    {confirmText}
                </Button>
            </DialogFooter>
        </>
    );
};

export const ReusableSearchSelect: React.FC<ReusableSearchSelectProps> = ({
    id,
    label,
    data,
    error,
    required = false,
    placeholder = "Select an option...",
    onChange,
    value: controlledValue,
    emptyMessage = "No results found.",
    searchPlaceholder = "Search...",
}) => {
    const [value, setValue] = React.useState(controlledValue ?? "");
    const [nativeSearch, setNativeSearch] = React.useState("");

    React.useEffect(() => {
        if (controlledValue !== undefined) setValue(controlledValue);
    }, [controlledValue]);

    const filteredNative = React.useMemo(() => {
        if (!nativeSearch.trim()) return data;
        const lower = nativeSearch.toLowerCase();
        return data.filter((item) => item.label.toLowerCase().includes(lower));
    }, [data, nativeSearch]);

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Select
                value={value}
                onValueChange={(v) => {
                    setValue(v);
                    onChange?.(v);
                }}
                onOpenChange={(o) => { if (!o) setNativeSearch(""); }}
            >
                <SelectTrigger id={id} className={cn(!value && "text-muted-foreground")}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <div
                        className="flex items-center border-b px-3 sticky top-0 bg-popover z-10"
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            value={nativeSearch}
                            onChange={(e) => setNativeSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    {filteredNative.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </div>
                    ) : (
                        filteredNative.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                <HighlightMatch text={item.label} query={nativeSearch} />
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
};

function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-[2px] px-0.5">
                {text.slice(idx, idx + query.length)}
            </mark>
            {text.slice(idx + query.length)}
        </span>
    );
}

export const ReusableTextInput = ({
    id,
    label,
    value,
    placeholder,
    required = false,
    onChange,
    error,
    type
}: ReusableTextInputProps) => {
    return (
        <div>
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

export const ReusableEmailInput = ({
    id,
    label,
    value,
    placeholder = "example@mail.com",
    required = false,
    onChange,
    error,
}: ReusableEmailInputProps) => {
    return (
        <div>
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                id={id}
                type="email"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />

            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

export const ReusableNumberInput = ({
    id,
    label,
    value,
    placeholder,
    required = false,
    min,
    max,
    step,
    onChange,
    error
}: ReusableNumberInputProps) => {
    return (
        <div className="w-full">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                id={id}
                type="number"
                value={value}
                placeholder={placeholder}
                min={min}
                max={max}
                step={step}
                onChange={(e) => onChange(e.target.value)}
            />
            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

export const ReusableDateInput = ({
    id,
    label,
    value,
    required = false,
    min,
    max,
    onChange,
    error
}: ReusableDateInputProps) => {
    return (
        <div className="w-full">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                id={id}
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value)}
            />
            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

export const ReusableCheckbox = ({
    id,
    label,
    checked,
    onChange
}: ReusableCheckboxProps) => {
    return (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => onChange(v as boolean)}
            />
            <Label htmlFor={id}>{label}</Label>
        </div>
    );
};

export const ReusableTextarea = ({
    id,
    label,
    value,
    placeholder,
    required = false,
    rows = 3,
    error,
    onChange
}: ReusableTextareaProps) => {
    return (
        <div className="w-full">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
                id={id}
                value={value}
                placeholder={placeholder}
                rows={rows}
                onChange={(e) => onChange(e.target.value)}
            />
            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
};

export const ReusableSearchMultiSelect: React.FC<ReusableSearchMultiSelectProps> = ({
    id,
    label,
    data,
    error,
    required = false,
    placeholder = "Select an option...",
    onChange,
    value: controlledValue,
    emptyMessage = "No results found.",
    searchPlaceholder = "Search...",
    multiple = false,
}) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [value, setValue] = React.useState<string[]>(() =>
        Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : []
    );

    React.useEffect(() => {
        if (controlledValue !== undefined) {
            setValue(Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : []);
        }
    }, [controlledValue]);

    const handleSelect = (selected: string) => {
        let newValue: string[];
        if (multiple) {
            newValue = value.includes(selected)
                ? value.filter((v) => v !== selected)
                : [...value, selected];
        } else {
            newValue = value.includes(selected) ? [] : [selected];
            setOpen(false);
        }
        setValue(newValue);
        onChange?.(multiple ? newValue : newValue[0] || "");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setValue([]);
        onChange?.(multiple ? [] : "");
    };

    const handleRemoveTag = (e: React.MouseEvent, val: string) => {
        e.stopPropagation();
        const newValue = value.filter((v) => v !== val);
        setValue(newValue);
        onChange?.(multiple ? newValue : newValue[0] || "");
    };
    const filtered = React.useMemo(() => {
        if (!search.trim()) return data;
        const lower = search.toLowerCase();
        return data.filter((item) => item.label.toLowerCase().includes(lower));
    }, [data, search]);

    const selectedItems = data.filter((d) => value.includes(d.value));

    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500">*</span>}
            </Label>
            <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between font-normal min-h-9 h-auto py-1.5",
                            !value.length && "text-muted-foreground"
                        )}>
                        {multiple && selectedItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1 flex-1 mr-2">
                                {selectedItems.map((item) => (
                                    <span
                                        key={item.value}
                                        className="inline-flex items-center gap-1 rounded-md bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5"
                                    >
                                        <span className="max-w-[120px] truncate">{item.label}</span>
                                        <X
                                            className="h-3 w-3 shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                                            onClick={(e) => handleRemoveTag(e, item.value)}
                                        />
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="truncate flex-1 text-left">
                                {selectedItems.length === 1 ? selectedItems[0].label : placeholder}
                            </span>
                        )}
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                            {value.length > 0 && (
                                <X
                                    className="h-3.5 w-3.5 opacity-50 hover:opacity-100 cursor-pointer"
                                    onClick={handleClear}
                                />
                            )}
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-(--radix-popover-trigger-width) p-0 shadow-lg border border-border/60 rounded-lg overflow-hidden"
                    align="start"
                    sideOffset={6}>
                    <Command shouldFilter={false}>
                        <div
                            className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30"
                            onPointerDown={(e) => e.stopPropagation()}>
                            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <CommandList className="max-h-64 overflow-y-auto scrollbar-thin">
                            {filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                                    <div className="rounded-full bg-muted p-2">
                                        <Search className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                                </div>
                            ) : (
                                <CommandGroup className="p-1.5">
                                    {multiple && !search && (
                                        <CommandItem
                                            onSelect={() => {
                                                const allValues = data.map((d) => d.value);
                                                const allSelected = allValues.every((v) => value.includes(v));
                                                const newValue = allSelected ? [] : allValues;
                                                setValue(newValue);
                                                onChange?.(newValue);
                                            }}
                                            className="cursor-pointer rounded-md mb-1 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[selected=true]:bg-accent">
                                            <div className="flex items-center gap-2.5 w-full">
                                                <div className={cn(
                                                    "flex h-4 w-4 items-center justify-center rounded-sm border shrink-0 transition-colors",
                                                    data.every((d) => value.includes(d.value))
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : data.some((d) => value.includes(d.value))
                                                            ? "bg-primary/30 border-primary/50 text-primary-foreground"
                                                            : "border-border"
                                                )}>
                                                    <Check className="h-3 w-3" />
                                                </div>
                                                <span>Select all</span>
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    {data.length} items
                                                </span>
                                            </div>
                                        </CommandItem>
                                    )}

                                    <div className={cn(multiple && !search && "border-t pt-1 mt-0.5")}>
                                        {filtered.map((item) => (
                                            <CommandItem
                                                key={item.value}
                                                value={item.value}
                                                onSelect={() => handleSelect(item.value)}
                                                className="cursor-pointer rounded-md px-2 py-1.5 data-[selected=true]:bg-accent aria-selected:bg-accent">
                                                <div className="flex items-center gap-2.5 w-full">
                                                    <div className={cn(
                                                        "flex h-4 w-4 items-center justify-center rounded-sm border shrink-0 transition-colors",
                                                        value.includes(item.value)
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "border-border opacity-60"
                                                    )}>
                                                        <Check className={cn("h-3 w-3 transition-opacity", value.includes(item.value) ? "opacity-100" : "opacity-0")} />
                                                    </div>
                                                    <HighlightMatch text={item.label} query={search} />
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </div>
                                </CommandGroup>
                            )}
                        </CommandList>
                        {multiple && value.length > 0 && (
                            <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
                                <span className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{value.length}</span> of {data.length} selected
                                </span>
                                <button
                                    onClick={handleClear}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
                                    Clear all
                                </button>
                            </div>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
};

export const ReusableNormalSelect: React.FC<ReusableNormalSelectProps> = ({
    id,
    label,
    value,
    onChange,
    data,
    placeholder,
    required = false,
    error,
}) => {
    return (
        <div className="space-y-1">
            <Label htmlFor={id}>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value === undefined ? undefined : String(value)} onValueChange={(val) => onChange?.(val)}>
                <SelectTrigger id={id}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {data.map((item: any) => (
                        <SelectItem key={item.value} value={String(item?.value)}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
};
export const ReusableFileInput: React.FC<ReusableFileInputProps> = ({
    id,
    label,
    value = [],
    onChange,
    required = false,
    error,
    multiple = false,
}) => {
    const [previews, setPreviews] = useState<
        { file: File; url: string; type: string }[]
    >([]);

    useEffect(() => {
        if (!value || value.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreviews([]);
            return;
        }
        const mapped = value.map((file) => ({
            file,
            url: URL.createObjectURL(file),
            type: file.type,
        }));

        setPreviews(mapped);

        return () => {
            mapped.forEach((item) => URL.revokeObjectURL(item.url));
        };
    }, [value]);

    const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        onChange(multiple ? files : files.slice(0, 1));
    };
    const removeFile = (index: number) => {
        const updated = value.filter((_, i) => i !== index);
        onChange(updated);
    };
    const renderPreview = (item: { file: File; url: string; type: string }, index: number) => {
        const isImage = item.type.startsWith("image/");
        const isPDF = item.type === "application/pdf";
        return (
            <div
                key={index}
                className="relative border p-3 rounded-lg bg-gray-50 flex items-center gap-3">
                {isImage && (
                    <img
                        src={item.url}
                        alt={item.file.name}
                        className="h-20 w-20 rounded object-cover border"
                    />
                )}
                {isPDF && (
                    <div className="h-20 w-20 flex items-center justify-center bg-red-100 rounded">
                        <FileText className="h-10 w-10 text-red-600" />
                    </div>
                )}
                {!isImage && !isPDF && (
                    <div className="h-20 w-20 flex items-center justify-center bg-gray-200 rounded">
                        <FileIcon className="h-10 w-10 text-gray-600" />
                    </div>
                )}
                <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{item.file.name}</p>
                    <p className="text-xs text-gray-500">{item.file.type}</p>
                    <a
                        href={item.url}
                        download={item.file.name}
                        className="inline-flex items-center gap-1 text-blue-600 text-xs underline mt-1"
                    >
                        <Download className="h-3 w-3" /> {t('Download')}
                    </a>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="absolute right-2 top-2">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    };

    return (
        <div className="w-full space-y-2">
            {label && (
                <Label htmlFor={id}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            <input
                id={id}
                type="file"
                multiple={multiple}
                onChange={handleSelectFiles}
                className="block w-full border rounded px-3 py-2 text-sm"
            />
            {previews.length > 0 && (
                <div className="space-y-3 mt-2">
                    {previews.map((item, index) => renderPreview(item, index))}
                </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
};

export const InfoRow = ({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number | ReactNode;
    icon?: React.ElementType;
}) => (
    <div className="flex items-start justify-between py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {Icon && <Icon className="h-4 w-4" />}
            <span>{label}</span>
        </div>
        <div className="text-sm font-medium text-right">{value}</div>
    </div>
);

export const ReusableSheet = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    side = "right",
    width,
}: ReusableSheetProps) => {
    const defaultWidth =
        side === "left" || side === "right"
            ? "w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
            : "w-full mx-auto sm:max-w-xl md:max-w-2xl lg:max-w-3xl";

    const appliedWidth = width ? width : defaultWidth;
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side={side} style={{ maxWidth: width }} className={`${appliedWidth} flex flex-col h-full`}>
                <SheetHeader className="shrink-0">
                    <SheetTitle>{title}</SheetTitle>
                    {description && <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>

                <div className="p-2 sm:p-4 flex-1 overflow-auto min-h-0">
                    {children}
                </div>

                <SheetFooter className="shrink-0">
                    {footer ? (
                        footer
                    ) : (
                        <SheetClose asChild>
                            <Button variant="secondary">{t('Close')}</Button>
                        </SheetClose>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
const infoCardVariants = {
    default: '',
    elevated: 'border border-border/50 bg-gradient-to-b from-card to-muted/30',
    bordered: 'border-l-4 border-l-primary',
};

export function InfoCardSkeleton({
    title,
    description,
    icon,
    children,
    className,
    variant = 'default',
}: InfoCardProps) {
    return (
        <Card className={cn(infoCardVariants[variant], className)}>
            <CardHeader className={cn(variant !== 'default' && 'pb-3')}>
                <CardTitle className={cn(
                    'flex items-center gap-2',
                    variant !== 'default' && 'gap-2.5 text-base'
                )}>
                    {icon && (variant !== 'default' ? (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4">
                            {icon}
                        </span>
                    ) : (
                        icon
                    ))}
                    {title}
                </CardTitle>
                {description && (
                    <CardDescription className="mt-0.5">{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-0 pt-0">
                {children}
            </CardContent>
        </Card>
    );
}

export const ConfirmationDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
    isLoading = false,
}: ConfirmationDialogProps) => {
    const { t } = useTranslation();

    const handleConfirm = () => {
        onConfirm();
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t(title)}</AlertDialogTitle>
                    <AlertDialogDescription>{t(description)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
                        {t(cancelLabel)}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={variant === 'destructive' ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
                    >
                        {isLoading ? t('Processing...') : t(confirmLabel)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export const useConfirmationDialog = (): UseConfirmationDialogReturn => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<Omit<ConfirmationDialogProps, 'open' | 'onOpenChange'> | null>(null);

    const confirm = useCallback((newConfig: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange' | 'onConfirm'> & { onConfirm: () => void | Promise<void> }) => {
        setConfig({
            ...newConfig,
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await newConfig.onConfirm();
                } finally {
                    setIsLoading(false);
                    setIsOpen(false);
                }
            },
        });
        setIsOpen(true);
    }, []);

    const ConfirmDialog = useCallback(() => {
        if (!config) return null;
        return (
            <ConfirmationDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                isLoading={isLoading}
                {...config}
            />
        );
    }, [isOpen, config, isLoading]);

    return { isOpen, confirm, ConfirmDialog };
};

const statCardVariants = {
    default: '',
    highlight: 'border border-primary/20 bg-primary/5',
    compact: 'py-4',
};

export const StatCard = ({
    title,
    value,
    description,
    icon,
    titleClassName,
    valueClassName,
    descriptionClassName,
    variant = 'default',
    className
}: StatCardProps) => {
    return (
        <Card className={cn(statCardVariants[variant], className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle
                        className={cn(
                            'text-sm font-medium text-muted-foreground',
                            variant === 'highlight' && 'text-foreground',
                            titleClassName
                        )}>
                        {title}
                    </CardTitle>
                    <span className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        variant === 'highlight' ? 'bg-primary/20 text-primary' : 'bg-muted/80 text-muted-foreground'
                    )}>
                        {icon}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn(
                    'font-bold tabular-nums',
                    variant === 'compact' ? 'text-xl' : 'text-2xl',
                    valueClassName
                )}>
                    {value}
                </div>
                {description && (
                    <p className={cn('text-xs text-muted-foreground mt-1.5', descriptionClassName)}>
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );

};

export const CopyButton = ({ text, label }: { text: string; label?: string }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {label || (copied ? t('Copied!') : t('Copy'))}
        </Button>
    );
};

export const CodeBlock = ({ code, language = 'html' }: { code: string; language?: string }) => (
    <div className="relative">
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
            <code className={`language-${language}`}>{code}</code>
        </pre>
        <div className="absolute top-2 right-2">
            <CopyButton text={code} />
        </div>
    </div>
);

export const ReusableCheckBoxGroup = <T,>({
    options,
    value,
    onChange,
    className,
    single = false,
}: ReusableCheckBoxGroupProps<T>) => {
    const selected = Array.isArray(value) ? value : [];

    const handleToggle = (optionValue: T, checked: boolean) => {
        if (single) {
            onChange(checked ? [optionValue] : []);
            return;
        }

        if (checked) {
            onChange([...selected, optionValue]);
            return;
        }
        onChange(selected.filter((item) => item !== optionValue));
    };

    return (
        <div className={cn('space-y-2', className)}>
            {options.map((option) => {
                const isChecked = selected.includes(option.value);

                return (
                    <Label
                        key={String(option.value)}
                        className={cn(
                            'hover:bg-accent/50 flex items-start gap-2 rounded-lg border p-3',
                            'has-aria-checked:border-blue-600 has-aria-checked:bg-blue-50',
                            option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        )}>
                        <Checkbox
                            checked={isChecked}
                            disabled={option.disabled}
                            onCheckedChange={(checked) => handleToggle(option.value, Boolean(checked))}
                            className='data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white'
                        />
                        <div className='grid gap-1.5 font-normal'>
                            <p className='text-sm leading-none font-medium'>{option.label}</p>
                            {option.description ? (
                                <p className='text-muted-foreground text-sm'>{option.description}</p>
                            ) : null}
                        </div>
                    </Label>
                );
            })}
        </div>
    );
};
