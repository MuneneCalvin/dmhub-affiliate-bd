export type AnalyticsMetrics = {
    clicks: number;
    conversions: number;
    sales: number;
    commissions: number;
    purchases: number;
    conversion_rate: number;
    earnings_per_click: number;
};
export type AnalyticsWorkspace = {
    publisher_view: boolean;
    currency: string;
    filters: {
        start: string;
        end: string;
        offer: number | null;
        publisher: number | null;
        group: 'offer' | 'publisher';
    };
    offers: { id: number; name: string }[];
    publishers: { id: number; name: string }[];
    metrics: AnalyticsMetrics;
    pending: number;
    days: (AnalyticsMetrics & { date: string })[];
    breakdowns: {
        offer: (AnalyticsMetrics & { id: number; name: string })[];
        publisher?: (AnalyticsMetrics & { id: number; name: string })[];
    };
    export_url: string;
};
