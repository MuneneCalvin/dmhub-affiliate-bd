/* eslint-disable @typescript-eslint/no-explicit-any */
import { EADVERTISERSTATUS_TYPE, HTTP_VERBS, SORT_ORDER } from '@/utils/enums';
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { NavigateFunction } from 'react-router-dom';

export interface Auth {
    user: User;
}

export interface LanguageProviderProps {
    children: ReactNode;
}

export interface LocaleData {
    current: string;
    fallback: string;
    available: Record<string, { name: string; native: string; regional: string }>;
}

export interface LanguageContextType {
    t: (key: string, params?: Record<string, unknown>) => string;
    __: (text: string, params?: Record<string, unknown>) => string;
    currentLocale: string;
    locale: string;
    setLanguage: (locale: string) => void;
    availableLocales: Array<{ code: string; name: string; native: string }>;
    isLocale: (code: string) => boolean;
    loading: boolean;
}
export type Translations = Record<string, string>;
export type TQueryFieldProps = {} & Partial<TClassType> & TSearchToolProps;
export type TClassType = { className: string };
export interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}
export type TNodeChildrentType<T = ReactNode> = {
    children: T;
};
export type TCommandOption<T = string> = { label: string; value?: T };
export type TKeyValueStringType = Record<string, string>;
export type TKeyValueAnyType = Record<string, any>;

export type BASE_PAYLOAD_TYPES = {
    created_at: Date;
    updated_at: Date;
    id: string;
};

export type TCurrency = {
    currency_code: string;
    currency_name: string;
}
export type TCountry = {
    country_iso: string;
    country_name: string;
    status: string;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    children: any;
    permissions?: any;
}

export interface NetworkBranding {
    network_name?: string;
    logo_url?: string | null;
    sidebar_logo_url?: string | null;
    favicon_url?: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    locale: LocaleData;
    auth: Auth;
    sidebarOpen: boolean;
    networkBranding?: NetworkBranding | null;
    [key: string]: unknown;
}

export type User = {
    first_name: string | null;
    last_name: string | null;
    user_name: string | null;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    status?: string;
    title?: string;
    [key: string]: unknown;
} & BASE_PAYLOAD_TYPES;

