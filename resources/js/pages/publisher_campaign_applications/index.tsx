/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ReusableFileInput, ReusablePageTitle, ReusableTextarea } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import { BreadcrumbItem, TOffers } from '@/types';
import { Head, usePage, useForm } from '@inertiajs/react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Globe, Smartphone, TrendingUp, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/utils';
import { CampaignApplicationTypes } from '@/types/schema_types';
import { campaignApplicationSchema } from '@/utils/form-schema';
import { useTranslation } from 'react-i18next';

const CampaignApplicationForm = () => {
    const { t } = useTranslation();
    const { campaign } = usePage<any>().props;

    const { data, setData, post, processing, errors } = useForm<CampaignApplicationTypes>({
        applied_notes: '',
        files: [],
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('MarketPlace'),
            href: publisher.dashboard.url(),
        },
        {
            title: `${campaign?.name}`,
            href: publishers.campaign.application.url({ id: campaign?.id }),
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const parsed = campaignApplicationSchema.safeParse(data);

        if (!parsed.success) {
            return;
        }

        post(
            publishers.campaign.submit.application.url({
                campaignId: campaign?.id,
            })
        );
    };

    const offers = campaign?.offers || [];

    return (
        <AppLayout>
            <Head title={campaign?.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-6">
                <ReusablePageTitle
                    title={t('Submit Application')}
                    breadcrumbs={breadcrumbs}
                />
                <div className='w-full grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    <div className='lg:col-span-2 space-y-6'>
                        <Card>
                            <CardHeader className='font-bold uppercase'>
                                {campaign?.name}
                            </CardHeader>
                            <CardContent className="grid grid-cols-[2fr_1fr] gap-6">
                                <div className="pr-4 border-r space-y-4">
                                    <div className="flex items-center justify-start gap-4">
                                        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-md">
                                            <Calendar className="h-4 w-4 text-blue-600" />
                                            <div className="leading-tight">
                                                <p className="text-[10px] text-gray-600">{t('Start Date')}</p>
                                                <p className="text-xs font-semibold">{formatDate(campaign?.start_date)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-md">
                                            <Calendar className="h-4 w-4 text-red-600" />
                                            <div className="leading-tight">
                                                <p className="text-[10px] text-gray-600">{t('End Date')}</p>
                                                <p className="text-xs font-semibold">{formatDate(campaign?.end_date)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-800">{campaign?.description}</p>
                                    {campaign?.geo_targeting?.value && (
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                            <Globe className="h-5 w-5 text-teal-600" />
                                            <div>
                                                <p className="text-xs text-gray-600">{t('Geo Targeting')}</p>
                                                <p className="font-semibold">{campaign?.geo_targeting?.value}</p>
                                            </div>
                                        </div>
                                    )}
                                    {campaign?.device_targeting?.value && (
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                            <Smartphone className="h-5 w-5 text-indigo-600" />
                                            <div>
                                                <p className="text-xs text-gray-600">{t('Device Targeting')}</p>
                                                <p className="font-semibold">{campaign?.device_targeting?.value}</p>
                                            </div>
                                        </div>
                                    )}
                                    {campaign?.terms?.value && (
                                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                            <Globe className="h-5 w-5 text-teal-600" />
                                            <div>
                                                <p className="text-xs text-gray-600">{t('Terms')}</p>
                                                <p className="font-semibold">{campaign?.terms?.value}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-green-600" />
                                            <p className="text-xs text-gray-600">{t('Total Budget')}</p>
                                        </div>
                                        <p className="font-semibold">{formatCurrency(campaign?.total_budget)}</p>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-5 w-5 text-blue-600" />
                                            <p className="text-xs text-gray-600">{t('Daily Budget')}</p>
                                        </div>
                                        <p className="font-semibold">{formatCurrency(campaign?.daily_budget)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Available Offers Section */}
                        {offers.length > 0 && (
                            <Card>
                                <CardHeader className='flex flex-row items-center gap-2'>
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <span className='font-bold'>{t('Available Offers')} ({offers.length})</span>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
                                        <div className="flex items-start gap-2">
                                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                                {t('When your application is approved, the network will assign you to one of these offers based on your profile and traffic sources.')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {offers.map((offer: TOffers) => (
                                            <div key={offer.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold">{offer.name}</h4>
                                                        {offer.description && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                                {offer.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant={offer.offer_status === 'A' ? 'default' : 'secondary'}>
                                                        {offer.offer_status === 'A' ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                </div>
                                                {(offer.commission_value_1 || offer.commission_value_2) && (
                                                    <div className="mt-2 flex gap-4">
                                                        {offer.commission_value_1 && (
                                                            <div className="text-sm">
                                                                <span className="text-muted-foreground">{t('Commission')}: </span>
                                                                <span className="font-semibold text-green-600">
                                                                    {formatCurrency(offer.commission_value_1, campaign?.currency)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className='lg:col-span-1'>
                        <Card className="sticky top-4">
                            <CardHeader>
                                {t('Application Form')}
                            </CardHeader>
                            <CardContent className='pt-6'>
                                <div className='space-y-4'>
                                    <div>
                                        <ReusableTextarea
                                            id="applied_notes"
                                            label={t('Message')}
                                            required
                                            placeholder={t("Tell us why you're a good fit for this campaign...")}
                                            value={data.applied_notes}
                                            onChange={(value) => setData('applied_notes', value)}
                                            rows={10}
                                            error={errors?.applied_notes}
                                        />
                                    </div>
                                    <div>
                                        <ReusableFileInput
                                            id="attachments"
                                            label={t("Attachments (Optional)")}
                                            value={data.files}
                                            onChange={(files) => setData("files", files)}
                                            multiple
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        className='w-full'
                                        disabled={processing}>
                                        {processing ? t('Submitting...') : t('Submit Application')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CampaignApplicationForm;
