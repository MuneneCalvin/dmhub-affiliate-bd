import { FundingSheet } from '@/components/advertiser-funding-sheet';
import { AdvertiserSettings } from '@/components/advertiser-settings';
import {
    ActionTile,
    LinkTabs,
    ProfileBanner,
    StatCard,
} from '@/components/app';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ChangeNetworkForm } from '@/components/change-network-form';
import { advertiserCardEditors } from '@/components/partner-card-config';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { AdvertiserWorkspaceProps } from '@/types/advertiser-workspace';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Building2,
    CheckCircle2,
    FileText,
    Image,
    Landmark,
    Megaphone,
    Pencil,
    Plus,
    ScrollText,
    Settings,
    ShieldCheck,
    UsersRound,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Advertiser / campaign / material codes: A active, P paused, anything else inactive. */
const statusKeyword = (status: string) =>
    status === 'A' ? 'active' : status === 'P' ? 'paused' : 'inactive';

const TAB_ICONS: Record<string, React.ReactNode> = {
    overview: <Building2 />,
    campaigns: <Megaphone />,
    materials: <Image />,
    terms: <ScrollText />,
    funding: <Wallet />,
    account: <UsersRound />,
    settings: <Settings />,
};

export default function Show() {
    const props = usePage<AdvertiserWorkspaceProps>().props;
    const { advertiser: a, workspace: w } = props;
    const { permissions: can, activeTab: tab, summary } = w;
    const { t, i18n } = useTranslation();
    const [cardEditor, setCardEditor] = useState<CardEditorConfig | null>(null);
    const [changingNetwork, setChangingNetwork] = useState(false);
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
    const memberSince = new Intl.DateTimeFormat(i18n.language, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(a.advertiser_created_at));
    const yes = (value: unknown) => t(value ? 'Yes' : 'No');
    const website =
        a.website_name && /^https?:\/\//i.test(a.website_name) ? (
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
        );
    const campaignUrl = (id: number, key = 'overview') =>
        `/advertiser/campaigns/show/${id}?tab=${key}`;
    const createButton = can.createCampaign && (
        <Button asChild>
            <Link href={createUrl}>
                <Plus />
                {t('Create campaign')}
            </Link>
        </Button>
    );

    return (
        <AppLayout>
            <Head
                title={`${a.business_name} · ${t(w.tabs.find((item) => item.key === tab)?.label ?? 'Overview')}`}
            />
            <div className="workspace-page flex flex-col gap-[22px]">
                <Breadcrumbs
                    breadcrumbs={[
                        {
                            title: t(
                                can.directory ? 'Advertisers' : 'Dashboard',
                            ),
                            href: can.directory
                                ? '/advertisers/index'
                                : '/advertiser/dashboard',
                        },
                        { title: a.business_name, href: base },
                    ]}
                />
                <ProfileBanner
                    name={a.business_name}
                    status={
                        <StatusBadge
                            status={statusKeyword(a.advertiser_status)}
                        />
                    }
                    chips={[
                        { label: t('Advertiser'), tone: 'partners' },
                        ...(a.industry
                            ? [
                                  {
                                      label: a.industry,
                                      tone: 'analytics' as const,
                                  },
                              ]
                            : []),
                        {
                            label: a.network_name || t('No network assigned'),
                        },
                        { label: a.advertiser_currency },
                        {
                            label: t('Member since {{date}}', {
                                date: memberSince,
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
                    label={t('Advertiser navigation')}
                    current={tab}
                    tabs={w.tabs.map((item) => ({
                        key: item.key,
                        label: t(item.label),
                        href: tabUrl(item.key),
                        icon: TAB_ICONS[item.key],
                    }))}
                />
                <div
                    className="flex flex-col gap-[18px]"
                    id="advertiser-content"
                    tabIndex={-1}
                >
                    {tab === 'overview' && (
                        <>
                            <section
                                aria-label={t('Performance')}
                                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5"
                            >
                                {can.campaigns && (
                                    <>
                                        <StatCard
                                            variant="solid"
                                            tone="brand"
                                            label={t('Campaigns')}
                                            value={summary.campaigns ?? 0}
                                            icon={<Megaphone />}
                                        />
                                        <StatCard
                                            tone="success"
                                            label={t('Active campaigns')}
                                            value={summary.activeCampaigns ?? 0}
                                            icon={<CheckCircle2 />}
                                        />
                                    </>
                                )}
                                {can.funding && (
                                    <>
                                        <StatCard
                                            tone="finance"
                                            label={t('Available balance')}
                                            value={money(
                                                summary.available ?? 0,
                                            )}
                                            icon={<Wallet />}
                                        />
                                        <StatCard
                                            tone="analytics"
                                            label={t('Net funded budget')}
                                            value={money(
                                                summary.netFunded ?? 0,
                                            )}
                                            icon={<Landmark />}
                                        />
                                    </>
                                )}
                            </section>
                            <div className="grid gap-[18px] lg:grid-cols-2">
                                <Panel
                                    title={t('Company details')}
                                    icon={<Building2 />}
                                    tone="partners"
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
                                    icon={<ShieldCheck />}
                                    tone="success"
                                    onEdit={editCard('readiness')}
                                >
                                    <Details
                                        rows={[
                                            [
                                                t('Account status'),
                                                <StatusBadge
                                                    key="status"
                                                    status={statusKeyword(
                                                        a.status,
                                                    )}
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
                                </Panel>
                            </div>
                            {w.tabs.some(
                                (item) =>
                                    !['overview', 'account'].includes(item.key),
                            ) && (
                                <section aria-labelledby="advertiser-tools">
                                    <h2
                                        id="advertiser-tools"
                                        className="mb-3 text-base font-bold"
                                    >
                                        {t('Advertiser tools')}
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
                                                        item.key === 'funding'
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
                            )}
                        </>
                    )}
                    {tab === 'campaigns' && w.campaigns && (
                        <Panel
                            title={t('Campaigns')}
                            description={t(
                                'Open a campaign to manage offers, publishers, tracking, analytics and finance.',
                            )}
                            icon={<Megaphone />}
                            action={createButton}
                            flush
                        >
                            {w.campaigns.data.length ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {[
                                                'Campaign',
                                                'Status',
                                                'Currency',
                                                'Schedule',
                                                'Workspace',
                                            ].map((label) => (
                                                <TableHead key={label}>
                                                    {t(label)}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {w.campaigns.data.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="min-w-44">
                                                    <Link
                                                        className="font-bold text-ink hover:text-brand-ink hover:underline"
                                                        href={campaignUrl(c.id)}
                                                    >
                                                        {c.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={statusKeyword(
                                                            c.campaign_status,
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {c.currency}
                                                </TableCell>
                                                <TableCell className="min-w-40 text-ink-muted tabular-nums">
                                                    {date(c.start_date)} –{' '}
                                                    {date(c.end_date)}
                                                </TableCell>
                                                <TableCell className="min-w-72">
                                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-semibold">
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
                                                            ([key, label]) => (
                                                                <Link
                                                                    className="text-brand-ink hover:underline"
                                                                    key={key}
                                                                    href={campaignUrl(
                                                                        c.id,
                                                                        key,
                                                                    )}
                                                                >
                                                                    {t(label)}
                                                                </Link>
                                                            ),
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Empty
                                    icon={<Megaphone />}
                                    message="No campaigns for this advertiser yet."
                                />
                            )}
                            <Paging page={w.campaigns} />
                        </Panel>
                    )}
                    {tab === 'materials' && w.materials && (
                        <Panel
                            title={t('Materials')}
                            description={t(
                                'Promotional materials across this advertiser’s campaigns.',
                            )}
                            icon={<Image />}
                            tone="analytics"
                            flush
                        >
                            {w.materials.data.length ? (
                                <ul>
                                    {w.materials.data.map((material) => (
                                        <li
                                            key={material.id}
                                            className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[22px] py-3.5"
                                        >
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/advertiser/creatives/show/${material.id}`}
                                                    className="font-bold hover:text-brand-ink hover:underline"
                                                >
                                                    {material.name}
                                                </Link>
                                                <p className="text-[13px] text-ink-muted">
                                                    {material.campaign?.name} ·{' '}
                                                    {t(material.type)}
                                                </p>
                                            </div>
                                            <StatusBadge
                                                status={statusKeyword(
                                                    material.status,
                                                )}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <Empty
                                    icon={<Image />}
                                    tone="analytics"
                                    message="No materials yet. Add materials from a campaign’s offers workspace."
                                />
                            )}
                            <Paging page={w.materials} />
                        </Panel>
                    )}
                    {tab === 'terms' && w.terms && (
                        <Panel
                            title={t('Campaign terms')}
                            description={t(
                                'Advertiser-specific terms and shared platform terms.',
                            )}
                            icon={<ScrollText />}
                            tone="neutral"
                            action={
                                can.manageTerms && (
                                    <Button variant="secondary" asChild>
                                        <Link href="/advertiser/terms">
                                            {t('Manage terms')}
                                        </Link>
                                    </Button>
                                )
                            }
                            flush
                        >
                            {w.terms.data.length ? (
                                <div>
                                    {w.terms.data.map((term) => (
                                        <article
                                            className="border-t border-border px-[22px] py-4"
                                            key={term.id}
                                        >
                                            <p className="mb-2 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                                                {t(
                                                    term.advertiser_id
                                                        ? 'Advertiser terms'
                                                        : 'Shared platform terms',
                                                )}
                                            </p>
                                            <p className="text-sm break-words whitespace-pre-wrap">
                                                {term.description}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <Empty
                                    icon={<ScrollText />}
                                    tone="neutral"
                                    message="No terms available for this advertiser."
                                />
                            )}
                            <Paging page={w.terms} />
                        </Panel>
                    )}
                    {tab === 'funding' && w.funding && (
                        <>
                            <div className="grid gap-3.5 md:grid-cols-2">
                                <StatCard
                                    variant="solid"
                                    tone="finance"
                                    label={t('Available balance')}
                                    value={money(summary.available ?? 0)}
                                    icon={<Wallet />}
                                    hint={t(
                                        'Campaign budgets are spending limits. They do not add money to this balance.',
                                    )}
                                />
                                <StatCard
                                    tone="analytics"
                                    label={t('Net funded budget')}
                                    value={money(summary.netFunded ?? 0)}
                                    icon={<Landmark />}
                                    hint={t(
                                        'Deposits after network fees, less returned unused funds.',
                                    )}
                                />
                            </div>
                            {!can.recordFunding && (
                                <p className="text-sm text-ink-muted">
                                    {t(
                                        'Contact your network operator to arrange funding. A platform administrator records verified deposits.',
                                    )}
                                </p>
                            )}
                            <Panel
                                title={t('Funding history')}
                                description={t(
                                    'This balance is shared across all campaigns for this advertiser.',
                                )}
                                icon={<Landmark />}
                                tone="finance"
                                action={
                                    can.recordFunding && (
                                        <Button
                                            onClick={() => setFundingOpen(true)}
                                        >
                                            <Landmark />
                                            {t('Record funding')}
                                        </Button>
                                    )
                                }
                                flush
                            >
                                {w.funding.data.length ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    {t('Date')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Operation')}
                                                </TableHead>
                                                <TableHead>
                                                    {t('Reference')}
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    {t('Balance change')}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {w.funding.data.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="whitespace-nowrap text-ink-muted">
                                                        {date(entry.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {t(
                                                            entry.kind ===
                                                                'funding'
                                                                ? 'Verified deposit'
                                                                : 'Return unused funds',
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-sm break-words">
                                                        {entry.reference.replace(
                                                            /^funding(?:-refund)?:/,
                                                            '',
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold whitespace-nowrap tabular-nums">
                                                        {money(
                                                            entry.amount_minor /
                                                                100,
                                                            entry.currency,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <Empty
                                        icon={<Landmark />}
                                        tone="finance"
                                        message="No funding has been recorded for this advertiser."
                                    />
                                )}
                                <Paging page={w.funding} />
                            </Panel>
                        </>
                    )}
                    {tab === 'account' && (
                        <PartnerProfile
                            account={a}
                            kind="Advertiser"
                            website={website}
                            onEditProfile={editCard('profile')}
                            onEditBusiness={editCard('business')}
                        >
                            <ProfileCard
                                title={t('Verification & security')}
                                icon={<ShieldCheck />}
                                tone="success"
                            >
                                <ProfileDetails
                                    rows={[
                                        [
                                            t('Status'),
                                            <StatusBadge
                                                key="user-status"
                                                status={statusKeyword(a.status)}
                                            />,
                                        ],
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
                                        [t('Verified at'), date(a.verified_at)],
                                        [
                                            t('Updated'),
                                            date(a.advertiser_updated_at),
                                        ],
                                    ]}
                                />
                            </ProfileCard>
                            <ProfileCard
                                title={t('Account roles')}
                                icon={<UsersRound />}
                                tone="admin"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        [a.is_advertiser, 'Advertiser'],
                                        [a.is_publisher, 'Publisher'],
                                        [a.is_super_admin, 'Super Admin'],
                                    ].map(([enabled, label]) =>
                                        enabled ? (
                                            <Badge
                                                key={String(label)}
                                                variant="secondary"
                                            >
                                                {t(String(label))}
                                            </Badge>
                                        ) : null,
                                    )}
                                </div>
                            </ProfileCard>
                        </PartnerProfile>
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
            {can.changeNetwork && (
                <Dialog
                    open={changingNetwork}
                    onOpenChange={setChangingNetwork}
                >
                    <DialogContent className="sm:max-w-[600px]">
                        <ChangeNetworkForm
                            kind="advertiser"
                            id={a.advertiser_id}
                            currentNetworkId={a.network_id}
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
