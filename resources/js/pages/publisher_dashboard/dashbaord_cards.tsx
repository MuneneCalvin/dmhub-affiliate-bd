import { campaignEnd, campaignRoi } from '@/utils/campaign-display';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/utils/utils';
import {
    ArrowUpRight,
    CalendarDays,
    MapPin,
    Target,
    Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const CampaignCard = ({ campaign }: { campaign: any }) => {
    const { t } = useTranslation();
    return (
        <Card className="h-full gap-0 py-0 transition-colors hover:border-primary/50">
            <CardContent className="flex h-full flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold">
                            {campaign?.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {campaign?.description}
                        </p>
                    </div>
                    <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-4 border-y py-4">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            {t('Budget')}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                            {formatCurrency(
                                campaign?.total_budget,
                                campaign?.currency,
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            {t('Target ROI')}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums">
                            {campaignRoi(campaign?.target_roi, t('Not set'))}
                        </p>
                    </div>
                </div>
                <div className="space-y-2.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0" />
                        {formatDate(campaign?.start_date)} –{' '}
                        {campaignEnd(campaign?.end_date, t('No end date'))}
                    </p>
                    {campaign?.geo_targeting?.value && (
                        <p className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            {campaign.geo_targeting.value}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-4">
                        <span className="flex items-center gap-2">
                            <Target className="size-4" />
                            {campaign?.target_conversions
                                ? `${campaign.target_conversions} ${t('conversions')}`
                                : t('No conversion target')}
                        </span>
                        <span className="flex items-center gap-2">
                            <Users className="size-4" />
                            {campaign?.max_publishers
                                ? `${campaign.max_publishers} ${t('publishers max')}`
                                : t('Unlimited publishers')}
                        </span>
                    </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                    <Badge
                        variant="secondary"
                        className={
                            campaign?.campaign_status === 'A'
                                ? 'bg-accent text-accent-foreground'
                                : ''
                        }
                    >
                        {campaign?.campaign_status === 'A'
                            ? t('Active Campaign')
                            : t('Inactive')}
                    </Badge>
                    <span className="text-xs font-medium text-primary">
                        {t('View details')}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};
