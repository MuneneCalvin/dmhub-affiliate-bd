import { PoolProfile } from '@/components/pool-profile';
import { useDate } from '@/lib/format';
import { usePage } from '@inertiajs/react';
import { Building2, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PoolAdvertiser = {
    id: number;
    business_name: string | null;
    website_name: string | null;
    industry: string | null;
    coc_number: string | null;
    currency: string | null;
    total_budget: string | number | null;
    available_budget: string | number | null;
    status: string;
    is_verified: boolean;
    verified_at: string | null;
    auto_approve_publishers: boolean;
    user?: {
        first_name: string | null;
        last_name: string | null;
        email: string;
        created_at: string;
    } | null;
};

export default function PoolAdvertiserShow() {
    const { t, i18n } = useTranslation();
    const { advertiser: a } = usePage<{ advertiser: PoolAdvertiser }>().props;
    const formatDate = useDate();
    const contact = [a.user?.first_name, a.user?.last_name]
        .filter(Boolean)
        .join(' ');
    const name = a.business_name || contact || a.user?.email || '—';
    const amount = (value: string | number | null) =>
        value == null || value === ''
            ? null
            : `${a.currency ?? ''} ${new Intl.NumberFormat(i18n.language, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              }).format(Number(value))}`;
    const yes = (value: unknown) => t(value ? 'Yes' : 'No');

    return (
        <PoolProfile
            kind="advertiser"
            entity={a}
            name={name}
            verified={a.is_verified}
            chips={[
                { label: t('Advertiser'), tone: 'partners' },
                ...(a.industry
                    ? [{ label: a.industry, tone: 'analytics' as const }]
                    : []),
                ...(a.currency ? [{ label: a.currency }] : []),
            ]}
            sections={[
                {
                    title: t('Contact information'),
                    icon: <UserRound />,
                    tone: 'partners',
                    rows: [
                        { label: t('Name'), value: contact },
                        { label: t('Email'), value: a.user?.email },
                        {
                            label: t('Registered'),
                            value: formatDate(a.user?.created_at),
                        },
                    ],
                },
                {
                    title: t('Company details'),
                    icon: <Building2 />,
                    tone: 'partners',
                    rows: [
                        { label: t('Business Name'), value: a.business_name },
                        {
                            label: t('Website'),
                            value:
                                a.website_name &&
                                /^https?:\/\//i.test(a.website_name) ? (
                                    <a
                                        href={a.website_name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-brand-ink hover:underline"
                                    >
                                        {a.website_name}
                                    </a>
                                ) : (
                                    a.website_name
                                ),
                        },
                        { label: t('Industry'), value: a.industry },
                        {
                            label: t('Chamber of Commerce number'),
                            value: a.coc_number,
                        },
                    ],
                },
                {
                    title: t('Budget'),
                    icon: <Wallet />,
                    tone: 'finance',
                    rows: [
                        {
                            label: t('Total Budget'),
                            value: amount(a.total_budget),
                        },
                        {
                            label: t('Available Budget'),
                            value: amount(a.available_budget),
                        },
                        { label: t('Currency'), value: a.currency },
                    ],
                },
                {
                    title: t('Verification'),
                    icon: <ShieldCheck />,
                    tone: 'success',
                    rows: [
                        { label: t('Verified'), value: yes(a.is_verified) },
                        a.verified_at && {
                            label: t('Verified at'),
                            value: formatDate(a.verified_at),
                        },
                        {
                            label: t('Auto-approve publishers'),
                            value: yes(a.auto_approve_publishers),
                        },
                    ],
                },
            ]}
        />
    );
}
