import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SideDrawerProps } from "@/types";
import { formatCurrency, formatDate } from "@/utils/utils";
import { CheckCircle, Target } from "lucide-react";
import OffersDisplay from "./campignItems";
import publishers from "@/routes/publishers";
import { router } from "@inertiajs/react";
import { useTranslation } from "react-i18next";

export const SideDrawer = ({ campaign }: SideDrawerProps) => {
    const { t } = useTranslation();
    const availableBudget = (campaign?.total_budget || 0) - (campaign?.spent_amount || 0);
    const offers = campaign?.offers || [];
    const hasOffers = offers.length > 0;
    return (
        <div className="w-full h-full flex flex-col lg:flex-row gap-6">
            <div className="flex-1 overflow-y-auto lg:pr-4">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <h2 className="text-2xl font-semibold leading-tight">{campaign?.name}</h2>
                            <Badge variant={campaign?.campaign_status === "A" ? "default" : "secondary"}>
                                {campaign?.campaign_status === "A" ? t("Active") : t("Inactive")}
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                            <span>{t('Posted')} {formatDate(campaign?.start_date)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{campaign.device_targeting?.value || t("All devices")}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{campaign.geo_targeting?.value || t("Global")}</span>
                        </div>
                        <Button
                            className="w-full mt-4"
                            size="lg"
                            onClick={() => router.visit(publishers.campaign.application.url({ id: campaign?.id }))}>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {t('Apply to Campaign')}
                        </Button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">{t('Total Budget')}</p>
                                <p className="text-lg font-semibold">{formatCurrency(campaign?.total_budget, campaign?.currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('Spent')}</p>
                                <p className="text-lg font-semibold">{formatCurrency(campaign?.spent_amount, campaign?.currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('Available')}</p>
                                <p className="text-lg font-semibold text-green-600">{formatCurrency(availableBudget, campaign?.currency)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold">{t('Campaign Description')}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{campaign?.description}</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">{t('Campaign Details')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Daily Budget')}</p>
                                <p className="font-medium">{formatCurrency(campaign?.daily_budget, campaign?.currency)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Currency')}</p>
                                <p className="font-medium">{campaign?.currency}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Start Date')}</p>
                                <p className="font-medium">{formatDate(campaign?.start_date)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('End Date')}</p>
                                <p className="font-medium">{formatDate(campaign?.end_date)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Max Publishers')}</p>
                                <p className="font-medium">{campaign?.max_publishers || t("Unlimited")}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Minimum Payout')}</p>
                                <p className="font-medium">{formatCurrency(campaign?.minimum_payout, campaign?.currency)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">{t('Performance Metrics')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Target Conversions')}</p>
                                <p className="text-xl font-semibold">{campaign?.target_conversions || "N/A"}</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Target ROI')}</p>
                                <p className="text-xl font-semibold">{campaign?.target_roi ? `${campaign?.target_roi}%` : "N/A"}</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Total Clicks')}</p>
                                <p className="text-xl font-semibold">{campaign?.total_clicks || 0}</p>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                                <p className="text-xs text-muted-foreground">{t('Total Conversions')}</p>
                                <p className="text-xl font-semibold">{campaign?.total_conversions || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold">{t('Targeting & Requirements')}</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-32 text-xs text-muted-foreground pt-1">{t('Device')}</div>
                                <div className="flex-1">
                                    <Badge variant="outline">{campaign?.device_targeting?.value || t("All Devices")}</Badge>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-32 text-xs text-muted-foreground pt-1">{t('Geography')}</div>
                                <div className="flex-1">
                                    <Badge variant="outline">{campaign?.geo_targeting?.value || t("Global")}</Badge>
                                </div>
                            </div>
                            {campaign?.allowed_traffic_sources && (
                                <div className="flex items-start gap-3">
                                    <div className="w-32 text-xs text-muted-foreground pt-1">{t('Allowed Traffic')}</div>
                                    <div className="flex-1">
                                        <p className="text-sm">{campaign?.allowed_traffic_sources}</p>
                                    </div>
                                </div>
                            )}
                            {campaign?.prohibited_traffic_sources && (
                                <div className="flex items-start gap-3">
                                    <div className="w-32 text-xs text-muted-foreground pt-1">{t('Prohibited Traffic')}</div>
                                    <div className="flex-1">
                                        <p className="text-sm text-red-600">{campaign?.prohibited_traffic_sources}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {campaign?.terms && (
                        <div className="space-y-2">
                            <h3 className="font-semibold">{t('Terms & Conditions')}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{campaign?.terms?.value}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-6 overflow-y-auto">
                <div className="space-y-4">
                    <div className="lg:sticky lg:top-0 bg-background pb-4 border-b">
                        <h3 className="font-semibold text-lg">{t('Available Offers')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {hasOffers ? `${offers.length} ${t('offer')}${offers.length > 1 ? 's' : ''} ${t('available')}` : t("No offers available")}
                        </p>
                    </div>
                    {hasOffers ? (
                        <OffersDisplay offersItems={offers} campaign={campaign} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Target className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="font-semibold mb-2">{t('No Offers Available')}</h4>
                            <p className="text-sm text-muted-foreground">
                                {t("This campaign doesn't have any active offers at the moment. Apply to the campaign and the network will assign you to an offer.")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
