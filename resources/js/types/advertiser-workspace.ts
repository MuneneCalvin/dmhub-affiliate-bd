import type { WorkspacePage } from '@/types/partner-workspace';
export type { WorkspacePage } from '@/types/partner-workspace';

export type AdvertiserAccount = {
    id: number;
    advertiser_id: number;
    user_id: number;
    business_name: string;
    website_name: string | null;
    industry: string;
    coc_number: string | null;
    network_id: number | null;
    network_name: string | null;
    advertiser_currency: string;
    total_budget: string;
    credit_limit: string;
    advertiser_status: string;
    is_verified: boolean;
    verified_at: string | null;
    advertiser_created_at: string;
    advertiser_updated_at: string;
    auto_approve_publishers: boolean;
    require_publisher_approval: boolean;
    first_name: string;
    last_name: string;
    email: string;
    user_name: string;
    title: string | null;
    status: string;
    country_iso: string | null;
    timezone: string | null;
    language: string | null;
    email_verified_at: string | null;
    two_factor_confirmed_at: string | null;
    is_advertiser: boolean;
    is_publisher: boolean;
    is_super_admin: boolean;
};
export type AdvertiserWorkspace = {
    tabs: { key: string; label: string }[];
    activeTab: string;
    role: string;
    permissions: Record<
        | 'campaigns'
        | 'createCampaign'
        | 'materials'
        | 'terms'
        | 'manageTerms'
        | 'funding'
        | 'recordFunding'
        | 'settings'
        | 'editProfile'
        | 'edit'
        | 'activate'
        | 'deactivate'
        | 'changeNetwork'
        | 'directory',
        boolean
    >;
    summary: {
        campaigns: number | null;
        activeCampaigns: number | null;
        available: string | null;
        netFunded: number | null;
    };
    funded: boolean;
    campaigns: WorkspacePage<{
        id: number;
        name: string;
        campaign_status: string;
        currency: string;
        start_date: string;
        end_date: string | null;
    }> | null;
    materials: WorkspacePage<{
        id: number;
        name: string;
        type: string;
        status: string;
        campaign: { id: number; name: string };
    }> | null;
    terms: WorkspacePage<{
        id: number;
        advertiser_id: number | null;
        description: string;
    }> | null;
    funding: WorkspacePage<{
        id: number;
        kind: string;
        reference: string;
        created_at: string;
        currency: string;
        amount_minor: number;
    }> | null;
};
export type AdvertiserWorkspaceProps = {
    advertiser: AdvertiserAccount;
    workspace: AdvertiserWorkspace;
    networks: { id: number; network_name: string }[];
    currencies: { currency_code: string; currency_name: string }[];
};
