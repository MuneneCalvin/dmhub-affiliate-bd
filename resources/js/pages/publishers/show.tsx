import { publisherCardEditors } from '@/components/partner-card-config';
import {
    PartnerCardEditor,
    type CardEditorConfig,
} from '@/components/partner-card-editor';
import {
    Details,
    Empty,
    Paging,
    Panel,
} from '@/components/partner-workspace-ui';
import { PublisherSettings } from '@/components/publisher-settings';
import { Button } from '@/components/ui/button';
import { BreadCrumbComponent } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import type { PublisherWorkspaceProps } from '@/types/publisher-workspace';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ExternalLink,
    FileText,
    Megaphone,
    MousePointerClick,
    Target,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../css/campaign-workspace.css';

const states: Record<string, string> = {
    A: 'Active',
    P: 'Pending',
    R: 'Rejected',
    I: 'Inactive',
    C: 'Closed',
    pending: 'Pending',
    approved: 'Approved',
    locked: 'Invoiced',
    payable: 'Awaiting payment',
    paid: 'Paid',
    rejected: 'Rejected',
    reversed: 'Reversed',
};
function Status({ value }: { value: string }) {
    const { t } = useTranslation();
    return (
        <span
            className={`campaign-badge ${['A', 'approved', 'paid'].includes(value) ? 'positive' : 'warning'}`}
        >
            {t(states[value] ?? value)}
        </span>
    );
}
function Table({
    headings,
    children,
}: {
    headings: string[];
    children: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40">
                    <tr>
                        {headings.map((label) => (
                            <th
                                key={label}
                                className="px-5 py-3 font-medium whitespace-nowrap text-muted-foreground"
                            >
                                {t(label)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">{children}</tbody>
            </table>
        </div>
    );
}

export default function Show() {
    const props = usePage<PublisherWorkspaceProps>().props;
    const { publisher: p, workspace: w } = props;
    const { permissions: can, activeTab: tab, summary } = w;
    const { t, i18n } = useTranslation();
    const [cardEditor, setCardEditor] = useState<CardEditorConfig | null>(null);
    const editors = publisherCardEditors(props);
    const editCard = (key: string) =>
        editors[key] ? () => setCardEditor(editors[key]) : undefined;
    const name = p.business_name || `${p.first_name} ${p.last_name}`;
    const base = `/publishers/show/${p.publisher_id}`;
    const tabUrl = (key: string) => `${base}?tab=${key}`;
    const date = (value: string | null) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
              }).format(new Date(value))
            : t('Not set');
    const money = (amount: number | string, currency: string) =>
        `${currency} ${new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount))}`;
    const num = (value: number) =>
        new Intl.NumberFormat(i18n.language).format(value);
    const yes = (value: unknown) => t(value ? 'Yes' : 'No');
    const list = (value: string | string[] | null) =>
        Array.isArray(value) ? value.join(', ') : value;
    const website =
        p.website_url && /^https?:\/\//i.test(p.website_url) ? (
            <a
                href={p.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
            >
                {p.website_url}
            </a>
        ) : (
            p.website_url
        );
    const currencies = [
        ...new Set(w.earningsSummary?.map((row) => row.currency) ?? []),
    ];
    const earningsSummary = (
        <section className="campaign-panel overflow-hidden">
            <div className="border-b p-5">
                <h2 className="text-lg font-semibold">
                    {t('Earnings by currency')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                        'Recorded commissions after reversals. Payout eligibility is checked separately.',
                    )}
                </p>
            </div>
            {currencies.length ? (
                <Table
                    headings={[
                        'Currency',
                        'Pending',
                        'Approved',
                        'Invoiced',
                        'Awaiting payment',
                        'Paid',
                        'Rejected',
                        'Reversed',
                    ]}
                >
                    {currencies.map((currency) => (
                        <tr key={currency}>
                            <td className="px-5 py-4 font-semibold">
                                {currency}
                            </td>
                            {[
                                'pending',
                                'approved',
                                'locked',
                                'payable',
                                'paid',
                                'rejected',
                                'reversed',
                            ].map((status) => (
                                <td
                                    key={status}
                                    className="px-5 py-4 whitespace-nowrap tabular-nums"
                                >
                                    {money(
                                        w.earningsSummary?.find(
                                            (row) =>
                                                row.currency === currency &&
                                                row.status === status,
                                        )?.amount ?? 0,
                                        currency,
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </Table>
            ) : (
                <Empty message="No recorded earnings for this publisher yet." />
            )}
        </section>
    );
    return (
        <AppLayout>
            <Head
                title={`${name} · ${t(w.tabs.find((item) => item.key === tab)?.label ?? 'Overview')}`}
            />
            <div className="workspace-page campaign-workspace">
                <div className="campaign-heading">
                    <div className="mb-4 text-xs">
                        <BreadCrumbComponent
                            breadcrumbs={[
                                {
                                    title: t(
                                        can.directory
                                            ? 'Publishers'
                                            : 'Marketplace',
                                    ),
                                    href: can.directory
                                        ? '/publishers/index'
                                        : '/publisher_dashboard/dashboard',
                                },
                                { title: name, href: base },
                            ]}
                        />
                    </div>
                    <div className="campaign-title-row">
                        <div className="campaign-title">
                            <h1>{name}</h1>
                            <Status value={p.status} />
                        </div>
                        <span className="campaign-role">{t(w.role)}</span>
                    </div>
                    <div className="campaign-meta">
                        <span>{t('Publisher')}</span>
                        <span>
                            {p.network_name || t('No network assigned')}
                        </span>
                        <span>{p.industry || p.user_name}</span>
                    </div>
                </div>
                <nav
                    className="campaign-tabs"
                    aria-label={t('Publisher navigation')}
                >
                    {w.tabs.map((item) => (
                        <Link
                            key={item.key}
                            href={tabUrl(item.key)}
                            preserveScroll
                            aria-current={tab === item.key ? 'page' : undefined}
                        >
                            {t(item.label)}
                        </Link>
                    ))}
                </nav>
                <div
                    id="publisher-content"
                    tabIndex={-1}
                    className="campaign-content"
                >
                    {tab === 'overview' && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Publisher overview')}</h2>
                                    <p>
                                        {t(
                                            'Campaign participation, earnings and account details in one workspace.',
                                        )}
                                    </p>
                                </div>
                                {can.discover && (
                                    <Button asChild>
                                        <Link href="/publisher_dashboard/dashboard">
                                            {t('Find campaigns')}
                                            <ArrowRight size={16} />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ...(can.campaigns
                                        ? [
                                              {
                                                  label: 'Active campaigns',
                                                  value: summary.activeCampaigns,
                                                  icon: Megaphone,
                                                  target: 'campaigns',
                                              },
                                          ]
                                        : []),
                                    ...(can.applications
                                        ? [
                                              {
                                                  label: 'Pending applications',
                                                  value: summary.pendingApplications,
                                                  icon: FileText,
                                                  target: 'applications',
                                              },
                                          ]
                                        : []),
                                    ...(can.performance
                                        ? [
                                              {
                                                  label: 'Total Clicks',
                                                  value: summary.clicks,
                                                  icon: MousePointerClick,
                                                  target: null,
                                              },
                                              {
                                                  label: 'Approved conversions',
                                                  value: summary.conversions,
                                                  icon: Target,
                                                  target: null,
                                              },
                                          ]
                                        : []),
                                ].map(
                                    ({ label, value, icon: Icon, target }) => {
                                        const content = (
                                            <>
                                                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                                                    <span>{t(label)}</span>
                                                    <Icon size={18} />
                                                </div>
                                                <p className="mt-3 text-2xl font-semibold tabular-nums">
                                                    {num(value ?? 0)}
                                                </p>
                                            </>
                                        );
                                        return target ? (
                                            <Link
                                                key={label}
                                                className="campaign-panel p-5 hover:border-primary"
                                                href={tabUrl(target)}
                                            >
                                                {content}
                                            </Link>
                                        ) : (
                                            <div
                                                key={label}
                                                className="campaign-panel p-5"
                                            >
                                                {content}
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Panel
                                    title={t('Publisher details')}
                                    onEdit={editCard('details')}
                                >
                                    <Details
                                        rows={[
                                            [
                                                t('Name'),
                                                `${p.first_name} ${p.last_name}`,
                                            ],
                                            [
                                                t('Business Name'),
                                                p.business_name,
                                            ],
                                            [t('Website URL'), website],
                                            [t('Network'), p.network_name],
                                            [
                                                t('Created'),
                                                date(p.publisher_created_at),
                                            ],
                                        ]}
                                    />
                                </Panel>
                                <Panel
                                    title={t('Account readiness')}
                                    onEdit={editCard('readiness')}
                                >
                                    <Details
                                        rows={[
                                            [
                                                t('Account status'),
                                                <Status
                                                    key="status"
                                                    value={p.status}
                                                />,
                                            ],
                                            [
                                                t('Verified publisher'),
                                                yes(p.is_verified),
                                            ],
                                            [
                                                t('Email verified'),
                                                yes(p.email_verified_at),
                                            ],
                                            [
                                                t('Last Active'),
                                                date(p.last_active_at),
                                            ],
                                        ]}
                                    />
                                    <Link
                                        href={tabUrl('account')}
                                        className="mt-5 inline-flex items-center gap-2 text-primary"
                                    >
                                        {t('View account')}
                                        <ArrowRight size={16} />
                                    </Link>
                                </Panel>
                            </div>
                            {can.earnings && earningsSummary}
                            <Panel title={t('Publisher tools')}>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {w.tabs
                                        .filter(
                                            (item) =>
                                                ![
                                                    'overview',
                                                    'account',
                                                ].includes(item.key),
                                        )
                                        .map((item) => (
                                            <Link
                                                key={item.key}
                                                href={tabUrl(item.key)}
                                                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                                            >
                                                <span>{t(item.label)}</span>
                                                <ArrowRight size={16} />
                                            </Link>
                                        ))}
                                </div>
                            </Panel>
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    'Figures cover all time within your access. Financial amounts remain separate by currency.',
                                )}
                            </p>
                        </>
                    )}
                    {['campaigns', 'applications', 'tracking'].includes(tab) &&
                        w.assignments && (
                            <>
                                <div className="campaign-overview-heading">
                                    <div>
                                        <h2>
                                            {t(
                                                tab === 'campaigns'
                                                    ? 'Campaigns'
                                                    : tab === 'applications'
                                                      ? 'Applications'
                                                      : 'Tracking',
                                            )}
                                        </h2>
                                        <p>
                                            {t(
                                                tab === 'campaigns'
                                                    ? 'Active campaign assignments for this publisher.'
                                                    : tab === 'applications'
                                                      ? 'Follow applications and open the available review tools.'
                                                      : 'Open tracking tools for an active assignment.',
                                            )}
                                        </p>
                                    </div>
                                    {tab === 'campaigns' && can.discover && (
                                        <Button asChild>
                                            <Link href="/publisher_dashboard/dashboard">
                                                {t('Find campaigns')}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <section className="campaign-panel overflow-hidden">
                                    {w.assignments.data.length ? (
                                        <Table
                                            headings={[
                                                'Campaign',
                                                'Offer',
                                                'Status',
                                                'Currency',
                                                'Actions',
                                            ]}
                                        >
                                            {w.assignments.data.map((a) => (
                                                <tr key={a.id}>
                                                    <td className="min-w-48 px-5 py-4">
                                                        <p className="font-semibold">
                                                            {a.campaign_name}
                                                        </p>
                                                        {tab ===
                                                            'applications' && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {t('Applied')}:{' '}
                                                                {date(
                                                                    a.applied_at,
                                                                )}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {a.offer_name ||
                                                            a.requested_offer_name ||
                                                            t('Not assigned')}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <Status
                                                            value={a.status}
                                                        />
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {a.currency}
                                                    </td>
                                                    <td className="min-w-44 px-5 py-4">
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                            {tab ===
                                                                'applications' &&
                                                                a.application_href && (
                                                                    <Link
                                                                        className="text-primary hover:underline"
                                                                        href={
                                                                            a.application_href
                                                                        }
                                                                    >
                                                                        {t(
                                                                            can.owner
                                                                                ? 'View application'
                                                                                : 'Review application',
                                                                        )}
                                                                    </Link>
                                                                )}
                                                            {tab ===
                                                                'tracking' &&
                                                                a.tracking_href && (
                                                                    <Link
                                                                        className="inline-flex items-center gap-2 text-primary hover:underline"
                                                                        href={
                                                                            a.tracking_href
                                                                        }
                                                                    >
                                                                        {t(
                                                                            can.scripts
                                                                                ? 'Open script tools'
                                                                                : 'Open tracking',
                                                                        )}
                                                                        <ExternalLink
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </Link>
                                                                )}
                                                            {a.campaign_href && (
                                                                <Link
                                                                    className="text-primary hover:underline"
                                                                    href={
                                                                        a.campaign_href
                                                                    }
                                                                >
                                                                    {t(
                                                                        'Open campaign',
                                                                    )}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Table>
                                    ) : (
                                        <Empty
                                            message={
                                                tab === 'applications'
                                                    ? 'No campaign applications for this publisher yet.'
                                                    : 'No active campaign assignments for this publisher yet.'
                                            }
                                        />
                                    )}
                                    <Paging page={w.assignments} />
                                </section>
                            </>
                        )}
                    {tab === 'earnings' && w.earnings && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Publisher earnings')}</h2>
                                    <p>
                                        {t(
                                            'Recorded commissions after reversals. Payout eligibility is checked separately.',
                                        )}
                                    </p>
                                </div>
                                {can.invoices && (
                                    <Button variant="outline" asChild>
                                        <Link href={tabUrl('invoices')}>
                                            {t('Invoices & payouts')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            {earningsSummary}
                            <section className="campaign-panel overflow-hidden">
                                {w.earnings.data.length ? (
                                    <Table
                                        headings={[
                                            'Date',
                                            'Commission',
                                            'Status',
                                            'Net amount',
                                        ]}
                                    >
                                        {w.earnings.data.map((e) => (
                                            <tr key={e.id}>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {date(e.created_at)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    #{e.id}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Status value={e.status} />
                                                </td>
                                                <td className="px-5 py-4 font-medium whitespace-nowrap tabular-nums">
                                                    {money(
                                                        Number(e.amount) -
                                                            e.reversed_minor /
                                                                100,
                                                        e.currency,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </Table>
                                ) : (
                                    <Empty message="No recorded earnings for this publisher yet." />
                                )}
                                <Paging page={w.earnings} />
                            </section>
                        </>
                    )}
                    {tab === 'invoices' && w.invoices && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Invoices & payouts')}</h2>
                                    <p>
                                        {t(
                                            'Open an invoice for line items, review status and payment details.',
                                        )}
                                    </p>
                                </div>
                                {can.requestPayout &&
                                    (w.payoutEligibility?.can_request ? (
                                        <Button asChild>
                                            <Link href="/publisher/invoices/create">
                                                {t('Request payout')}
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button disabled>
                                            {t('Request payout')}
                                        </Button>
                                    ))}
                            </div>
                            {(p.payout_threshold !== undefined ||
                                p.payout_method) && (
                                <Panel
                                    title={t('Payout preferences')}
                                    onEdit={editCard('payout')}
                                >
                                    <Details
                                        rows={[
                                            [
                                                t('Payout method'),
                                                p.payout_method
                                                    ? t(p.payout_method)
                                                    : t('Not set'),
                                            ],
                                            [
                                                t('Payout threshold'),
                                                p.payout_threshold,
                                            ],
                                        ]}
                                    />
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        {t(
                                            'The threshold applies separately to each network and currency.',
                                        )}
                                    </p>
                                </Panel>
                            )}
                            {w.payoutEligibility && (
                                <section className="campaign-panel overflow-hidden">
                                    <h3 className="border-b p-5 font-semibold">
                                        {t('Payout eligibility')}
                                    </h3>
                                    {w.payoutEligibility.groups.length ? (
                                        <Table
                                            headings={[
                                                'Network',
                                                'Available balance',
                                                'Remaining to threshold',
                                                'Status',
                                            ]}
                                        >
                                            {w.payoutEligibility.groups.map(
                                                (group) => (
                                                    <tr
                                                        key={`${group.network_id}-${group.currency}`}
                                                    >
                                                        <td className="px-5 py-4">
                                                            {p.network_id ===
                                                            group.network_id
                                                                ? p.network_name
                                                                : `${t('Network')} #${group.network_id}`}
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap tabular-nums">
                                                            {money(
                                                                group.available_amount,
                                                                group.currency,
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap tabular-nums">
                                                            {money(
                                                                group.remaining,
                                                                group.currency,
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {t(
                                                                group.can_request
                                                                    ? 'Eligible'
                                                                    : 'Below threshold',
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </Table>
                                    ) : (
                                        <Empty message="No approved earnings are available for payout yet." />
                                    )}
                                </section>
                            )}
                            <section className="campaign-panel overflow-hidden">
                                {w.invoices.data.length ? (
                                    <Table
                                        headings={[
                                            'Invoice',
                                            'Requested',
                                            'Amount',
                                            'Status',
                                            'Paid at',
                                        ]}
                                    >
                                        {w.invoices.data.map((invoice) => (
                                            <tr key={invoice.id}>
                                                <td className="px-5 py-4">
                                                    <Link
                                                        href={invoice.href}
                                                        className="font-semibold text-primary hover:underline"
                                                    >
                                                        {invoice.invoice_number}
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {date(invoice.requested_at)}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap tabular-nums">
                                                    {money(
                                                        invoice.amount,
                                                        invoice.currency,
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Status
                                                        value={invoice.status}
                                                    />
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {date(invoice.paid_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </Table>
                                ) : (
                                    <Empty message="No invoices for this publisher yet." />
                                )}
                                <Paging page={w.invoices} />
                            </section>
                        </>
                    )}
                    {tab === 'sites' && (
                        <div className="grid gap-5 lg:grid-cols-2">
                            <Panel
                                title={t('Website & business')}
                                onEdit={editCard('site')}
                            >
                                <Details
                                    rows={[
                                        [t('Website URL'), website],
                                        [t('Business Name'), p.business_name],
                                        [t('Industry'), p.industry],
                                        [
                                            t('Chamber of Commerce number'),
                                            p.coc_number,
                                        ],
                                    ]}
                                />
                                {can.edit && (
                                    <Link
                                        href={tabUrl('settings')}
                                        className="mt-5 inline-flex items-center gap-2 text-primary"
                                    >
                                        {t('Edit details')}
                                        <ArrowRight size={16} />
                                    </Link>
                                )}
                            </Panel>
                            <Panel
                                title={t('Traffic profile')}
                                onEdit={editCard('traffic')}
                            >
                                <Details
                                    rows={[
                                        [
                                            t('Traffic Sources'),
                                            list(p.traffic_sources),
                                        ],
                                        [
                                            t('Monthly Visitors'),
                                            p.monthly_visitors === null
                                                ? null
                                                : num(p.monthly_visitors),
                                        ],
                                        [
                                            t('Primary verticals'),
                                            list(p.primary_verticals),
                                        ],
                                        [
                                            t('Secondary verticals'),
                                            list(p.secondary_verticals),
                                        ],
                                    ]}
                                />
                                <p className="mt-4 text-sm text-muted-foreground">
                                    {t(
                                        'Traffic profile figures are supplied by the publisher.',
                                    )}
                                </p>
                            </Panel>
                        </div>
                    )}
                    {tab === 'account' && (
                        <div className="grid items-start gap-5 lg:grid-cols-2">
                            <Panel
                                title={t('User Information')}
                                onEdit={editCard('profile')}
                            >
                                <Details
                                    rows={[
                                        [
                                            t('Name'),
                                            `${p.first_name} ${p.last_name}`,
                                        ],
                                        [t('Username'), p.user_name],
                                        [t('Email'), p.email],
                                        [t('Title'), p.title],
                                        [t('Country'), p.country_iso],
                                        [t('Timezone'), p.timezone],
                                        [t('Language'), p.language],
                                        [t('Preferred currency'), p.currency],
                                    ]}
                                />
                            </Panel>
                            <div className="space-y-5">
                                <Panel title={t('Verification & security')}>
                                    <Details
                                        rows={[
                                            [
                                                t('Status'),
                                                <Status
                                                    key="account-status"
                                                    value={p.status}
                                                />,
                                            ],
                                            [
                                                t('Verified publisher'),
                                                yes(p.is_verified),
                                            ],
                                            [
                                                t('Email verified'),
                                                yes(p.email_verified_at),
                                            ],
                                            [
                                                t('Two-factor authentication'),
                                                yes(p.two_factor_confirmed_at),
                                            ],
                                            [
                                                t('Verified at'),
                                                date(p.verified_at),
                                            ],
                                            [
                                                t('Created'),
                                                date(p.publisher_created_at),
                                            ],
                                            [
                                                t('Updated'),
                                                date(p.publisher_updated_at),
                                            ],
                                        ]}
                                    />
                                </Panel>
                                <Panel title={t('Account roles')}>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            [p.is_publisher, 'Publisher'],
                                            [p.is_advertiser, 'Advertiser'],
                                            [p.is_super_admin, 'Super Admin'],
                                        ].map(([enabled, label]) =>
                                            enabled ? (
                                                <span
                                                    key={String(label)}
                                                    className="campaign-role"
                                                >
                                                    {t(String(label))}
                                                </span>
                                            ) : null,
                                        )}
                                    </div>
                                </Panel>
                            </div>
                        </div>
                    )}
                    {tab === 'settings' && <PublisherSettings {...props} />}
                </div>
            </div>
            {cardEditor && (
                <PartnerCardEditor
                    config={cardEditor}
                    onClose={() => setCardEditor(null)}
                />
            )}
        </AppLayout>
    );
}
