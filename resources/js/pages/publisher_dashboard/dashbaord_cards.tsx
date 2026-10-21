/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/utils/utils';
import { Clock, MapPin, Smartphone, Heart, TrendingUp, Target, Users, ThumbsDown } from 'lucide-react';

export const CampaignCard = ({ campaign }: { campaign: any }) => {
    const startDate = formatDate(campaign?.start_date)
    const endDate = formatDate(campaign?.end_date)
    // const daysLeft = formatDate(campaign?.end_date)

    return (
        <Card className="hover:bg-primary/10 transition-shadow duration-200">
            <CardContent className="p-5">
                <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base font-semibold text-foreground hover:text-primary cursor-pointer transition-colors flex-1">
                            {campaign?.name}
                        </h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 ml-2">
                            <Heart className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 ml-2">
                            <ThumbsDown className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {campaign?.description}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="font-normal text-xs">
                        {formatCurrency(campaign?.total_budget, campaign?.currency)} budget
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {campaign?.target_roi}x ROI
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        {campaign?.target_conversions} conversions
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {campaign?.max_publishers} publishers max
                    </Badge>
                </div>
                <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5" />
                        <div className="flex flex-wrap items-center gap-1">
                            {/* <span className="font-medium text-foreground">{daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}</span> */}
                            <span>·</span>
                            <span>{startDate} - {endDate}</span>
                        </div>
                    </div>
                    {campaign?.geo_targeting?.value && (
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5" />
                            <span>{campaign?.geo_targeting?.value}</span>
                        </div>
                    )}
                    {campaign?.device_targeting?.value && (
                        <div className="flex items-start gap-2">
                            <Smartphone className="w-4 h-4 mt-0.5" />
                            <span>{campaign?.device_targeting?.value}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                    <Badge
                        variant={campaign?.campaign_status === 'A' ? 'default' : 'secondary'}
                        className="text-xs">
                        {campaign?.campaign_status === 'A' ? 'Active Campaign' : 'Inactive'}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
};