import publishers from '@/routes/publishers';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
    ReusablePageTitle,
    ReusablePagination,
    ReusableSheet,
} from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, CalendarIcon, FilterX } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CampaignCard } from './dashbaord_cards';
import { SideDrawer } from './side_drawer';

const PublisherDashboard = () => {
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const { campaigns, filters, auth } = usePage<any>().props;

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...filters, page: 1, [key]: value };
        router.get(publisher.dashboard.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        router.get(
            publisher.dashboard.url(),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const campaignItems = campaigns?.data || [];

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('MarketPlace'),
            href: publisher.dashboard.url(),
        },
    ];

    return (
        <AppLayout>
            <Head title={t('MarketPlace')} />
            <div className="workspace-page flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={t('Campaign Marketplace')}
                    description={t(
                        'Find campaigns that fit your audience and build your next partnership.',
                    )}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex flex-wrap items-center gap-3">
                            {auth?.permissions?.includes(
                                'view_my_campaigns',
                            ) && (
                                <Button asChild>
                                    <Link href={publishers.my.campaign.url()}>
                                        {t('My Campaigns')}
                                        <ArrowUpRight className="size-4" />
                                    </Link>
                                </Button>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={filters?.campaign_status || 'A'}
                                    onValueChange={(v) =>
                                        handleFilterChange('campaign_status', v)
                                    }
                                >
                                    <SelectTrigger className="h-9 w-[140px]">
                                        <SelectValue
                                            placeholder={t('Campaign Status')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">
                                            {t('Active')}
                                        </SelectItem>
                                        <SelectItem value="I">
                                            {t('Inactive')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={filters?.application_status || 'all'}
                                    onValueChange={(v) =>
                                        handleFilterChange(
                                            'application_status',
                                            v === 'all' ? null : v,
                                        )
                                    }
                                >
                                    <SelectTrigger className="h-9 w-40">
                                        <SelectValue
                                            placeholder={t('App Status')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            {t('All Applications')}
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
                                        <SelectItem value="none">
                                            {t('Not Applied')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-2"
                                        >
                                            <CalendarIcon className="h-4 w-4" />
                                            {t('Dates')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-80 p-4"
                                        align="end"
                                    >
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>
                                                    {t('Campaign Start Date')}
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={
                                                        filters?.start_date ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        handleFilterChange(
                                                            'start_date',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>
                                                    {t('Applied Date (From)')}
                                                </Label>
                                                <Input
                                                    type="date"
                                                    value={
                                                        filters?.applied_start_date ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        handleFilterChange(
                                                            'applied_start_date',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {(filters?.campaign_status ||
                                    filters?.application_status ||
                                    filters?.start_date ||
                                    filters?.applied_start_date) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-9 text-muted-foreground"
                                    >
                                        <FilterX className="mr-2 h-4 w-4" />
                                        {t('Clear')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    }
                />
                <div className="flex flex-col gap-4">
                    {campaignItems && campaignItems.length > 0 ? (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {campaignItems.map((campaign: any) => (
                                <div
                                    key={campaign.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${t('View details')}: ${campaign.name}`}
                                    className="cursor-pointer rounded-xl outline-offset-4"
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            setSelectedCampaign(campaign);
                                            setDrawerOpen(true);
                                        }
                                    }}
                                    onClick={() => {
                                        setSelectedCampaign(campaign);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    <CampaignCard campaign={campaign} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <div className="mx-auto max-w-md">
                                    <h3 className="mb-2 text-lg font-semibold">
                                        {t('No campaigns available')}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        {t(
                                            'Advertisers create campaigns and your network reviews publisher applications. If no campaigns are available after clearing filters, contact your network operator.',
                                        )}
                                    </p>
                                    <Button
                                        className="mt-4"
                                        variant="outline"
                                        onClick={clearFilters}
                                    >
                                        {t('Clear filters')}
                                    </Button>
                                    <a
                                        href="/docs/campaign-setup"
                                        className="ml-4 text-sm text-primary underline"
                                    >
                                        {t('How to join a campaign')}
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {campaigns?.last_page > 1 && (
                    <div className="mt-6 flex justify-center">
                        <ReusablePagination
                            page={campaigns.current_page}
                            pageCount={campaigns.last_page}
                            onPageChange={(page) =>
                                handleFilterChange('page', page)
                            }
                        />
                    </div>
                )}
                <ReusableSheet
                    side="right"
                    width="50vw"
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    title={t('Campaign Details')}
                    description={t('Selected campaign details')}
                    children={<SideDrawer campaign={selectedCampaign} />}
                />
            </div>
        </AppLayout>
    );
};
export default PublisherDashboard;
