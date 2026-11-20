import { CampaignAnalytics } from '@/components/campaign-analytics';
import { CampaignFinance } from '@/components/campaign-finance';
import { CampaignOffers } from '@/components/campaign-offers';
import { CampaignOverviewChart } from '@/components/campaign-overview-chart';
import {
    CampaignPublishers,
    PublisherAssignment,
} from '@/components/campaign-publishers';
import { CampaignSettings } from '@/components/campaign-settings';
import { CampaignTracking } from '@/components/campaign-tracking';
import { Button } from '@/components/ui/button';
import { BreadCrumbComponent } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import type { CampaignOverview } from '@/types/campaign-overview';
import { Head, Link, usePage, usePoll } from '@inertiajs/react';
import {
    ArrowLeft,
    ChartNoAxesColumnIncreasing,
    Check,
    CheckCircle2,
    CirclePause,
    Clock3,
    Copy,
    Database,
    File,
    FileText,
    Info,
    TriangleAlert,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../css/campaign-workspace.css';

const managerTabs = [
    ['overview', 'Overview'],
    ['offers', 'Offers & materials'],
    ['publishers', 'Publishers'],
    ['tracking', 'Tracking & integration'],
    ['analytics', 'Analytics'],
    ['finance', 'Finance'],
    ['settings', 'Settings'],
];
const publisherTabs = [
    ['overview', 'Overview'],
    ['offers', 'Offers & materials'],
    ['assignment', 'My assignment'],
    ['tracking', 'Tracking & integration'],
    ['analytics', 'Analytics'],
    ['finance', 'Earnings & payouts'],
];
const earningStates: Record<string, string> = {
    pending: 'commission awaiting review',
    approved: 'commission approved',
    locked: 'commission included in an invoice',
    payable: 'commission awaiting payment',
    paid: 'commission paid',
    rejected: 'commission rejected',
    reversed: 'commission reversed',
};

function Workspace() {
    const {
        props: { overview: data },
        url,
    } = usePage<SharedData & { overview: CampaignOverview }>();
    const { t, i18n } = useTranslation();
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
        'idle',
    );
    usePoll(60000, { only: ['overview'] });
    const {
        campaign,
        publisher_view: publisher,
        budget,
        earnings,
        assignment,
        lifecycle,
        metrics,
    } = data;
    const tabs = publisher ? publisherTabs : managerTabs;
    const requestedTab =
        new URLSearchParams(url.split('?')[1]).get('tab') || 'overview';
    const activeTab = tabs.some(([key]) => key === requestedTab)
        ? requestedTab
        : 'overview';
    const baseUrl = url.split('?')[0];
    const tabUrl = (tab: string) => `${baseUrl}?tab=${tab}`;
    const directory = publisher
        ? '/publishers/my/campaigns'
        : '/advertiser/campaigns/index';
    const num = (amount: number) =>
        new Intl.NumberFormat(i18n.language).format(amount);
    const money = (amount: number, currency = campaign.currency) =>
        `${currency} ${new Intl.NumberFormat(i18n.language, { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount)}`;
    const date = (value: string | null, fallback = 'Not set') =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
              }).format(new Date(value))
            : t(fallback);
    const link = assignment?.tracking_link;
    const copyLink = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopyState('copied');
        } catch {
            setCopyState('error');
        }
    };
    const attention = [
        ...(data.applications
            ? [
                  {
                      key: 'applications',
                      title: t('{{count}} publisher applications', {
                          count: data.applications,
                      }),
                      description: t(
                          data.tools.publishers
                              ? 'Review and approve or decline applications.'
                              : 'Publisher applications are awaiting review by your network.',
                      ),
                      tab: 'publishers',
                      action: t(
                          data.tools.publishers
                              ? 'Review applications'
                              : 'View applications',
                      ),
                      icon: Users,
                  },
              ]
            : []),
        ...(lifecycle.pending
            ? [
                  {
                      key: 'pending',
                      title: t('{{count}} commissions awaiting review', {
                          count: lifecycle.pending,
                      }),
                      description: t(
                          publisher || !data.tools.finance
                              ? 'Your confirmed outcomes are awaiting financial review.'
                              : 'Check outcomes and approve or reject.',
                      ),
                      tab: 'finance',
                      action: t(publisher ? 'View earnings' : 'Open finance'),
                      icon: FileText,
                  },
              ]
            : []),
        ...data.alerts.map((alert) => ({
            key: alert.code,
            title: t(
                alert.code === 'daily_cap' ? 'Daily cap reached' : alert.title,
            ),
            description: t(alert.description, alert.values),
            tab: alert.tab,
            action: t(alert.action),
            icon: TriangleAlert,
        })),
    ];
    const stages = [
        {
            title: 'Configured',
            value: t(data.configured ? 'Completed' : 'Setup needed'),
            icon: CheckCircle2,
            tone: data.configured ? 'positive' : 'warning',
        },
        {
            title: 'Traffic eligibility',
            value: t(data.traffic_eligible ? 'Eligible' : 'Paused'),
            icon: data.traffic_eligible ? CheckCircle2 : CirclePause,
            tone: data.traffic_eligible ? 'positive' : 'warning',
            badge: true,
        },
        {
            title: 'Confirmed outcomes',
            value: num(lifecycle.confirmed),
            icon: ChartNoAxesColumnIncreasing,
        },
        {
            title: 'Financial review',
            value: t('{{count}} awaiting review', { count: lifecycle.pending }),
            icon: File,
        },
        { title: 'Invoiced', value: num(lifecycle.invoiced), icon: FileText },
        { title: 'Paid', value: num(lifecycle.paid), icon: Database },
    ];
    return (
        <div className="workspace-page campaign-workspace">
            <Head
                title={`${campaign.name} · ${t(tabs.find(([key]) => key === activeTab)?.[1] ?? 'Overview')}`}
            />
            <div className="campaign-heading">
                <div className="mb-4 text-xs">
                    <BreadCrumbComponent
                        breadcrumbs={[
                            { title: t('Campaigns'), href: directory },
                            ...(data.tools.publisher
                                ? [
                                      {
                                          title: t('My publisher account'),
                                          href: data.tools.publisher.href,
                                      },
                                  ]
                                : []),
                            { title: campaign.name, href: baseUrl },
                        ]}
                    />
                </div>
                <div className="campaign-title-row">
                    <div className="campaign-title">
                        <h1>{campaign.name}</h1>
                        <span
                            className={`campaign-badge ${campaign.status === 'A' ? 'positive' : 'warning'}`}
                        >
                            {t(
                                campaign.status === 'A'
                                    ? 'Active'
                                    : campaign.status === 'P'
                                      ? 'Paused'
                                      : 'Inactive',
                            )}
                        </span>
                    </div>
                    <span className="campaign-role">{t(data.role)}</span>
                </div>
                <div className="campaign-meta">
                    <span>
                        {t('Advertiser')}:{' '}
                        {data.tools.advertiser ? (
                            <Link
                                href={data.tools.advertiser.href}
                                className="text-primary hover:underline"
                            >
                                {campaign.advertiser}
                            </Link>
                        ) : (
                            campaign.advertiser
                        )}
                    </span>
                    <span>{campaign.network}</span>
                    <span>{campaign.currency}</span>
                    <span>
                        {date(campaign.start_date)} –{' '}
                        {date(campaign.end_date, 'No end date')}
                    </span>
                    {publisher && assignment?.offer && (
                        <span>{assignment.offer}</span>
                    )}
                </div>
            </div>
            <nav
                className="campaign-tabs"
                aria-label={t('Campaign navigation')}
            >
                {tabs.map(([key, label]) => (
                    <Link
                        key={key}
                        href={tabUrl(key)}
                        preserveScroll
                        aria-current={activeTab === key ? 'page' : undefined}
                    >
                        {t(label)}
                    </Link>
                ))}
            </nav>
            <div
                id="campaign-content"
                tabIndex={-1}
                className="campaign-content"
            >
                {data.alerts.map((alert) => (
                    <div
                        className="campaign-alert"
                        key={alert.code}
                        role="status"
                    >
                        <TriangleAlert size={23} aria-hidden="true" />
                        <strong>{t(alert.title)}</strong>
                        <span>{t(alert.description, alert.values)}</span>
                        <Link href={tabUrl(alert.tab)} preserveScroll>
                            {t(alert.action)}
                        </Link>
                    </div>
                ))}
                {activeTab === 'overview' ? (
                    <>
                        <div className="campaign-overview-heading">
                            <div>
                                <h2>
                                    {t(
                                        publisher
                                            ? 'Your campaign overview'
                                            : 'Campaign overview',
                                    )}
                                </h2>
                                <p>
                                    {date(data.period.start)} –{' '}
                                    {date(data.period.end)} · UTC
                                    {publisher && (
                                        <> · {t('Your assignment only')}</>
                                    )}
                                </p>
                            </div>
                            {publisher && link && (
                                <Button onClick={copyLink}>
                                    <Copy size={16} />
                                    {t(
                                        copyState === 'copied'
                                            ? 'Copied'
                                            : 'Copy tracking link',
                                    )}
                                </Button>
                            )}
                        </div>
                        {publisher && copyState === 'error' && (
                            <p role="alert">
                                {t(
                                    'Could not copy the link. Select and copy it below.',
                                )}
                            </p>
                        )}
                        <section
                            className="campaign-lifecycle"
                            aria-label={t('Campaign lifecycle, all time')}
                            title={t(
                                'Lifecycle counts are all time; invoiced and paid count distinct invoices.',
                            )}
                        >
                            {stages.map(
                                ({ title, value, icon: Icon, tone, badge }) => (
                                    <div className="campaign-stage" key={title}>
                                        <Icon
                                            className={tone || ''}
                                            size={25}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <h3>{t(title)}</h3>
                                            <span
                                                className={
                                                    badge
                                                        ? `campaign-badge ${tone}`
                                                        : ''
                                                }
                                            >
                                                {value}
                                            </span>
                                        </div>
                                    </div>
                                ),
                            )}
                        </section>
                        <section
                            className="campaign-kpis"
                            aria-label={t('Performance in the selected period')}
                        >
                            {[
                                ['Clicks', num(metrics.clicks)],
                                [
                                    'Approved conversions',
                                    num(metrics.conversions),
                                ],
                                ['Net approved sales', money(metrics.sales)],
                                [
                                    'Net approved commissions',
                                    money(metrics.commissions),
                                ],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <h3>{t(label)}</h3>
                                    <p>{value}</p>
                                </div>
                            ))}
                        </section>
                        <div className="campaign-main-grid">
                            <section className="campaign-panel campaign-chart-panel">
                                <h3>{t('Daily approved conversions')}</h3>
                                <CampaignOverviewChart days={data.days} />
                                {metrics.conversions === 0 && (
                                    <p className="campaign-empty-chart">
                                        {t(
                                            lifecycle.pending
                                                ? 'Confirmed outcomes are awaiting financial review. Approved conversions will appear here.'
                                                : 'No approved conversions in this period yet.',
                                        )}
                                    </p>
                                )}
                            </section>
                            <section className="campaign-panel campaign-attention">
                                <h3>{t('Needs attention')}</h3>
                                {attention.length ? (
                                    <div className="campaign-attention-list">
                                        {attention.map(
                                            ({
                                                key,
                                                title,
                                                description,
                                                tab,
                                                action,
                                                icon: Icon,
                                            }) => (
                                                <div
                                                    className="campaign-attention-row"
                                                    key={key}
                                                >
                                                    <Icon
                                                        size={23}
                                                        className={
                                                            Icon ===
                                                            TriangleAlert
                                                                ? 'warning'
                                                                : ''
                                                        }
                                                        aria-hidden="true"
                                                    />
                                                    <div>
                                                        <h4>{title}</h4>
                                                        <p>{description}</p>
                                                    </div>
                                                    <Link
                                                        href={tabUrl(tab)}
                                                        preserveScroll
                                                        className="campaign-action"
                                                    >
                                                        {action}
                                                    </Link>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="campaign-clear">
                                        <CheckCircle2
                                            size={24}
                                            className="positive"
                                        />
                                        <div>
                                            <h4>{t('You’re all caught up')}</h4>
                                            <p>
                                                {t(
                                                    'No campaign issues need attention right now.',
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                        {budget && (
                            <section className="campaign-panel campaign-budget">
                                <h3>{t('Budget')}</h3>
                                <div className="campaign-budget-grid">
                                    <div>
                                        <h4>
                                            {t('Campaign net commission spend')}
                                        </h4>
                                        <p>
                                            <strong>
                                                {money(budget.spent)}
                                            </strong>{' '}
                                            /{' '}
                                            {budget.total_limit > 0
                                                ? money(budget.total_limit)
                                                : t('No limit')}
                                        </p>
                                        <span>
                                            {t('Includes pending commissions.')}
                                        </span>
                                    </div>
                                    <div>
                                        <h4>{t("Today's gross usage")}</h4>
                                        <p>
                                            <strong>
                                                {money(budget.daily_usage)}
                                            </strong>{' '}
                                            /{' '}
                                            {budget.daily_limit > 0
                                                ? money(budget.daily_limit)
                                                : t('No limit')}
                                        </p>
                                        <span>
                                            {t(
                                                'UTC day · reversals do not reduce daily usage.',
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <h4>
                                            {t('Advertiser available balance')}
                                        </h4>
                                        <p>
                                            <strong>
                                                {money(budget.available)}
                                            </strong>
                                        </p>
                                        <span>
                                            {t(
                                                'Shared across all {{advertiser}} campaigns.',
                                                {
                                                    advertiser:
                                                        campaign.advertiser,
                                                },
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}
                        {earnings && (
                            <section className="campaign-panel campaign-budget">
                                <h3>
                                    {t('Your earnings')}{' '}
                                    <small>
                                        {t('All time · this assignment')}
                                    </small>
                                </h3>
                                <div className="campaign-budget-grid">
                                    {[
                                        [
                                            'Awaiting review',
                                            earnings.pending,
                                            'Confirmed commissions awaiting financial review.',
                                        ],
                                        [
                                            'Approved, not invoiced',
                                            earnings.approved,
                                            'Payout eligibility also depends on your account threshold and recoveries.',
                                        ],
                                        [
                                            'Paid commissions',
                                            earnings.paid,
                                            'Net commissions with recorded payment.',
                                        ],
                                    ].map(([label, value, note]) => (
                                        <div key={String(label)}>
                                            <h4>{t(String(label))}</h4>
                                            <p>
                                                <strong>
                                                    {money(Number(value))}
                                                </strong>
                                            </p>
                                            <span>{t(String(note))}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {publisher && (
                            <section className="campaign-panel campaign-promotion">
                                <div>
                                    <h3>{t('Promote this campaign')}</h3>
                                    <p>
                                        {t(
                                            link
                                                ? 'Use your personal tracking link for attributed traffic.'
                                                : 'Your tracking link will be available after your assignment is approved and configured.',
                                        )}
                                    </p>
                                </div>
                                {link && (
                                    <div className="campaign-copy">
                                        <input
                                            aria-label={t('Your tracking link')}
                                            value={link}
                                            readOnly
                                            onFocus={(event) =>
                                                event.target.select()
                                            }
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={copyLink}
                                            aria-label={t('Copy tracking link')}
                                        >
                                            {copyState === 'copied' ? (
                                                <Check size={16} />
                                            ) : (
                                                <Copy size={16} />
                                            )}
                                        </Button>
                                    </div>
                                )}
                                <Link
                                    href={tabUrl('offers')}
                                    className="campaign-text-action"
                                >
                                    {t('Get materials')}
                                </Link>
                                <Link
                                    href={tabUrl('finance')}
                                    className="campaign-text-action"
                                >
                                    {t('View earnings')}
                                </Link>
                                <span className="sr-only" role="status">
                                    {copyState === 'copied'
                                        ? t('Tracking link copied')
                                        : ''}
                                </span>
                            </section>
                        )}
                        <section className="campaign-activity">
                            <h3>{t('Recent activity')}</h3>
                            <Clock3 size={20} aria-hidden="true" />
                            {data.activity ? (
                                <p>
                                    {t(
                                        data.activity.status === 'pending'
                                            ? 'Outcome confirmed'
                                            : 'Commission updated',
                                    )}{' '}
                                    ·{' '}
                                    {money(
                                        data.activity.amount,
                                        data.activity.currency,
                                    )}{' '}
                                    {t(
                                        earningStates[data.activity.status] ||
                                            'commission updated',
                                    )}
                                    .{' '}
                                    <time dateTime={data.activity.at}>
                                        {date(data.activity.at)} · UTC
                                    </time>
                                </p>
                            ) : (
                                <p>
                                    {t(
                                        'No commission activity yet. Confirmed outcomes will appear here.',
                                    )}
                                </p>
                            )}
                        </section>
                        <p className="campaign-scope-note">
                            <Info size={14} />
                            {t(
                                'Performance covers the last 30 UTC days. Lifecycle and financial balances are all time. Figures refresh every minute.',
                            )}
                        </p>
                    </>
                ) : activeTab === 'publishers' && !publisher ? (
                    <CampaignPublishers campaign={campaign} />
                ) : activeTab === 'assignment' && publisher ? (
                    <PublisherAssignment campaign={campaign} />
                ) : activeTab === 'settings' && !publisher ? (
                    <CampaignSettings campaign={campaign} />
                ) : activeTab === 'finance' ? (
                    <CampaignFinance />
                ) : activeTab === 'analytics' ? (
                    <CampaignAnalytics />
                ) : activeTab === 'tracking' ? (
                    <CampaignTracking />
                ) : activeTab === 'offers' ? (
                    <CampaignOffers campaign={campaign} publisher={publisher} />
                ) : (
                    <section className="campaign-panel campaign-coming-soon">
                        <Clock3 size={30} />
                        <h2>
                            {t(
                                tabs.find(([key]) => key === activeTab)?.[1] ??
                                    'Overview',
                            )}
                        </h2>
                        <p className="campaign-coming-title">
                            {t('Coming soon')}
                        </p>
                        <p>
                            {t(
                                'This campaign workspace section is being prepared. Your overview is available now.',
                            )}
                        </p>
                        <div>
                            {data.tools[activeTab] && (
                                <Link
                                    href={data.tools[activeTab].href}
                                    className="campaign-action"
                                >
                                    {t(data.tools[activeTab].label)}
                                </Link>
                            )}
                            <Link
                                href={tabUrl('overview')}
                                className="campaign-text-action"
                            >
                                <ArrowLeft size={16} />
                                {t('Back to overview')}
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default function CampaignWorkspace() {
    return (
        <AppLayout>
            <Workspace />
        </AppLayout>
    );
}
