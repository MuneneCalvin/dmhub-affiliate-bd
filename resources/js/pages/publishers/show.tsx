import {
    ActionTile,
    LinkTabs,
    ProfileBanner,
    StatCard,
} from '@/components/app';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ChangeNetworkForm } from '@/components/change-network-form';
import { publisherCardEditors } from '@/components/partner-card-config';
import {
    PartnerCardEditor,
    type CardEditorConfig,
} from '@/components/partner-card-editor';
import { PartnerProfile } from '@/components/partner-profile';
import {
    Details,
    Empty,
    Paging,
    Panel,
} from '@/components/partner-workspace-ui';
import { ProfileCard, ProfileDetails } from '@/components/profile-ui';
import { PublisherSettings } from '@/components/publisher-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    TableHead,
    TableHeader,
    TableRow,
    Table as UiTable,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { PublisherWorkspaceProps } from '@/types/publisher-workspace';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    ArrowRight,
    Coins,
    ExternalLink,
    FileText,
    Globe2,
    Megaphone,
    MousePointerClick,
    Newspaper,
    Pencil,
    Receipt,
    Settings,
    ShieldCheck,
    Target,
    UserRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
const keywords: Record<string, string> = {
    A: 'active',
    P: 'pending',
    R: 'rejected',
    I: 'inactive',
    C: 'inactive',
};
function Status({ value }: { value: string }) {
    const { t } = useTranslation();
    return (
        <StatusBadge
            status={keywords[value] ?? value}
            label={t(states[value] ?? value)}
        />
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
        <UiTable className="[&_tbody_td]:px-4 [&_tbody_td]:py-3.5 [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_tbody_tr:hover]:bg-surface-muted">
            <TableHeader>
                <TableRow>
                    {headings.map((label) => (
                        <TableHead key={label}>{t(label)}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <tbody>{children}</tbody>
        </UiTable>
    );
}

const TAB_ICONS: Record<string, ReactNode> = {
    overview: <Newspaper />,
    campaigns: <Megaphone />,
    applications: <FileText />,
    tracking: <MousePointerClick />,
    earnings: <Coins />,
    invoices: <Receipt />,
    sites: <Globe2 />,
    account: <UserRound />,
    settings: <Settings />,
};

export default function Show() {
    const props = usePage<PublisherWorkspaceProps>().props;
    const { publisher: p, workspace: w } = props;
    const { permissions: can, activeTab: tab, summary } = w;
    const { t, i18n } = useTranslation();
    const [cardEditor, setCardEditor] = useState<CardEditorConfig | null>(null);
    const [changingNetwork, setChangingNetwork] = useState(false);
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
                className="text-brand-ink underline"
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
        <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
            <div className="border-b border-border px-[22px] py-5">
                <h2 className="text-lg font-semibold">
                    {t('Earnings by currency')}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
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
            <div className="workspace-page flex flex-col gap-[22px]">
                <Breadcrumbs
                    breadcrumbs={[
                        {
                            title: t(
                                can.directory ? 'Publishers' : 'Marketplace',
                            ),
                            href: can.directory
                                ? '/publishers/index'
                                : '/publisher_dashboard/dashboard',
                        },
                        { title: name, href: base },
                    ]}
                />
                <ProfileBanner
                    name={name}
                    status={<Status value={p.status} />}
                    chips={[
                        { label: t('Publisher'), tone: 'partners' },
                        ...(p.traffic_sources ?? [])
                            .slice(0, 3)
                            .map((source) => ({
                                label: (
                                    <span className="capitalize">
                                        {String(source).replaceAll('_', ' ')}
                                    </span>
                                ),
                                tone: 'analytics' as const,
                            })),
                        { label: p.network_name || t('No network assigned') },
                        {
                            label: t('Member since {{date}}', {
                                date: new Intl.DateTimeFormat(i18n.language, {
                                    month: 'short',
                                    year: 'numeric',
                                    timeZone: 'UTC',
                                }).format(new Date(p.publisher_created_at)),
                            }),
                        },
                    ]}
                    actions={
                        <>
                            <Badge variant="secondary" className="h-11 px-3.5">
                                {t(w.role)}
                            </Badge>
                            {can.changeNetwork && (
                                <Button
                                    variant="secondary"
                                    onClick={() => setChangingNetwork(true)}
                                >
                                    <ArrowLeftRight className="text-partners" />
                                    {t('Change network')}
                                </Button>
                            )}
                            {editors.profile && (
                                <Button onClick={editCard('profile')}>
                                    <Pencil />
                                    {t('Edit profile')}
                                </Button>
                            )}
                        </>
                    }
                />
                <LinkTabs
                    label={t('Publisher navigation')}
                    current={tab}
                    tabs={w.tabs.map((item) => ({
                        key: item.key,
                        label: t(item.label),
                        href: tabUrl(item.key),
                        icon: TAB_ICONS[item.key],
                    }))}
                />
                <div
                    id="publisher-content"
                    tabIndex={-1}
                    className="flex flex-col gap-[18px]"
                >
                    {tab === 'overview' && (
                        <>
                            <div className="flex flex-wrap items-end justify-between gap-4 [&_h2]:text-lg [&_h2]:font-extrabold [&_p]:text-sm [&_p]:text-ink-muted">
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
                            <section
                                aria-label={t('Performance')}
                                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5"
                            >
                                {can.campaigns && (
                                    <StatCard
                                        variant="solid"
                                        tone="brand"
                                        label={t('Active campaigns')}
                                        value={num(
                                            summary.activeCampaigns ?? 0,
                                        )}
                                        icon={<Megaphone />}
                                    />
                                )}
                                {can.applications && (
                                    <StatCard
                                        tone="warning"
                                        label={t('Pending applications')}
                                        value={num(
                                            summary.pendingApplications ?? 0,
                                        )}
                                        icon={<FileText />}
                                    />
                                )}
                                {can.performance && (
                                    <>
                                        <StatCard
                                            tone="analytics"
                                            label={t('Total Clicks')}
                                            value={num(summary.clicks ?? 0)}
                                            icon={<MousePointerClick />}
                                        />
                                        <StatCard
                                            tone="partners"
                                            label={t('Approved conversions')}
                                            value={num(
                                                summary.conversions ?? 0,
                                            )}
                                            icon={<Target />}
                                        />
                                    </>
                                )}
                            </section>
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Panel
                                    title={t('Publisher details')}
                                    icon={<UserRound />}
                                    tone="partners"
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
                                    icon={<ShieldCheck />}
                                    tone="success"
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
                                        className="mt-5 inline-flex items-center gap-2 text-brand-ink"
                                    >
                                        {t('View account')}
                                        <ArrowRight size={16} />
                                    </Link>
                                </Panel>
                            </div>
                            {can.earnings && earningsSummary}
                            <section aria-labelledby="publisher-tools">
                                <h2
                                    id="publisher-tools"
                                    className="mb-3 text-base font-bold"
                                >
                                    {t('Publisher tools')}
                                </h2>
                                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                                    {w.tabs
                                        .filter(
                                            (item) =>
                                                ![
                                                    'overview',
                                                    'account',
                                                ].includes(item.key),
                                        )
                                        .map((item) => (
                                            <ActionTile
                                                key={item.key}
                                                href={tabUrl(item.key)}
                                                title={t(item.label)}
                                                icon={
                                                    TAB_ICONS[item.key] ?? (
                                                        <FileText />
                                                    )
                                                }
                                                tone={
                                                    [
                                                        'earnings',
                                                        'invoices',
                                                    ].includes(item.key)
                                                        ? 'finance'
                                                        : item.key ===
                                                            'settings'
                                                          ? 'admin'
                                                          : 'brand'
                                                }
                                            />
                                        ))}
                                </div>
                            </section>
                            <p className="text-sm text-ink-muted">
                                {t(
                                    'Figures cover all time within your access. Financial amounts remain separate by currency.',
                                )}
                            </p>
                        </>
                    )}
                    {['campaigns', 'applications', 'tracking'].includes(tab) &&
                        w.assignments && (
                            <>
                                <div className="flex flex-wrap items-end justify-between gap-4 [&_h2]:text-lg [&_h2]:font-extrabold [&_p]:text-sm [&_p]:text-ink-muted">
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
                                <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
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
                                                            <p className="mt-1 text-xs text-ink-muted">
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
                                                                        className="text-brand-ink hover:underline"
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
                                                                        className="inline-flex items-center gap-2 text-brand-ink hover:underline"
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
                                                                    className="text-brand-ink hover:underline"
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
                            <div className="flex flex-wrap items-end justify-between gap-4 [&_h2]:text-lg [&_h2]:font-extrabold [&_p]:text-sm [&_p]:text-ink-muted">
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
                            <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
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
                            <div className="flex flex-wrap items-end justify-between gap-4 [&_h2]:text-lg [&_h2]:font-extrabold [&_p]:text-sm [&_p]:text-ink-muted">
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
                                    <p className="mt-4 text-sm text-ink-muted">
                                        {t(
                                            'The threshold applies separately to each network and currency.',
                                        )}
                                    </p>
                                </Panel>
                            )}
                            {w.payoutEligibility && (
                                <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
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
                            <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
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
                                                        className="font-semibold text-brand-ink hover:underline"
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
                                        className="mt-5 inline-flex items-center gap-2 text-brand-ink"
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
                                <p className="mt-4 text-sm text-ink-muted">
                                    {t(
                                        'Traffic profile figures are supplied by the publisher.',
                                    )}
                                </p>
                            </Panel>
                        </div>
                    )}
                    {tab === 'account' && (
                        <PartnerProfile
                            account={p}
                            kind="Publisher"
                            website={website}
                            onEditProfile={editCard('profile')}
                            onEditBusiness={editCard('site')}
                        >
                            <ProfileCard title={t('Verification & security')}>
                                <ProfileDetails
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
                                        [t('Verified at'), date(p.verified_at)],
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
                            </ProfileCard>
                            <ProfileCard title={t('Account roles')}>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        [p.is_publisher, 'Publisher'],
                                        [p.is_advertiser, 'Advertiser'],
                                        [p.is_super_admin, 'Super Admin'],
                                    ].map(([enabled, label]) =>
                                        enabled ? (
                                            <span
                                                key={String(label)}
                                                className="inline-flex h-7 items-center rounded-full bg-surface-tint px-3 text-xs font-bold"
                                            >
                                                {t(String(label))}
                                            </span>
                                        ) : null,
                                    )}
                                </div>
                            </ProfileCard>
                        </PartnerProfile>
                    )}
                    {tab === 'settings' && <PublisherSettings {...props} />}
                </div>
            </div>
            {can.changeNetwork && (
                <Dialog
                    open={changingNetwork}
                    onOpenChange={setChangingNetwork}
                >
                    <DialogContent className="sm:max-w-[600px]">
                        <ChangeNetworkForm
                            kind="publisher"
                            id={p.publisher_id}
                            currentNetworkId={p.network_id}
                            onDone={() => setChangingNetwork(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
            {cardEditor && (
                <PartnerCardEditor
                    config={cardEditor}
                    onClose={() => setCardEditor(null)}
                />
            )}
        </AppLayout>
    );
}
