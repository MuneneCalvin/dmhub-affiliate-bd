import { PoolProfile } from '@/components/pool-profile';
import {
    PublisherChannels,
    type PublisherChannelRow,
} from '@/components/publisher-channels';
import { useCount, useDate } from '@/lib/format';
import { trafficSourceLabels } from '@/utils/campaign-display';
import { usePage } from '@inertiajs/react';
import { Activity, Globe2, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PoolPublisher = {
    id: number;
    publisher_type?: string | null;
    channels?: PublisherChannelRow[];
    business_name?: string | null;
    coc_number: string | null;
    website_url: string | null;
    monthly_visitors: number | null;
    traffic_sources: string[] | string | null;
    primary_verticals: string | string[] | null;
    secondary_verticals: string | string[] | null;
    payout_method: string | null;
    payout_threshold: string | number | null;
    total_clicks: number | null;
    total_conversions: number | null;
    total_earnings: string | number | null;
    conversion_rate: string | number | null;
    account_health_score: string | number | null;
    is_verified: boolean;
    verified_at: string | null;
    last_active_at: string | null;
    user?: {
        first_name: string | null;
        last_name: string | null;
        email: string;
        status: string;
        created_at: string;
    } | null;
};

const list = (value: string | string[] | null) =>
    Array.isArray(value) ? value.join(', ') : value;

export default function PoolPublisherShow() {
    const { t, i18n } = useTranslation();
    const { publisher: p } = usePage<{ publisher: PoolPublisher }>().props;
    const formatDate = useDate();
    const count = useCount();
    const decimal = (value: string | number | null, digits = 2) =>
        value == null || value === ''
            ? null
            : new Intl.NumberFormat(i18n.language, {
                  minimumFractionDigits: digits,
                  maximumFractionDigits: digits,
              }).format(Number(value));
    const contact = [p.user?.first_name, p.user?.last_name]
        .filter(Boolean)
        .join(' ');
    const name = p.business_name || contact || p.user?.email || '—';
    const sources = Array.isArray(p.traffic_sources) ? p.traffic_sources : [];

    return (
        <PoolProfile
            kind="publisher"
            entity={p}
            name={name}
            verified={p.is_verified}
            chips={[
                { label: t('Publisher'), tone: 'partners' },
                {
                    label: t(
                        p.publisher_type === 'individual'
                            ? 'Individual'
                            : 'Company',
                    ),
                    tone: 'brand' as const,
                },
                ...sources.slice(0, 3).map((source) => ({
                    label: (
                        <span className="capitalize">
                            {String(source).replaceAll('_', ' ')}
                        </span>
                    ),
                    tone: 'analytics' as const,
                })),
            ]}
            sections={[
                {
                    title: t('Contact information'),
                    icon: <UserRound />,
                    tone: 'partners',
                    rows: [
                        { label: t('Name'), value: contact },
                        { label: t('Email'), value: p.user?.email },
                        {
                            label: t('Registered as'),
                            value: t(
                                p.publisher_type === 'individual'
                                    ? 'Individual'
                                    : 'Company',
                            ),
                        },
                        {
                            label: t('Registered'),
                            value: formatDate(p.user?.created_at),
                        },
                        {
                            label: t('Chamber of Commerce number'),
                            value: p.coc_number,
                        },
                    ],
                },
                {
                    title: t('Channels'),
                    icon: <Globe2 />,
                    tone: 'analytics',
                    rows: [
                        {
                            label: t('Where they promote'),
                            value: <PublisherChannels channels={p.channels} />,
                        },
                    ],
                },
                {
                    title: t('Audience & sites'),
                    icon: <Globe2 />,
                    tone: 'analytics',
                    rows: [
                        {
                            label: t('Website'),
                            value:
                                p.website_url &&
                                /^https?:\/\//i.test(p.website_url) ? (
                                    <a
                                        href={p.website_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-ink hover:underline"
                                    >
                                        {p.website_url}
                                    </a>
                                ) : (
                                    p.website_url
                                ),
                        },
                        {
                            label: t('Monthly visitors'),
                            value: p.monthly_visitors
                                ? count(p.monthly_visitors)
                                : null,
                        },
                        {
                            label: t('Traffic sources'),
                            value: (
                                <span className="capitalize">
                                    {trafficSourceLabels(
                                        p.traffic_sources,
                                        '',
                                    ) || null}
                                </span>
                            ),
                        },
                        {
                            label: t('Primary verticals'),
                            value: list(p.primary_verticals),
                        },
                        {
                            label: t('Secondary verticals'),
                            value: list(p.secondary_verticals),
                        },
                    ],
                },
                {
                    title: t('Performance'),
                    icon: <Activity />,
                    tone: 'brand',
                    rows: [
                        {
                            label: t('Total Clicks'),
                            value: count(p.total_clicks),
                        },
                        {
                            label: t('Total Conversions'),
                            value: count(p.total_conversions),
                        },
                        {
                            label: t('Total Earnings'),
                            value: decimal(p.total_earnings ?? 0),
                        },
                        {
                            label: t('Conversion Rate'),
                            value: `${decimal(p.conversion_rate ?? 0)}%`,
                        },
                        {
                            label: t('Payout method'),
                            value: p.payout_method,
                        },
                        {
                            label: t('Payout threshold'),
                            value: decimal(p.payout_threshold),
                        },
                    ],
                },
                {
                    title: t('Verification'),
                    icon: <ShieldCheck />,
                    tone: 'success',
                    rows: [
                        {
                            label: t('User status'),
                            value:
                                p.user?.status === 'A'
                                    ? t('Active')
                                    : t('Inactive'),
                        },
                        {
                            label: t('Verified'),
                            value: t(p.is_verified ? 'Yes' : 'No'),
                        },
                        p.verified_at && {
                            label: t('Verified at'),
                            value: formatDate(p.verified_at),
                        },
                        {
                            label: t('Account health score'),
                            value: p.account_health_score
                                ? `${decimal(p.account_health_score, 1)}/100`
                                : null,
                        },
                        {
                            label: t('Last Active'),
                            value: p.last_active_at
                                ? formatDate(p.last_active_at)
                                : null,
                        },
                    ],
                },
            ]}
        />
    );
}
