import {
    DirectoryPager,
    EmptyState,
    FilterChips,
    PageHeader,
} from '@/components/app';
import { CampaignCard } from '@/components/marketplace/campaign-card';
import { CampaignSheet } from '@/components/marketplace/campaign-sheet';
import { type MarketplaceCampaign } from '@/components/marketplace/types';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { toneFromName } from '@/lib/tones';
import { cn } from '@/lib/utils';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import { type SharedData } from '@/types';
import { hasPermission } from '@/utils/permissions';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Search, Store } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Filters = {
    campaign_status?: string | null;
    application_status?: string | null;
    start_date?: string | null;
    applied_start_date?: string | null;
    search?: string | null;
    industry?: string | null;
};

type MarketplaceProps = SharedData & {
    campaigns: {
        data: MarketplaceCampaign[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: Filters | [];
    industries: string[];
    myCampaignsCount: number;
};

const steps = [
    {
        tone: 'bg-brand-soft',
        badge: 'bg-brand',
        title: 'text-brand-ink',
        heading: 'Browse & compare',
        text: 'Payout, EPC and cookie window up front',
    },
    {
        tone: 'bg-partners-soft',
        badge: 'bg-partners',
        title: 'text-partners-ink',
        heading: 'Apply',
        text: 'Accept the terms, the network reviews',
    },
    {
        tone: 'bg-finance-soft',
        badge: 'bg-finance',
        title: 'text-finance-ink',
        heading: 'Promote & earn',
        text: 'Grab links, scripts and creatives',
    },
] as const;

const PublisherMarketplace = () => {
    const { t } = useTranslation();
    const {
        auth,
        campaigns,
        filters: rawFilters,
        industries = [],
        myCampaignsCount = 0,
    } = usePage<MarketplaceProps>().props;
    // Laravel serialises an empty array for "no filters".
    const filters: Filters = Array.isArray(rawFilters) ? {} : rawFilters;
    const [selected, setSelected] = useState<MarketplaceCampaign | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const firstRender = useRef(true);
    const items = campaigns?.data ?? [];
    const activeFilters = Boolean(
        filters.campaign_status ||
            filters.application_status ||
            filters.start_date ||
            filters.applied_start_date ||
            filters.search ||
            filters.industry,
    );

    const visit = (next: Filters & { page?: number }) =>
        router.get(
            publisher.dashboard.url(),
            Object.fromEntries(
                Object.entries(next).filter(
                    ([, value]) =>
                        value !== null && value !== '' && value !== undefined,
                ),
            ),
            { preserveState: true, preserveScroll: true },
        );
    const update = (key: keyof Filters, value: string | null) =>
        visit({ ...filters, [key]: value });
    const clear = () => {
        setSearch('');
        visit({});
    };

    // Search as you type, after a short pause.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        if ((filters.search ?? '') === search) return;
        const timer = window.setTimeout(() => update('search', search), 400);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        update('search', search);
    };

    return (
        <AppLayout>
            <Head title={t('Campaign marketplace')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Campaign marketplace')}
                    description={t(
                        'Find campaigns that fit your audience and build your next partnership.',
                    )}
                    breadcrumbs={[{ title: t('Marketplace'), href: '' }]}
                    actions={
                        <nav
                            aria-label={t('Campaign scope')}
                            className="inline-flex gap-0.5 rounded-[14px] border border-border bg-surface p-1"
                        >
                            <Link
                                href={publisher.dashboard.url()}
                                aria-current="page"
                                className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand px-4 font-bold text-white"
                            >
                                <Store aria-hidden="true" className="size-4" />
                                {t('All campaigns')}
                            </Link>
                            {hasPermission(
                                auth.permissions,
                                'view_my_campaigns',
                            ) && (
                                <Link
                                    href={publishers.my.campaign.url()}
                                    className="inline-flex h-10 items-center gap-2 rounded-[10px] px-4 font-semibold text-ink-muted hover:bg-surface-tint hover:text-ink"
                                >
                                    {t('My campaigns')}
                                    <span className="rounded-full bg-brand-soft px-1.5 text-[11px] font-extrabold text-brand-ink">
                                        {myCampaignsCount}
                                    </span>
                                </Link>
                            )}
                        </nav>
                    }
                />

                <section aria-label={t('How to join a campaign')}>
                    <ol className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                        {steps.map((step, index) => (
                            <li
                                key={step.heading}
                                className={cn(
                                    'flex items-center gap-3.5 rounded-2xl px-[18px] py-4',
                                    step.tone,
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'inline-flex size-9 shrink-0 items-center justify-center rounded-full font-extrabold text-white',
                                        step.badge,
                                    )}
                                >
                                    {index + 1}
                                </span>
                                <span className="flex flex-col">
                                    <strong className={step.title}>
                                        <span className="sr-only">
                                            {t(
                                                'Step {{current}} of {{total}}',
                                                {
                                                    current: index + 1,
                                                    total: steps.length,
                                                },
                                            )}
                                            :{' '}
                                        </span>
                                        {t(step.heading)}
                                    </strong>
                                    <span
                                        className={cn(
                                            'text-[13px]',
                                            step.title,
                                        )}
                                    >
                                        {t(step.text)}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>

                <section
                    aria-label={t('Filters')}
                    className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-4 shadow-card"
                >
                    <div className="flex flex-wrap items-center gap-2.5">
                        <form
                            role="search"
                            onSubmit={submitSearch}
                            className="min-w-[220px] flex-[1_1_260px]"
                        >
                            <InputGroup
                                leading={
                                    <Search
                                        aria-hidden="true"
                                        className="text-brand"
                                    />
                                }
                            >
                                <Input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={t(
                                        'Search campaigns or advertisers',
                                    )}
                                    aria-label={t('Search campaigns')}
                                />
                            </InputGroup>
                        </form>
                        <Select
                            value={filters.campaign_status || 'A'}
                            onValueChange={(value) =>
                                update('campaign_status', value)
                            }
                        >
                            <SelectTrigger
                                aria-label={t('Campaign status')}
                                className="w-auto min-w-[150px]"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A">{t('Active')}</SelectItem>
                                <SelectItem value="I">
                                    {t('Inactive')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.application_status || 'all'}
                            onValueChange={(value) =>
                                update(
                                    'application_status',
                                    value === 'all' ? null : value,
                                )
                            }
                        >
                            <SelectTrigger
                                aria-label={t('Application status')}
                                className="w-auto min-w-[170px]"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t('All applications')}
                                </SelectItem>
                                <SelectItem value="none">
                                    {t('Not applied')}
                                </SelectItem>
                                <SelectItem value="P">
                                    {t('Pending')}
                                </SelectItem>
                                <SelectItem value="A">
                                    {t('Approved')}
                                </SelectItem>
                                <SelectItem value="R">
                                    {t('Rejected')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="secondary">
                                    <CalendarDays
                                        aria-hidden="true"
                                        className="text-analytics"
                                    />
                                    {t('Dates')}
                                    {(filters.start_date ||
                                        filters.applied_start_date) && (
                                        <span className="sr-only">
                                            ({t('filter active')})
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-80 space-y-4"
                                align="end"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="marketplace-start-date">
                                        {t('Campaign starts from')}
                                    </Label>
                                    <Input
                                        id="marketplace-start-date"
                                        type="date"
                                        value={filters.start_date || ''}
                                        onChange={(event) =>
                                            update(
                                                'start_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="marketplace-applied-date">
                                        {t('Applied from')}
                                    </Label>
                                    <Input
                                        id="marketplace-applied-date"
                                        type="date"
                                        value={filters.applied_start_date || ''}
                                        onChange={(event) =>
                                            update(
                                                'applied_start_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                        {activeFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={clear}
                            >
                                {t('Clear')}
                            </Button>
                        )}
                    </div>
                    {industries.length > 0 && (
                        <FilterChips
                            label={t('Category')}
                            multiple={false}
                            value={[filters.industry || 'all']}
                            onValueChange={(values) => {
                                const value = values[0];
                                update(
                                    'industry',
                                    !value || value === 'all' ? null : value,
                                );
                            }}
                            options={[
                                { value: 'all', label: t('All') },
                                ...industries.map((industry) => ({
                                    value: industry,
                                    label: industry,
                                    tone: toneFromName(industry),
                                })),
                            ]}
                        />
                    )}
                </section>

                <section aria-label={t('Campaigns')} aria-live="polite">
                    {items.length > 0 ? (
                        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                            {items.map((campaign) => (
                                <CampaignCard
                                    key={campaign.id}
                                    campaign={campaign}
                                    onDetails={setSelected}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-card border border-border bg-surface shadow-card">
                            <EmptyState
                                icon={<Store />}
                                title={t('No campaigns available')}
                                description={t(
                                    'Advertisers create campaigns and your network reviews publisher applications. If no campaigns are available after clearing filters, contact your network operator.',
                                )}
                                action={
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        {activeFilters && (
                                            <Button
                                                type="button"
                                                variant="soft"
                                                onClick={clear}
                                            >
                                                {t('Clear filters')}
                                            </Button>
                                        )}
                                        <Button asChild variant="link">
                                            <a href="/docs/campaign-setup">
                                                {t('How to join a campaign')}
                                            </a>
                                        </Button>
                                    </div>
                                }
                            />
                        </div>
                    )}
                </section>

                {campaigns?.last_page > 1 && (
                    <div className="flex justify-center">
                        <DirectoryPager
                            page={campaigns.current_page}
                            pageCount={campaigns.last_page}
                            onPageChange={(page) => visit({ ...filters, page })}
                        />
                    </div>
                )}
                <CampaignSheet
                    campaign={selected}
                    onOpenChange={(open) => !open && setSelected(null)}
                />
            </div>
        </AppLayout>
    );
};

export default PublisherMarketplace;
