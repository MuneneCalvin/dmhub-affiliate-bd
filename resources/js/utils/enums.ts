
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LandingFeatureData, LandingStatData, LandingStepData } from '@/types/landing';

export enum SORT_ORDER {
    'Descending' = 'DESC',
    'Ascending' = 'ASC',
}

export enum EREGISTER_TYPE {
    ADVERTISER = 'advertiser',
    PUBLISHER = 'publisher',
}

export enum ENETWORKSTATUS_TYPE {
    ALL = 'all',
    A = 'A',
    P = 'P',
    D = 'D',
}

export enum EADVERTISERSTATUS_TYPE {
    ALL = '',
    VERIFIED = 'Verified',
    DISABLED = 'Disabled',
}

export enum DEFAULT_COMMISSION_MODEL {
    P = "Percentage",
    F = "Fixed",
}
export const COMMISSION_MODELS = Object.entries(DEFAULT_COMMISSION_MODEL).map(
    ([key, value]) => ({ key, value })
);

export enum PAYMENT_FREQUENCY {
    W = "Weekly",
    M = "Monthly",
}
export const FREQUENCY = Object.entries(PAYMENT_FREQUENCY).map(
    ([key, value]) => ({ key, value })
);

export enum HTTP_VERBS {
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    POST = 'POST',
    GET = 'GET',
    PUT = 'PUT',
}

export const VARIANTCOLOR: Record<
    "default" | "delete" | "update" | "primary", any
> = {
    default: "default",
    delete: "destructive",
    update: "secondary",
    primary: "primary",
};

export const DEVICES = [
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
];

export const CAMPAIGN_TERMS = [
    { value: 'no_incentivized_traffic', label: 'No Incentivized Traffic' },
    { value: 'no_brand_bidding', label: 'No Brand Bidding' },
    { value: 'email_marketing_allowed', label: 'Email Marketing Allowed' },
    { value: 'social_media_allowed', label: 'Social Media Allowed' },
    { value: 'no_adult_content', label: 'No Adult Content' },
    { value: 'no_pop_ups', label: 'No Pop-ups/Pop-unders' },
    { value: 'direct_linking_allowed', label: 'Direct Linking Allowed' },
    { value: 'coupon_sites_allowed', label: 'Coupon Sites Allowed' },
    { value: 'loyalty_cashback_allowed', label: 'Loyalty/Cashback Allowed' },
    { value: 'content_sites_only', label: 'Content Sites Only' },
];

export const CAMPAIGN_METADATA = [
    { value: 'high_payout', label: 'High Payout' },
    { value: 'new', label: 'New' },
    { value: 'featured', label: 'Featured' },
    { value: 'exclusive', label: 'Exclusive' },
    { value: 'limited_time', label: 'Limited Time' },
    { value: 'top_performer', label: 'Top Performer' },
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'recurring_commission', label: 'Recurring Commission' },
    { value: 'fast_approval', label: 'Fast Approval' },
    { value: 'global', label: 'Global' },
];

export const OFFER_BONUSES = [
    { value: 'performance_bonus', label: 'Performance Bonus' },
    { value: 'signup_bonus', label: 'Sign-up Bonus' },
    { value: 'volume_bonus', label: 'Volume Bonus' },
    { value: 'tiered_bonus', label: 'Tiered Bonus' },
    { value: 'milestone_bonus', label: 'Milestone Bonus' },
    { value: 'seasonal_bonus', label: 'Seasonal Bonus' },
    { value: 'loyalty_bonus', label: 'Loyalty Bonus' },
    { value: 'referral_bonus', label: 'Referral Bonus' },
    { value: 'first_conversion_bonus', label: 'First Conversion Bonus' },
    { value: 'exclusive_partner_bonus', label: 'Exclusive Partner Bonus' },
];

export const TRAFFIC_SOURCES = [
    { value: 'search_engine', label: 'Search Engine (SEO/SEM)' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'email_marketing', label: 'Email Marketing' },
    { value: 'display_ads', label: 'Display Ads' },
    { value: 'native_ads', label: 'Native Ads' },
    { value: 'content_marketing', label: 'Content Marketing' },
    { value: 'influencer', label: 'Influencer Marketing' },
    { value: 'push_notifications', label: 'Push Notifications' },
    { value: 'video_ads', label: 'Video Ads' },
    { value: 'pop_traffic', label: 'Pop Traffic (Pop-ups/Pop-unders)' },
    { value: 'direct_traffic', label: 'Direct Traffic' },
    { value: 'coupon_sites', label: 'Coupon/Deal Sites' },
    { value: 'cashback_loyalty', label: 'Cashback/Loyalty Sites' },
    { value: 'incentivized', label: 'Incentivized Traffic' },
    { value: 'adult_traffic', label: 'Adult Traffic' },
    { value: 'brand_bidding', label: 'Brand Bidding (PPC)' },
];

