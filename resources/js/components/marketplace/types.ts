export type MarketplaceOffer = {
    id: number;
    name: string;
    description?: string | null;
    offer_status: string;
    commission_type_1?: string | null;
    commission_value_1?: string | number | null;
    commission_type_2?: string | null;
    commission_value_2?: string | number | null;
    click_cookie_lifetime_hours?: number | null;
    conversion_window_hours?: number | null;
    preview_url?: string | null;
    bonus?: unknown;
};

export type MarketplaceEnrollment = {
    id: number;
    status: string;
    rejection_reason?: string | null;
};

export type MarketplaceCampaign = {
    id: number;
    name: string;
    description?: string | null;
    campaign_status: string;
    currency: string | null;
    total_budget?: string | number | null;
    spent_amount?: string | number | null;
    daily_budget?: string | number | null;
    minimum_payout?: string | number | null;
    start_date?: string | null;
    end_date?: string | null;
    max_publishers?: number | null;
    target_conversions?: number | null;
    target_roi?: string | number | null;
    geo_targeting?: { value?: string } | null;
    device_targeting?: { value?: string } | null;
    allowed_traffic_sources?: string | null;
    prohibited_traffic_sources?: string | null;
    terms?: unknown;
    epc?: number | null;
    advertiser?: {
        business_name?: string | null;
        industry?: string | null;
    } | null;
    enrollment: MarketplaceEnrollment | null;
    offers?: MarketplaceOffer[];
};

/** What the card's main button does, by application status. */
export type CampaignCta = 'apply' | 'links' | 'details';

export function campaignCta(campaign: MarketplaceCampaign): CampaignCta {
    const status = campaign.enrollment?.status;
    if (status === 'A') return 'links';
    if (!status) return 'apply';
    return 'details';
}

/** Applying is possible for a live campaign that is not already joined. */
export function canApply(campaign: MarketplaceCampaign): boolean {
    const ended = campaign.end_date
        ? new Date(campaign.end_date) < new Date()
        : false;
    return (
        campaign.campaign_status === 'A' &&
        !ended &&
        !['A', 'I'].includes(campaign.enrollment?.status ?? '')
    );
}

/** Application codes mean something different from campaign codes ("A" = approved). */
export function applicationStatus(campaign: MarketplaceCampaign): string {
    const code = campaign.enrollment?.status;
    if (!code) return 'not_applied';
    return (
        { A: 'approved', P: 'pending', R: 'rejected', I: 'inactive' }[code] ??
        code
    );
}
