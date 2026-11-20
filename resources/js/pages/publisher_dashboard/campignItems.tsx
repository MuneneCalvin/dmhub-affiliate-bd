import { formatCommission } from '@/components/partner-money';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/dev/statusBadge';
import { TCampaign, TOffers } from '@/types';
import { Clock, ExternalLink, Target, TrendingUp } from 'lucide-react';

const OffersDisplay = ({
    offersItems,
    campaign,
}: {
    offersItems: TOffers[];
    campaign: TCampaign;
}) => {
    return (
        <div className="space-y-4">
            {offersItems.map((offer: TOffers) => (
                <div
                    key={offer.id}
                    className="space-y-3 rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                            <h4 className="text-base font-semibold">
                                {offer?.name}
                            </h4>
                            <StatusBadge
                                status={offer?.offer_status}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                        {offer?.description}
                    </p>
                    <div className="space-y-2 rounded-md bg-green-50 p-3 dark:bg-green-950/20">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-green-800 dark:text-green-300">
                                Commission
                            </span>
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        {offer?.commission_type_1 && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {offer.commission_type_1}
                                </span>
                                <span className="font-semibold text-green-700 dark:text-green-300">
                                    {formatCommission(
                                        offer?.commission_value_1,
                                        offer?.commission_type_1,
                                        campaign?.currency,
                                    )}
                                </span>
                            </div>
                        )}
                        {offer?.commission_type_2 && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {offer?.commission_type_2}
                                </span>
                                <span className="font-semibold text-green-700 dark:text-green-300">
                                    {formatCommission(
                                        offer?.commission_value_2,
                                        offer?.commission_type_2,
                                        campaign?.currency,
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">
                                    Cookie Life
                                </p>
                                <p className="font-medium">
                                    {offer?.click_cookie_lifetime_hours}h
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">
                                    Conv. Window
                                </p>
                                <p className="font-medium">
                                    {offer?.conversion_window_hours}h
                                </p>
                            </div>
                        </div>
                    </div>
                    {offer?.preview_url && (
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={offer?.preview_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="mr-1 h-4 w-4" />
                                    Preview
                                </a>
                            </Button>
                        </div>
                    )}
                    {offer.bonus && (
                        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900 dark:bg-yellow-950/20">
                            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                                Bonus: {String(offer?.bonus)}
                            </p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default OffersDisplay;
