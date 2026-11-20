export interface CampaignAlert {
    code: string;
    title: string;
    description: string;
    tab: string;
    action: string;
    blocks: boolean;
    values: Record<string, string>;
}

export interface CampaignOverview {
    publisher_view: boolean;
    role: string;
    campaign: {
        id: number;
        name: string;
        status: string;
        advertiser: string;
        network: string;
        currency: string;
        start_date: string | null;
        end_date: string | null;
    };
    period: { start: string; end: string };
    configured: boolean;
    traffic_eligible: boolean;
    alerts: CampaignAlert[];
    metrics: {
        clicks: number;
        conversions: number;
        sales: number;
        commissions: number;
    };
    lifecycle: {
        confirmed: number;
        pending: number;
        invoiced: number;
        paid: number;
    };
    applications: number;
    days: { date: string; conversions: number }[];
    budget: {
        spent: number;
        total_limit: number;
        daily_usage: number;
        daily_limit: number;
        available: number;
    } | null;
    earnings: { pending: number; approved: number; paid: number } | null;
    assignment: {
        id: number;
        status: string;
        offer: string | null;
        commission_type: string | null;
        commission_value: string | null;
        tracking_link: string | null;
    } | null;
    activity: {
        status: string;
        amount: number;
        currency: string;
        at: string;
    } | null;
    tools: Record<string, { href: string; label: string }>;
}
