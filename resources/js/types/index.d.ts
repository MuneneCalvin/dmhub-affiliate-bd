/* eslint-disable @typescript-eslint/no-explicit-any */
import { SORT_ORDER } from '@/utils/enums';
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface Auth {
    user: User;
    permissions: string[];
}

export interface LanguageProviderProps {
    children: ReactNode;
}

export interface LocaleData {
    current: string;
    fallback: string;
    available: Record<
        string,
        { name: string; native: string; regional: string }
    >;
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
export type TClassType = { className: string };
export interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}
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
};
export type TCountry = {
    country_iso: string;
    country_name: string;
    status: string;
};

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

export type TNotifs = {
    message: string;
    unread: boolean;
    avatar?: string;
    color: string;
    time: string;
    type: string;
} & Pick<BASE_PAYLOAD_TYPES>;

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

export type TCustomDialogPropsContextProps<T = TKeyValueStringType> = {
    componentProps?: T;
} & TComponent<T> &
    Pick<TProfileMenuItems, 'state'>;

export type TCustomDialogProps<T = TKeyValueStringType> = {
    handleDialogContextSwitch: (
        context: TCustomDialogPropsContextProps<T>,
    ) => void;
    children: ReactNode;
    toggleDialog: () => any;
    dialogOpen: boolean;
} & Partial<TClassType>;

export type TNetwork = {
    approved_at: string | null;
    approved_by: string | null;
    country_iso: string;
    default_commission_model: string;
    requires_prepaid_funding: boolean;
    default_commission_value: string;
    default_currency: string;
    logo_url: string;
    min_payment_threshold: string;
    network_name: string;
    owner_email: string;
    pay_day_of_month: number;
    pay_day_of_week: number;
    payment_frequency: string;
    settings: any | null;
    status: string;
    support_email: string;
    support_phone: string;
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

export const httpQueryParamsGenerator = (params: TQParamsGenProps) =>
    qs.stringify(params, { encode: true });

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

export type TPublisher = {} & BASE_PAYLOAD_TYPES;

export type EditAdvertiserProps = {
    componentProps: {
        data: any;
    };
    handleDialogContextSwitch: (payload: any) => void;
};
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

export type TTerms = {
    description: string;
    advertiser_id: number;
    deleted_at: string;
    [key: string]: any;
} & BASE_PAYLOAD_TYPES;

export type TCampaign = {
    enrollment?: { status: string; rejection_reason?: string | null } | null;
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
    currency?: string;
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
    /** Loaded on the offer show/edit pages. */
    campaign?: { id: number; name: string; currency?: string } | null;
    // Display aliases derived from offer_commissions.
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
    invoice_amount?: string;
    currency: string | null;
    network_id: number;
    reversed_minor: number;
    id: number;
    amount: string;
    commission_type: string;
    status: string;
    created_at: string;
    publisher_campaign?: {
        campaign?: { name: string };
        offer?: { name: string };
    };
    invoice?: { invoice_number: string };
}

export interface CampaignScript {
    id: number;
    campaign_name: string;
    offer_name: string;
    script_token: string;
    script_url: string;
    embed_tag: string;
    tracking_link: string;
    /** `installed` once the SDK has loaded at least once. */
    install_status?: 'installed' | 'not_seen';
    script_loads?: number;
    clicks?: number;
    last_click_at?: string | null;
    sdk_config?: {
        sdk_version: number;
        popup_supported: boolean;
        methods: string[];
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
    requested_offer_name?: string | null;
    website_url: string;
    applied_at: string;
    created_at: string;
}

export interface ApplicationDetails extends ApplicationData {
    currency: string;
    commission_type_1?: string | null;
    requested_offer_id?: number | null;
    terms_accepted_at?: string | null;
    terms_version?: string | null;
    terms_snapshot?: {
        campaign_terms: unknown;
        offer_terms: unknown;
        currency: string;
        commissions: { type: string; value: string }[];
    } | null;
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
