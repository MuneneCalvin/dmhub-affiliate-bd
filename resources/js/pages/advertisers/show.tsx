import { FundingSheet } from '@/components/advertiser-funding-sheet';
import { AdvertiserSettings } from '@/components/advertiser-settings';
import { advertiserCardEditors } from '@/components/partner-card-config';
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
import { Button } from '@/components/ui/button';
import { BreadCrumbComponent } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import type { AdvertiserWorkspaceProps } from '@/types/advertiser-workspace';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Landmark,
    Megaphone,
    Plus,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../css/campaign-workspace.css';

function Status({ status }: { status: string }) {
    const { t } = useTranslation();
    return (
        <span
            className={`campaign-badge ${status === 'A' ? 'positive' : 'warning'}`}
        >
            {t(
                status === 'A'
                    ? 'Active'
                    : status === 'P'
                      ? 'Paused'
                      : 'Inactive',
            )}
        </span>
    );
}

export default function Show() {
    const props = usePage<AdvertiserWorkspaceProps>().props;
    const { advertiser: a, workspace: w } = props;
    const { permissions: can, activeTab: tab, summary } = w;
    const { t, i18n } = useTranslation();
    const [cardEditor, setCardEditor] = useState<CardEditorConfig | null>(null);
    const editors = advertiserCardEditors(props);
    const editCard = (key: string) =>
        editors[key] ? () => setCardEditor(editors[key]) : undefined;
    const [fundingOpen, setFundingOpen] = useState(false);
    const base = `/advertisers/show/${a.id}`;
    const tabUrl = (key: string) => `${base}?tab=${key}`;
    const createUrl = `/advertiser/campaigns/create?advertiser_id=${a.advertiser_id}`;
    const money = (value: number | string, currency = a.advertiser_currency) =>
        `${currency ?? ''} ${new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}`;
    const date = (value: string | null) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                  timeZone: 'UTC',
              }).format(new Date(value))
            : t('Not set');
    const yes = (value: unknown) => t(value ? 'Yes' : 'No');
    const website =
        a.website_name && /^https?:\/\//i.test(a.website_name) ? (
            <a
                href={a.website_name}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
            >
                {a.website_name}
            </a>
        ) : (
            a.website_name
        );
    const campaignUrl = (id: number, key = 'overview') =>
        `/advertiser/campaigns/show/${id}?tab=${key}`;
    return (
        <AppLayout>
            <Head
                title={`${a.business_name} · ${t(w.tabs.find((item) => item.key === tab)?.label ?? 'Overview')}`}
            />
            <div className="workspace-page campaign-workspace">
                <div className="campaign-heading">
                    <div className="mb-4 text-xs">
                        <BreadCrumbComponent
                            breadcrumbs={[
                                {
                                    title: t(
                                        can.directory
                                            ? 'Advertisers'
                                            : 'Dashboard',
                                    ),
                                    href: can.directory
                                        ? '/advertisers/index'
                                        : '/advertiser/dashboard',
                                },
                                { title: a.business_name, href: base },
                            ]}
                        />
                    </div>
                    <div className="campaign-title-row">
                        <div className="campaign-title">
                            <h1>{a.business_name}</h1>
                            <Status status={a.advertiser_status} />
                        </div>
                        <span className="campaign-role">{t(w.role)}</span>
                    </div>
                    <div className="campaign-meta">
                        <span>{t('Advertiser')}</span>
                        <span>
                            {a.network_name || t('No network assigned')}
                        </span>
                        <span>{a.advertiser_currency}</span>
                        <span>{a.industry}</span>
                    </div>
                </div>
                <nav
                    className="campaign-tabs"
                    aria-label={t('Advertiser navigation')}
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
                    className="campaign-content"
                    id="advertiser-content"
                    tabIndex={-1}
                >
                    {tab === 'overview' && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Advertiser overview')}</h2>
                                    <p>
                                        {t(
                                            'Campaigns, funding and account details in one workspace.',
                                        )}
                                    </p>
                                </div>
                                {can.createCampaign && (
                                    <Button asChild>
                                        <Link href={createUrl}>
                                            <Plus size={16} />
                                            {t('Create campaign')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    ...(can.campaigns
                                        ? [
                                              {
                                                  label: 'Campaigns',
                                                  value: summary.campaigns,
                                                  icon: Megaphone,
                                                  target: 'campaigns',
                                              },
                                              {
                                                  label: 'Active campaigns',
                                                  value: summary.activeCampaigns,
                                                  icon: CheckCircle2,
                                                  target: 'campaigns',
                                              },
                                          ]
                                        : []),
                                    ...(can.funding
                                        ? [
                                              {
                                                  label: 'Available balance',
                                                  value: money(
                                                      summary.available ?? 0,
                                                  ),
                                                  icon: Wallet,
                                                  target: 'funding',
                                              },
                                              {
                                                  label: 'Net funded budget',
                                                  value: money(
                                                      summary.netFunded ?? 0,
                                                  ),
                                                  icon: Landmark,
                                                  target: 'funding',
                                              },
                                          ]
                                        : []),
                                ].map(
                                    ({ label, value, icon: Icon, target }) => (
                                        <Link
                                            href={tabUrl(target)}
                                            key={label}
                                            className="campaign-panel p-5 transition-colors hover:border-primary"
                                        >
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>{t(label)}</span>
                                                <Icon size={18} />
                                            </div>
                                            <div className="mt-3 text-2xl font-semibold tabular-nums">
                                                {value}
                                            </div>
                                        </Link>
                                    ),
                                )}
                            </div>
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Panel
                                    title={t('Business details')}
                                    onEdit={editCard('business')}
                                >
                                    <Details
                                        rows={[
                                            [
                                                t('Business Name'),
                                                a.business_name,
                                            ],
                                            [t('Website URL'), website],
                                            [t('Industry'), a.industry],
                                            [
                                                t('Chamber of Commerce number'),
                                                a.coc_number,
                                            ],
                                            [t('Network'), a.network_name],
                                            [
                                                t('Created'),
                                                date(a.advertiser_created_at),
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
                                                    status={a.status}
                                                />,
                                            ],
                                            [
                                                t('Verified advertiser'),
                                                yes(a.is_verified),
                                            ],
                                            [
                                                t('Email verified'),
                                                yes(a.email_verified_at),
                                            ],
                                            [
                                                t(
                                                    'Publisher approval required',
                                                ),
                                                yes(
                                                    a.require_publisher_approval,
                                                ),
                                            ],
                                            [
                                                t('Auto-approve publishers'),
                                                yes(a.auto_approve_publishers),
                                            ],
                                        ]}
                                    />
                                    <Link
                                        className="mt-5 inline-flex items-center gap-2 text-primary"
                                        href={tabUrl('account')}
                                    >
                                        {t('View account')}
                                        <ArrowRight size={16} />
                                    </Link>
                                </Panel>
                            </div>
                            <section className="campaign-panel p-5">
                                <h2 className="mb-4 text-lg font-semibold">
                                    {t('Advertiser tools')}
                                </h2>
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
                            </section>
                        </>
                    )}
                    {tab === 'campaigns' && w.campaigns && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Campaigns')}</h2>
                                    <p>
                                        {t(
                                            'Open a campaign to manage offers, publishers, tracking, analytics and finance.',
                                        )}
                                    </p>
                                </div>
                                {can.createCampaign && (
                                    <Button asChild>
                                        <Link href={createUrl}>
                                            <Plus size={16} />
                                            {t('Create campaign')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <section className="campaign-panel overflow-hidden">
                                {w.campaigns.data.length ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b bg-muted/40">
                                                <tr>
                                                    {[
                                                        'Campaign',
                                                        'Status',
                                                        'Currency',
                                                        'Schedule',
                                                        'Workspace',
                                                    ].map((label) => (
                                                        <th
                                                            key={label}
                                                            className="px-5 py-3 font-medium text-muted-foreground"
                                                        >
                                                            {t(label)}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {w.campaigns.data.map((c) => (
                                                    <tr key={c.id}>
                                                        <td className="min-w-44 px-5 py-4">
                                                            <Link
                                                                className="font-semibold text-primary"
                                                                href={campaignUrl(
                                                                    c.id,
                                                                )}
                                                            >
                                                                {c.name}
                                                            </Link>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <Status
                                                                status={
                                                                    c.campaign_status
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {c.currency}
                                                        </td>
                                                        <td className="min-w-40 px-5 py-4">
                                                            {date(c.start_date)}{' '}
                                                            – {date(c.end_date)}
                                                        </td>
                                                        <td className="min-w-72 px-5 py-4">
                                                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                                {[
                                                                    [
                                                                        'offers',
                                                                        'Offers & materials',
                                                                    ],
                                                                    [
                                                                        'publishers',
                                                                        'Publishers',
                                                                    ],
                                                                    [
                                                                        'tracking',
                                                                        'Tracking & integration',
                                                                    ],
                                                                    [
                                                                        'analytics',
                                                                        'Analytics',
                                                                    ],
                                                                    [
                                                                        'finance',
                                                                        'Finance',
                                                                    ],
                                                                ].map(
                                                                    ([
                                                                        key,
                                                                        label,
                                                                    ]) => (
                                                                        <Link
                                                                            className="text-primary hover:underline"
                                                                            key={
                                                                                key
                                                                            }
                                                                            href={campaignUrl(
                                                                                c.id,
                                                                                key,
                                                                            )}
                                                                        >
                                                                            {t(
                                                                                label,
                                                                            )}
                                                                        </Link>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <Empty message="No campaigns for this advertiser yet." />
                                )}
                                <Paging page={w.campaigns} />
                            </section>
                        </>
                    )}
                    {tab === 'materials' && w.materials && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Materials')}</h2>
                                    <p>
                                        {t(
                                            'Promotional materials across this advertiser’s campaigns.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <section className="campaign-panel overflow-hidden">
                                {w.materials.data.length ? (
                                    <div className="divide-y">
                                        {w.materials.data.map((material) => (
                                            <div
                                                key={material.id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-5"
                                            >
                                                <div>
                                                    <Link
                                                        href={`/advertiser/creatives/show/${material.id}`}
                                                        className="font-semibold text-primary"
                                                    >
                                                        {material.name}
                                                    </Link>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {
                                                            material.campaign
                                                                ?.name
                                                        }{' '}
                                                        · {t(material.type)}
                                                    </p>
                                                </div>
                                                <Status
                                                    status={material.status}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty message="No materials yet. Add materials from a campaign’s offers workspace." />
                                )}
                                <Paging page={w.materials} />
                            </section>
                        </>
                    )}
                    {tab === 'terms' && w.terms && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Campaign terms')}</h2>
                                    <p>
                                        {t(
                                            'Advertiser-specific terms and shared platform terms.',
                                        )}
                                    </p>
                                </div>
                                {can.manageTerms && (
                                    <Button variant="outline" asChild>
                                        <Link href="/advertiser/terms">
                                            {t('Manage terms')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <section className="campaign-panel overflow-hidden">
                                {w.terms.data.length ? (
                                    <div className="divide-y">
                                        {w.terms.data.map((term) => (
                                            <article
                                                className="p-5"
                                                key={term.id}
                                            >
                                                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                    {t(
                                                        term.advertiser_id
                                                            ? 'Advertiser terms'
                                                            : 'Shared platform terms',
                                                    )}
                                                </p>
                                                <p className="break-words whitespace-pre-wrap">
                                                    {term.description}
                                                </p>
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty message="No terms available for this advertiser." />
                                )}
                                <Paging page={w.terms} />
                            </section>
                        </>
                    )}
                    {tab === 'funding' && w.funding && (
                        <>
                            <div className="campaign-overview-heading">
                                <div>
                                    <h2>{t('Advertiser funding')}</h2>
                                    <p>
                                        {t(
                                            'This balance is shared across all campaigns for this advertiser.',
                                        )}
                                    </p>
                                </div>
                                {can.recordFunding && (
                                    <Button
                                        onClick={() => setFundingOpen(true)}
                                    >
                                        <Landmark size={16} />
                                        {t('Record funding')}
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <Panel title={t('Available balance')}>
                                    <p className="text-3xl font-semibold tabular-nums">
                                        {money(summary.available ?? 0)}
                                    </p>
                                    <p className="mt-3 text-muted-foreground">
                                        {t(
                                            'Campaign budgets are spending limits. They do not add money to this balance.',
                                        )}
                                    </p>
                                </Panel>
                                <Panel title={t('Net funded budget')}>
                                    <p className="text-3xl font-semibold tabular-nums">
                                        {money(summary.netFunded ?? 0)}
                                    </p>
                                    <p className="mt-3 text-muted-foreground">
                                        {t(
                                            'Deposits after network fees, less returned unused funds.',
                                        )}
                                    </p>
                                </Panel>
                            </div>
                            {!can.recordFunding && (
                                <p className="text-sm text-muted-foreground">
                                    {t(
                                        'Contact your network operator to arrange funding. A platform administrator records verified deposits.',
                                    )}
                                </p>
                            )}
                            <section className="campaign-panel overflow-hidden">
                                <h3 className="border-b px-5 py-4 font-semibold">
                                    {t('Funding history')}
                                </h3>
                                {w.funding.data.length ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="border-b bg-muted/40">
                                                <tr>
                                                    {[
                                                        'Date',
                                                        'Operation',
                                                        'Reference',
                                                        'Balance change',
                                                    ].map((label) => (
                                                        <th
                                                            key={label}
                                                            className="px-5 py-3 font-medium text-muted-foreground"
                                                        >
                                                            {t(label)}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {w.funding.data.map((entry) => (
                                                    <tr key={entry.id}>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            {date(
                                                                entry.created_at,
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {t(
                                                                entry.kind ===
                                                                    'funding'
                                                                    ? 'Verified deposit'
                                                                    : 'Return unused funds',
                                                            )}
                                                        </td>
                                                        <td className="max-w-sm px-5 py-4 break-words">
                                                            {entry.reference.replace(
                                                                /^funding(?:-refund)?:/,
                                                                '',
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 font-medium whitespace-nowrap tabular-nums">
                                                            {money(
                                                                entry.amount_minor /
                                                                    100,
                                                                entry.currency,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <Empty message="No funding has been recorded for this advertiser." />
                                )}
                                <Paging page={w.funding} />
                            </section>
                        </>
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
                                            `${a.first_name} ${a.last_name}`,
                                        ],
                                        [t('Username'), a.user_name],
                                        [t('Email'), a.email],
                                        [t('Title'), a.title],
                                        [
                                            t('Status'),
                                            <Status
                                                key="user-status"
                                                status={a.status}
                                            />,
                                        ],
                                        [t('Country'), a.country_iso],
                                        [t('Timezone'), a.timezone],
                                        [t('Language'), a.language],
                                    ]}
                                />
                            </Panel>
                            <div className="space-y-5">
                                <Panel title={t('Verification & security')}>
                                    <Details
                                        rows={[
                                            [
                                                t('Email verified'),
                                                yes(a.email_verified_at),
                                            ],
                                            [
                                                t('Two-factor authentication'),
                                                yes(a.two_factor_confirmed_at),
                                            ],
                                            [
                                                t('Verified advertiser'),
                                                yes(a.is_verified),
                                            ],
                                            [
                                                t('Verified at'),
                                                date(a.verified_at),
                                            ],
                                            [
                                                t('Updated'),
                                                date(a.advertiser_updated_at),
                                            ],
                                        ]}
                                    />
                                </Panel>
                                <Panel title={t('Account roles')}>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            [a.is_advertiser, 'Advertiser'],
                                            [a.is_publisher, 'Publisher'],
                                            [a.is_super_admin, 'Super Admin'],
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
                    {tab === 'settings' && <AdvertiserSettings {...props} />}
                </div>
            </div>
            {can.recordFunding && (
                <FundingSheet
                    key={a.advertiser_id}
                    open={fundingOpen}
                    onOpenChange={setFundingOpen}
                    advertisers={[
                        {
                            id: a.advertiser_id,
                            business_name: a.business_name,
                            currency: a.advertiser_currency,
                        },
                    ]}
                />
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
