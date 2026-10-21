/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReusablePageTitle, ReusableSheet } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CampaignCard } from './dashbaord_cards';
import { useState } from 'react';
import { SideDrawer } from './side_drawer';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ReusablePagination } from '@/dev/core';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FilterX } from 'lucide-react';

const PublisherDashboard = () => {
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const { campaigns, filters } = usePage<any>().props;

    const handleFilterChange = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value, page: 1 };
        router.get(publisher.dashboard.url(), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        router.get(publisher.dashboard.url(), {}, {
            preserveState: true,
            preserveScroll: true,
        });
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
            <Head title={t("MarketPlace")} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t("Campaign Marketplace")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Select 
                                    value={filters?.campaign_status || 'A'} 
                                    onValueChange={(v) => handleFilterChange('campaign_status', v)}
                                >
                                    <SelectTrigger className="w-[140px] h-9">
                                        <SelectValue placeholder={t('Campaign Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="A">{t('Active')}</SelectItem>
                                        <SelectItem value="I">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select 
                                    value={filters?.application_status || 'all'} 
                                    onValueChange={(v) => handleFilterChange('application_status', v === 'all' ? null : v)}>
                                    <SelectTrigger className="w-40 h-9">
                                        <SelectValue placeholder={t('App Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Applications')}</SelectItem>
                                        <SelectItem value="P">{t('Pending')}</SelectItem>
                                        <SelectItem value="A">{t('Approved')}</SelectItem>
                                        <SelectItem value="R">{t('Rejected')}</SelectItem>
                                        <SelectItem value="none">{t('Not Applied')}</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-9 gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            {t('Dates')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4" align="end">
                                        <div className="space-y-4">
                                            <div className="grid gap-2">
                                                <Label>{t('Campaign Start Date')}</Label>
                                                <Input 
                                                    type="date" 
                                                    value={filters?.start_date || ''} 
                                                    onChange={(e) => handleFilterChange('start_date', e.target.value)} 
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>{t('Applied Date (From)')}</Label>
                                                <Input 
                                                    type="date" 
                                                    value={filters?.applied_start_date || ''} 
                                                    onChange={(e) => handleFilterChange('applied_start_date', e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {(filters?.campaign_status || filters?.application_status || filters?.start_date || filters?.applied_start_date) && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={clearFilters}
                                        className="h-9 text-muted-foreground"
                                    >
                                        <FilterX className="w-4 h-4 mr-2" />
                                        {t('Clear')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    }
                />
                <div className="flex flex-col gap-4">
                    {campaignItems && campaignItems.length > 0 ? (
                        <div className="space-y-3">
                            {campaignItems.map((campaign: any) => (
                                <div
                                    key={campaign.id}
                                    onClick={() => {
                                        setSelectedCampaign(campaign);
                                        setDrawerOpen(true);
                                    }}>
                                    <CampaignCard campaign={campaign} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <div className="max-w-md mx-auto">
                                    <h3 className="text-lg font-semibold mb-2">{t('No campaigns available')}</h3>
                                    <p className="text-muted-foreground">
                                        {t('Try adjusting your filters or check back later for new opportunities.')}
                                    </p>
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
                            onPageChange={(page) => handleFilterChange('page', page)} 
                        />
                    </div>
                )}
                <ReusableSheet
                    side="right"
                    width="50vw"
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    title={t("Campaign Details")}
                    description={t("Selected campaign details")}
                    children={
                        <SideDrawer campaign={selectedCampaign} />
                    }
                />
            </div>
        </AppLayout>
    );
}
export default PublisherDashboard;