export interface SystemUserPagination {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

export interface SystemUser {
    users: SystemUserPagination;
    roles: TRoles;
    [key: string]: unknown;
}

export type TReusablePageProps = {
    description?: string;
    title: string;
    breadcrumbs: any
} & Partial<TNodeChildrentType>;

export type TReusableDropdownProp<T> = {
    className?: string;
} & Pick<TDropDownProps<T>, "triggerEl"> &
    TActionColumnGenProps<T>;


export type TReusableModalHeaderProps = {
    title: string;
    className?: string;
};


export type TLANG = {
    code: string;
    name: string;
};

export type TReusableDropdownCheckProp<T> = {} & TReusableDropdownProp<T>;

export type TNotifs = {
    message: string;
    unread: boolean;
    avatar?: string;
    color: string;
    time: string;
    type: string;
} & Pick<BASE_PAYLOAD_TYPES>;

export type TActionColumnGenProps<T = string> = {
    ActionsHandlerMapping: SingleActionsHandler<T>[];
};

export type SingleActionsHandler<T = string> = {
    conditional?: (payload: T) => boolean;
} & TCommandOption<T> &
    Pick<TDropDownProps<T>, 'onSelect'>;

export type TDropDownProps<T = string> = {
    commandOptions: TCommandOption[];
    onSelect: (val: T) => void;
    selectedOption?: string;
    includeSearch?: boolean;
    triggerEl: ReactNode;
} & Partial<TClassType>;

export type TReusablePopupProps = {
    onOpenChange?: (state: boolean) => void;
    open?: boolean;
} & Pick<TDropDownProps, 'triggerEl'> &
    TNodeChildrentType &
    Partial<TClassType>;

export type TAvatartTypes = {
    alt?: string;
    url?: string;
} & Partial<TClassType>;

export type TNavBarUrlType = {
    child_urls?: Pick<
        TNavBarUrlType,
        'Icon' | 'child_urls' | 'roles' | 'is_enabled' | 'label' | 'url'
    >[];
    // user_info: TOKEN_USER_INFO;
    Icon?: React.FC<IconProps>;
    current_path: string;
    roles?: ROLE_LIST[];
    is_enabled: boolean;
    label: string;
    url?: string;
};

export type TTableReusableComponent<T = any> = {
    OtherTools?: React.ComponentType<Partial<TClassType> & TSearchToolProps>;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    OtherToolsProps: Partial<TSearchToolProps>;
    setPageSize: (page: number) => void;

    onPageChange: (page: number) => void;
    rowSelection?: RowSelectionState;
    onClick?: (row: Row<T>) => void;
    columns: ColumnDef<any, any>[];
    showPagination?: boolean;
    title?: string | ReactNode;
    pageCount: number;
    isLoading?: boolean;
    pageSize: number;
    isError?: boolean;
    page?: number;
    data: T[];
};

export type TSearchToolProps = {
    onChange: (value: string) => void;
    onDateChange?: (dates: { startDate?: string; endDate?: string }) => void;
    advancedHandler?: () => any;
    includeFilter?: boolean;
    placeholder?: string;
    title?: string;
} & Partial<TClassType> &
    Pick<TNavBarUrlType, 'Icon'>;

export type TRoles = {
    name: string;
    data: PaginatedRoles;
    permissions: TPermissions;
    [key: string]: any;
} & BASE_PAYLOAD_TYPES;

export interface PaginatedRoles {
    results: any;
    total: number;
    pageCount: number;
    pageSize: number;
    currentPage: number;
    from: number;
    to: number;
    [key: string]: any;
}

export type TPermissions = {
    name: string;
    data: PaginatedRoles;
    [key: string]: any;
} & BASE_PAYLOAD_TYPES;

export interface RoleFormModalProps {
    componentProps: {
        role?: TRoles;
        allPermissions: TPermissions[];
        isEdit?: boolean;
    };
    handleDialogContextSwitch: (data: { open: boolean }) => void;
}


export type TDebounceprops<T> = {
    debounceTimeOut?: number;
    debounceCallback: (args: T) => void;
};
export type TFilterOptions = {
    order: {
        direction: SORT_ORDER;
        orderField: string;
    };
    date: Date[];
    term: string;
} & Record<string, any>;

export type TActionType<S> = {
    payload: Partial<S>;
    type: keyof S;
};
export type TPaginationFilters = { page: number; pageSize: number };

export type TTab<KeyType = string> = {
    Tab: React.ComponentType<any>;
    key: KeyType;
    title: string;
};

export type TUseTabsProps<KeyType = string> = {
    tabs: TTab<KeyType>[];
    defaultTab: KeyType;
};


export type ReusableTabComponentProps<KeyType extends string = string> = {
    Children?: React.ComponentType<any>;
    tabProps?: Record<string, any>;
    tabs: TTab<KeyType>[];
    defaultTab: KeyType;
    header?: ReactNode;
} & Partial<TClassType>;

export type TReusableSelectProps = {
    parentClassName?: string;
    title: string;
} & TReusableSelectProp<string>;

export type TReusableSelectProp<T> = {
    isLoading?: boolean;
    actionsMap: Required<Pick<SingleActionsHandler<T>, 'label' | 'value'>>[];
    onValueChange: (val: T) => void;
} & Pick<TDropDownProps, 'triggerEl' | 'className'>;

export type SingleActionsHandler<T = string> = {
    conditional?: (payload: T) => boolean;
} & TCommandOption<T> &
    Pick<TDropDownProps<T>, 'onSelect'>;

export type TDropDownProps<T = string> = {
    commandOptions: TCommandOption[];
    onSelect: (val: T) => void;
    selectedOption?: string;
    includeSearch?: boolean;
    triggerEl: ReactNode;
} & Partial<TClassType>;

export type TMemberSummaryProps = {
    optionsDispatcherDebounce: (
        args: TActionType<
            TPaginationFilters & {
                order: {
                    direction: SORT_ORDER;
                    orderField: string;
                };
                date: Date[];
                term: string;
            } & Record<string, any>
        >
    ) => void;

    filters: {
        order: {
            direction: SORT_ORDER;
            orderField: string;
        };
        date: Date[];
        term: string;
    } & Record<string, any>;
};

export type TCustomDialogPropsContextProps<T = TKeyValueStringType> = {
    componentProps?: T;
} & TComponent<T> &
    Pick<TProfileMenuItems, 'state'>;

export type TCustomDialogProps<T = TKeyValueStringType> = {
    handleDialogContextSwitch: (
        context: TCustomDialogPropsContextProps<T>
    ) => void;
    children: ReactNode;
    toggleDialog: () => any;
    dialogOpen: boolean;
} & Partial<TClassType>;

export type TNetwork = {
    approved_at: string | null
    approved_by: string | null
    country_iso: string
    default_commission_model: string
    default_commission_value: string
    default_currency: string
    logo_url: string
    min_payment_threshold: string
    network_name: string
    owner_email: string
    pay_day_of_month: number
    pay_day_of_week: number
    payment_frequency: string
    settings: any | null
    status: string
    support_email: string
    support_phone: string
    [key: string]: any;
} & BASE_PAYLOAD_TYPES;

export type TUserNetworks = {
    user_id: number;
    network_id: number;
    network: TNetwork;
} & BASE_PAYLOAD_TYPES;

export type TModalPropsW<T, ComponentProps> = {} & Pick<
    TCustomDialogProps<TModalPropsSub<T, ComponentProps>>,
    'handleDialogContextSwitch'
> &
    Pick<
        TCustomDialogPropsContextProps<TModalPropsSub<T, ComponentProps>>,
        'componentProps'
    >;

export type TQParamsGenProps = TKeyValueUnkownType;

export type THttpClientConfigProps = {
    configs?: Partial<TKeyValueStringType & TKeyValueAnyType>;
    navigate?: NavigateFunction;
    auth_required?: boolean;
    redirect_url?: string;
    is_graphql?: boolean;
    url?: string;
};

export type THttpHookProps<T extends BASE_PAYLOAD_TYPES = BASE_PAYLOAD_TYPES> =
    {
        query_params: TKeyValueAnyType;
        path: string | ((props: T) => string);
        payload?: TKeyValueAnyType;
        method?: HTTP_VERBS;
        cacheName: string;
        enabled?: boolean;
        retry?: boolean;
        depArr: any[];
    } & Pick<THttpClientConfigProps, 'redirect_url' | 'auth_required'>;

export const httpQueryParamsGenerator = (params: TQParamsGenProps) =>
    qs.stringify(params, { encode: true });

export interface NetworksTableContentProps {
    filter?: ENETWORKSTATUS_TYPE;
    tab?: ENETWORKSTATUS_TYPE;
}

export interface AdvertisersTableContentProps {
    filter?: EADVERTISERSTATUS_TYPE;
    tab?: EADVERTISERSTATUS_TYPE;
    advertisers: TResponseDataWrapper<TAdvertiser>;
}

export type TResponseDataWrapper<TDataType = any> = TResponseWrapper<{
    results: TDataType;
}> & {
    currentPage: number;
    pageCount: number;
    pageSize: number;
    count: number;
};

export interface ReusableAlertModalProps {
    componentProps?: {
        title: string;
        description: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        onClose?: () => void;
        variant?: "default" | "delete" | "update";
    };
}

export type TAdvertiser = {
    user_id: number;
    network_id: number;
    netId: number;
    business_name: string;
    website_name: string;
    industry: string;
    status: string;
    total_budget: float;
    available_budget: float;
    currency: string;
    auto_approve_publishers: boolean;
    require_publisher_approval: boolean;
    is_verified: boolean;
    verified_at: Date | null;
} & BASE_PAYLOAD_TYPES;

export type TPublisher = {

} & BASE_PAYLOAD_TYPES;

export interface ReusableSearchSelectProps {
    data: Array<{ value: string; label: string }>;
    placeholder?: string;
    onChange?: (value: string) => void;
    value?: string;
    emptyMessage?: string;
    searchPlaceholder?: string;
}

export type EditAdvertiserProps = {
    componentProps: {
        data: any;
    };
    handleDialogContextSwitch: (payload: any) => void;
};

export interface ReusableSearchSelectProps {
    data: Array<{ value: string; label: string }>;
    placeholder?: string;
    onChange?: (value: string) => void;
    value?: string;
    emptyMessage?: string;
    searchPlaceholder?: string;
    required?: boolean;
    error?: string;
    id: string;
    label: string;
}

export type ReusableTextInputProps = {
    id: string;
    label: string;
    value?: string;
    required?: boolean;
    placeholder?: string;
    error?: string;
    type?: string
    onChange: (value: string) => void;
};
export interface ReusableFileInputProps {
    id: string;
    label?: string;
    value?: File[];                     // controlled files
    onChange: (files: File[]) => void;
    required?: boolean;
    error?: string;
    multiple?: boolean;
}

export interface ReusableNumberInputProps {
    id: string;
    label: string;
    value?: number | string;
    placeholder?: string;
    required?: boolean;
    min?: number;
    max?: number;
    step?: number;
    error?: string;
    onChange: (value: string) => void;
}
export interface ReusableDateInputProps {
    id: string;
    label: string;
    value?: string;
    required?: boolean;
    min?: string;
    max?: string;
    error?: string;
    onChange: (value: string) => void;
}

export interface ReusableCheckboxProps {
    id: string;
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

export interface ReusableCheckBoxGroupOption<T = string> {
    label: string;
    value: T;
    description?: string;
    disabled?: boolean;
}

export interface ReusableCheckBoxGroupProps<T = string> {
    options: ReusableCheckBoxGroupOption<T>[];
    value: T[];
    onChange: (value: T[]) => void;
    name?: string;
    className?: string;
    single?: boolean;
}
export interface ReusableTextareaProps {
    id: string;
    label: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    rows?: number;
    error?: string;
    onChange: (value: string) => void;
}
export interface ReusableSearchMultiSelectProps {
    id: string;
    label: string;
    data: { value: string; label: string }[];
    value?: string | string[];
    onChange?: (value: string | string[]) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
    emptyMessage?: string;
    searchPlaceholder?: string;
    multiple?: boolean;
}
export interface ReusableNormalSelectProps {
    id: string;
    label: string;
    value?: string | number;
    onChange: (value: string) => void;
    data: { value: string | number; label: string }[];
    placeholder?: string;
    required?: boolean;
    error?: string;
}
export interface ReusableEmailInputProps {
    id: string;
    label: string;
    value: string;
    placeholder?: string;
    required?: boolean;
    onChange: (value: string) => void;
    error?: string;
}
export interface TPaginationResult<T> {
    results: T[];
    total: number;
    pageCount: number;
    pageSize: number;
    currentPage: number;
    from: number | null;
    to: number | null;
}
export interface PublisherPagesTypes {
    datas: TPaginationResult<TPublisher>;
    networks: TNetwork[];
    currencies: TCurrency[];
    extingNetwork?: TUserNetworks | null;
    [key: string]: any;
}

export interface ViewPublisherProps {
    publisher: any;
    [key: string]: any;
}

export interface viewAdvertiserProps {
    advertiser: any;
    [key: string]: any;
}

export interface viewNetworkProps {
    network: any;
    users: any;
    [key: string]: any;
}
export interface NetworksDataResponse {
    results: TNetwork[];
    total: number;
    pageCount: number;
    pageSize: number;
    currentPage: number;
    from: number | null;
    to: number | null;
}
export interface NetworkPageProps {
    networksData: NetworksDataResponse;
    countries: TCountry[];
    currencies: TCurrency[];
    [key: string]: any;
}
export interface campaignsPageProps {
    campaigns: any;
    [key: string]: any;
}

export interface TermsPageProps {
    terms: TTerms;
    [key: string]: any;
}

export type TTerms = {
    description: string;
    advertiser_id: number;
    deleted_at:string;
    [key: string]: any;
} & BASE_PAYLOAD_TYPES;

export type TCampaign = {
    name: string;
    total_budget: string;
    daily_budget: string;
    currency: string;
    start_date: string;
    end_date: string;
    campaign_status: string;
    target_conversions: number;
    target_roi: string;
    network_name: string;
    description?: string;
    terms?: { terms?: string[] } | null;
    geo_targeting?: { countries?: string[] } | null;
    device_targeting?: { devices?: string[] } | null;
    metadata?: { tags?: string[] } | null;
    max_publishers?: number;
} & BASE_PAYLOAD_TYPES;

export type TOffers = {
    campaign_id: number;
    network_id: number;
    name: string;
    description: string | null;
    terms: { terms?: string[] } | null;
    offer_status: 'A' | 'P' | 'N' | 'D' | 'I';
    bonus: { bonuses?: string[] } | string | null;
    conversion_window_hours: number | null;
    click_cookie_lifetime_hours: number | null;
    minimum_payout: number;
    allowed_traffic_sources: { sources?: string[] } | null;
    prohibited_traffic_sources: { sources?: string[] } | null;
    preview_url: string | null;
    tracking_url_template: string | null;
    thumbnail_url: string | null;
    total_clicks: number;
    total_conversions: number;
    conversion_rate: number;
    avg_order_value: number;
    earnings_per_click: number;
    expires_at: string | null;
    commissions?: TOfferCommission[];
    // Direct commission fields (stored on the offer itself)
    commission_type_1?: number | string | null;
    commission_value_1?: number | string | null;
    commission_type_2?: number | string | null;
    commission_value_2?: number | string | null;
    nice_name?: string | null;
} & BASE_PAYLOAD_TYPES;

export type TOfferCommission = {
    id: number;
    offer_id: number;
    commission_type_id: number;
    commission_value: string;
    commission_type?: CommissionType;
} & BASE_PAYLOAD_TYPES;

export type DrawerPosition = "left" | "right" | "top" | "bottom";

export interface ReusableSheetProps {
    side?: "top" | "bottom" | "left" | "right";
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: string;
}

export interface SideDrawerProps {
    campaign: any;
}

export type TSearchToolProps = {
    onChange: (value: string) => void;
    onDateChange?: (dates: { startDate?: string; endDate?: string }) => void;
    advancedHandler?: () => any;
    includeFilter?: boolean;
    placeholder?: string;
    title?: string;
} & Partial<TClassType> &
    Pick<TNavBarUrlType, 'Icon'>;

export interface InfoCardProps {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    children?: any;
    className?: string;
    variant?: 'default' | 'elevated' | 'bordered';
}

export type Lead = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    priority: string;
    source: string;
    lead_value: number;
    campaign?: { name: string };
    publisher?: { user?: { name: string } };
    assigned_user?: { name: string };
} & BASE_PAYLOAD_TYPES;

export interface LeadsIndexProps {
    leads: {
        data: Lead[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: LeadsStats;
    campaigns: { id: number; name: string }[];
    teamMembers: { id: number; name: string }[];
}

export interface LeadsStats {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
}

export type StatCardProps = {
    title: string;
    value: ReactNode;
    description?: string;
    icon?: ReactNode;
    titleClassName?: string;
    valueClassName?: string;
    descriptionClassName?: string;
    variant?: 'default' | 'highlight' | 'compact';
    className?: string;
};

// ==================== Publisher Types ====================

export interface PublisherEarning {
    id: number;
    amount: string;
    commission_type: string;
    status: string;
    created_at: string;
    publisher_campaign?: {
        campaign?: { name: string };
        offer?: { name: string };
    };
    lead?: { email: string; first_name?: string; last_name?: string };
    invoice?: { invoice_number: string };
}

export interface PublisherEarningSummary {
    total_earnings: number;
    pending_earnings: number;
    approved_earnings: number;
    paid_earnings: number;
}

export interface PublisherInvoice {
    id: number;
    invoice_number: string;
    amount: string;
    status: string;
    created_at: string;
    approved_at: string | null;
    paid_at: string | null;
    rejection_reason?: string | null;
    notes?: string | null;
    earnings?: PublisherEarning[];
    approved_by_user?: { name: string };
}

export interface PublisherInvoiceSummary {
    pending_count: number;
    pending_amount: number;
    approved_count: number;
    approved_amount: number;
    paid_count: number;
    paid_amount: number;
}

export interface PublisherPayoutRequest {
    can_request: boolean;
    available_amount: number;
    min_payout: number;
    remaining: number;
}

export interface CampaignScript {
    id: number;
    campaign_name: string;
    offer_name: string;
    script_token: string;
    script_url: string;
    embed_tag: string;
    tracking_link: string;
    form_config?: {
        fields?: string[];
        redirect_url?: string;
    };
}

export interface ScriptDocsPlatform {
    name: string;
    icon: string;
    instructions: string;
    code: string;
}

export interface ScriptDocsExcludeMethod {
    name: string;
    code: string;
}

export interface ScriptDocsTroubleshootingIssue {
    problem: string;
    solutions: string[];
}

export interface ScriptDocsDocumentation {
    quick_start: {
        title: string;
        description: string;
        code: string;
    };
    platforms: ScriptDocsPlatform[];
    exclude_forms: {
        title: string;
        description: string;
        methods: ScriptDocsExcludeMethod[];
    };
    manual_trigger: {
        title: string;
        description: string;
        code: string;
    };
    api_direct: {
        title: string;
        description: string;
        code: string;
    };
    testing: {
        title: string;
        description: string;
        steps: string[];
    };
    troubleshooting: {
        title: string;
        issues: ScriptDocsTroubleshootingIssue[];
    };
}

export interface ScriptDocsCampaign {
    id: number;
    name: string;
    offer: string;
}

// ==================== Application Types ====================

export interface ApplicationData {
    id: number;
    status: string;
    first_name: string;
    last_name: string;
    email: string;
    campaign_name: string;
    offer_id: number | null;
    offer_name: string | null;
    website_url: string;
    applied_at: string;
    created_at: string;
}

export interface ApplicationDetails extends ApplicationData {
    applied_notes: string | null;
    approved_at: string | null;
    approved_by: number | null;
    rejection_reason: string | null;
    tracking_link: string | null;
    sub: string | null;
    traffic_sources: string | null;
    promotional_methods: string | null;
    campaign_description?: string | null;
    commission_value_1?: number | null;
    commission_value_2?: number | null;
    network_name?: string;
}

export interface ApplicationsPageProps {
    applications: {
        data: ApplicationData[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    currentStatus: string;
    [key: string]: any;
}

export interface RejectApplicationModalProps {
    componentProps: {
        application: {
            id: number;
            first_name: string;
            last_name: string;
            campaign_name: string;
            offer_name: string;
        };
    };
    handleDialogContextSwitch: (data: any) => void;
}

// ==================== Lead Types (Extended) ====================

export interface LeadDetails extends Lead {
    job_title: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    notes: string;
    lead_score: number;
    is_converted: boolean;
    converted_at: string;
    conversion_value: number;
    ip_address: string;
    user_agent: string;
    device_type: string;
    browser: string;
    operating_system: string;
    country_iso: string;
    region: string;
    city_town: string;
    updated_at: string;
    last_contacted_at: string;
    next_follow_up_at: string;
    contact_attempts: number;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    offer?: { id: number; name: string };
    creative?: { id: number; name: string };
    click?: { id: number; clicked_at: string };
}

export interface LeadCaptureProps {
    click_id: number;
    campaign?: {
        id: number;
        name: string;
    };
    offer?: {
        id: number;
        name: string;
        preview_url?: string;
    };
    [key: string]: any;
}

export interface ThankYouPageProps {
    lead_token?: string;
    redirect_url?: string;
    [key: string]: any;
}

// ==================== Creative Types ====================

export interface Creative {
    id: number;
    name: string;
    type: string;
    width: number;
    height: number;
    file_url: string;
    preview_url: string;
    html_code: string;
    alt_text: string;
    status: string;
    clicks: number;
    impressions: number;
    tracking_code: string;
    embed_code: string;
    tracking_pixel: string;
    campaign?: { id: number; name: string };
    offer?: { id: number; name: string };
    lead_form_embed_code?: string;
}

// ==================== Auth Types ====================

export interface ResetPasswordProps {
    token: string;
    email: string;
}

export interface TwoFactorProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

export interface CommissionType {
    id: number;
    name: string;
    nice_name: string;
}

export interface AdminInvoice {
    id: number;
    invoice_number: string;
    amount: string;
    currency: string;
    status: string;
    requested_at: string;
    approved_at: string | null;
    paid_at: string | null;
    publisher?: {
        id: number;
        user?: {
            first_name: string;
            last_name: string;
            email: string;
        };
    };
    network?: {
        id: number;
        network_name: string;
    };
}

export interface AdminInvoiceStats {
    pending: number;
    pending_amount: number;
    approved: number;
    approved_amount: number;
    paid_this_month: number;
}

export interface AdminInvoiceDetail {
    id: number;
    invoice_number: string;
    amount: string;
    currency: string;
    status: string;
    requested_at: string;
    approved_at: string | null;
    paid_at: string | null;
    rejection_reason: string | null;
    payment_reference: string | null;
    notes: string | null;
    created_at: string;
    publisher?: {
        id: number;
        website_url?: string;
        user?: {
            first_name: string;
            last_name: string;
            email: string;
        };
    };
    network?: {
        id: number;
        network_name: string;
    };
    approved_by_user?: {
        first_name: string;
        last_name: string;
    };
    earnings?: {
        id: number;
        amount: string;
        commission_type: string;
        created_at: string;
        publisher_campaign?: {
            campaign?: {
                name: string;
            };
            offer?: {
                name: string;
            };
        };
        lead?: {
            email: string;
            first_name: string;
            last_name: string;
        };
    }[];
}

export type InvoiceEarning = NonNullable<AdminInvoiceDetail['earnings']>[number];

export interface QrCodeModalProps {
    componentProps: {
        campaignId: number;
        campaignName?: string;
    };
    handleDialogContextSwitch: (payload: any) => void;
}

export interface QrCodeData {
    qrCode: string | null;
    trackingLink: string | null;
    campaignName: string;
    offerName: string;
}

export interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
}

export interface UseConfirmationDialogReturn {
    isOpen: boolean;
    confirm: (config: Omit<ConfirmationDialogProps, 'open' | 'onOpenChange' | 'onConfirm'> & { onConfirm: () => void | Promise<void> }) => void;
    ConfirmDialog: React.FC;
}

export interface NetworkSettingsData {
    id: number;
    network_name: string;
    logo_url: string | null;
    sidebar_logo_url: string | null;
    favicon_url: string | null;
    support_email: string | null;
    support_phone: string | null;
}

export interface NetworkSettingsPageProps {
    network: NetworkSettingsData;
    [key: string]: any;
}

export type DateRange = {
    from?: Date;
    to?: Date;
};

export type ChangeNetworkModalProps = {
    componentProps?: {
        entityType?: 'publisher' | 'advertiser';
        entityId?: number | string;
        currentNetworkId?: number | string | null;
        data?: Record<string, any>;
    };
    handleDialogContextSwitch?: (payload?: { state?: boolean }) => void;
};