export const OFFER_TERMS = [
    { value: 'geo_restrictions', label: 'Geographic Restrictions Apply' },
    { value: 'age_verification', label: 'Age Verification Required' },
    { value: 'valid_email_required', label: 'Valid Email Required' },
    { value: 'unique_users_only', label: 'Unique Users Only' },
    { value: 'no_fraud_tolerance', label: 'Zero Fraud Tolerance' },
    { value: 'approval_required', label: 'Prior Approval Required' },
    { value: 'landing_page_required', label: 'Custom Landing Page Required' },
    { value: 'disclosure_required', label: 'Affiliate Disclosure Required' },
    { value: 'no_misleading_claims', label: 'No Misleading Claims' },
    { value: 'compliance_required', label: 'Regulatory Compliance Required' },
    { value: 'min_quality_score', label: 'Minimum Quality Score Required' },
    { value: 'capping_applies', label: 'Daily/Monthly Caps Apply' },
];

export const statusOptions = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" },
];

export const priorityOptions = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

export const CREATIVE_TYPES = [
    { value: 'banner', label: 'Banner' },
    { value: 'text', label: 'Text Link' },
    { value: 'html', label: 'HTML' },
    { value: 'email', label: 'Email' },
    { value: 'video', label: 'Video' },
];

export const LANDING_FEATURES: LandingFeatureData[] = [
    {
        iconName: 'BarChart3',
        title: 'Transparante Commissies',
        desc: 'Volledige inzicht in je verdiensten. Geen verborgen kosten, alleen eerlijke vergoedingen.',
    },
    {
        iconName: 'Zap',
        title: 'Snelle Uitbetalingen',
        desc: 'Ontvang je commissies snel en betrouwbaar via ons geautomatiseerde betalingssysteem.',
    },
    {
        iconName: 'LineChart',
        title: 'Real-time Analytics',
        desc: 'Volg je prestaties met gedetailleerde dashboards en rapporten.',
    },
    {
        iconName: 'Shield',
        title: 'Betrouwbaar Platform',
        desc: 'Een veilig en stabiel platform waar je op kunt bouwen.',
    },
    {
        iconName: 'Globe',
        title: 'Marketing Materialen',
        desc: 'Toegang tot professionele banners, links en content.',
    },
    {
        iconName: 'Users',
        title: 'Persoonlijke Support',
        desc: 'Dedicated accountmanagers om je te helpen groeien.',
    },
];

export const LANDING_STATS: LandingStatData[] = [
    { value: '€100M+', label: 'Uitbetaalde Commissies' },
    { value: '200+', label: 'Actieve Partners' },
    { value: '98%', label: 'Klanttevredenheid' },
    { value: '24/7', label: 'Platform Beschikbaarheid' },
];

export const LANDING_STEPS: LandingStepData[] = [
    {
        number: '01',
        title: 'Registreer je',
        desc: 'Meld je gratis aan en krijg direct toegang tot ons affiliate platform.',
    },
    {
        number: '02',
        title: 'Kies je campagnes',
        desc: 'Selecteer uit diverse campagnes die passen bij jouw doelgroep.',
    },
    {
        number: '03',
        title: 'Promoot & Verdien',
        desc: 'Deel je unieke links en verdien commissie op elke succesvolle conversie.',
    },
];

export const LANDING_NAV_LINKS = [
    { label: 'Voordelen', href: '#features' },
    { label: 'Hoe het werkt', href: '#how-it-works' },
    { label: 'Resultaten', href: '#stats' },
];

export const LANDING_HERO_CHECKMARKS = [
    'Gratis aanmelden',
    'Geen verborgen kosten',
    'Direct starten',
];

export enum ESTATUSTABS {
    P = 'Pending',
    A = 'Approved',
    R = 'Rejected',
    all = 'All'
}