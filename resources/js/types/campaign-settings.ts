export type CampaignSettingsValues = {
    name: string;
    description: string;
    campaign_status: string;
    start_date: string;
    end_date: string;
    no_end_date: boolean;
    total_budget: string;
    daily_budget: string;
    max_publishers: string;
    country_filter: 'all' | 'selected';
    countries: string[];
    devices: string[];
    target_conversions: string;
    target_roi: string;
    tags: string[];
    terms: string[];
};

export type CampaignSettingsWorkspace = {
    can_edit: boolean;
    save_url: string;
    terms_url: string;
    values: CampaignSettingsValues;
    countries: { country_iso: string; country_name: string }[];
    terms: { id: number; description: string }[];
    publishers: { active: number; inactive: number };
};
