import type { WorkspacePage } from '@/types/partner-workspace';
export type PublisherAccount = {
    publisher_id: number;
    publisher_type?: string | null;
    channels?: { type: string; handle: string }[];
    user_id: number;
    business_name: string | null;
    industry: string | null;
    first_name: string;
    last_name: string;
    email: string;
    user_name: string;
    title: string | null;
    status: string;
    currency: string | null;
    country_iso: string | null;
    timezone: string | null;
    language: string | null;
    network_id: number | null;
    network_name: string | null;
    website_url: string | null;
    traffic_sources: string[] | null;
    monthly_visitors: number | null;
    primary_verticals: string | string[] | null;
    secondary_verticals: string | string[] | null;
    coc_number: string | null;
    is_verified: boolean;
    verified_at: string | null;
    email_verified_at: string | null;
    two_factor_confirmed_at: string | null;
    last_active_at: string | null;
    publisher_created_at: string;
    publisher_updated_at: string;
    is_advertiser: boolean;
    is_publisher: boolean;
    is_super_admin: boolean;
    payout_threshold?: string;
    payout_method?: string | null;
};
export type PublisherAssignment = {
    id: number;
    campaign_id: number;
    campaign_name: string;
    currency: string;
    status: string;
    offer_name: string | null;
    requested_offer_name: string | null;
    applied_at: string | null;
    campaign_href: string | null;
    application_href: string | null;
    tracking_href: string | null;
};
export type PublisherWorkspace = {
    tabs: { key: string; label: string }[];
    activeTab: string;
    role: string;
    permissions: Record<
        | 'owner'
        | 'directory'
        | 'campaigns'
        | 'applications'
        | 'apply'
        | 'discover'
        | 'tracking'
        | 'scripts'
        | 'performance'
        | 'earnings'
        | 'invoices'
        | 'requestPayout'
        | 'settings'
        | 'editProfile'
        | 'editSites'
        | 'editPayout'
        | 'edit'
        | 'activate'
        | 'deactivate'
        | 'changeNetwork',
        boolean
    >;
    summary: {
        activeCampaigns: number | null;
        pendingApplications: number | null;
        clicks: number | null;
        conversions: number | null;
    };
    earningsSummary:
        | {
              currency: string;
              status: string;
              amount: number | string;
              count: number;
          }[]
        | null;
    assignments: WorkspacePage<PublisherAssignment> | null;
    earnings: WorkspacePage<{
        id: number;
        publisher_campaign_id: number;
        amount: string;
        reversed_minor: number;
        currency: string;
        status: string;
        created_at: string;
    }> | null;
    invoices: WorkspacePage<{
        id: number;
        invoice_number: string;
        amount: string;
        currency: string;
        status: string;
        requested_at: string | null;
        paid_at: string | null;
        href: string;
    }> | null;
    payoutEligibility: {
        can_request: boolean;
        groups: {
            network_id: number;
            currency: string;
            available_amount: string;
            threshold: string;
            remaining: string;
            can_request: boolean;
        }[];
    } | null;
};
export type PublisherWorkspaceProps = {
    publisher: PublisherAccount;
    workspace: PublisherWorkspace;
    networks: { id: number; network_name: string }[];
    currencies: { currency_code: string; currency_name: string }[];
};
