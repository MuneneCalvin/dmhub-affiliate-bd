/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/layouts/app-layout";
import { Head, router, usePage } from "@inertiajs/react";
import {
    ExternalLink,
    Image,
    Link2,
    MousePointerClick,
    Eye,
    // FileText,
    BarChart3,
    Info,
    Code,
    Pencil,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReusablePageTitle, CopyButton, InfoCardSkeleton, InfoRow } from "@/dev/core";
import { BreadcrumbItem, Creative } from "@/types";
import advertiser from "@/routes/advertiser";
import { StatusBadge } from "@/dev/statusBadge";

const CreativeShow = () => {
    const { t } = useTranslation();
    const { creative } = usePage<any>().props as { creative: Creative };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t("Creatives"), href: advertiser.creatives.index.url() },
        { title: creative?.name, href: advertiser.creatives.show(creative?.id).url },
    ];

    const trackingUrl = creative?.tracking_code
        ? `${window.location.origin}/c/${creative?.tracking_code}`
        : "";
    const impressionUrl = creative?.tracking_code
        ? `${window.location.origin}/i/${creative?.tracking_code}`
        : "";

    const getCtr = () => {
        if (!creative?.impressions || creative?.impressions === 0) return "0.00";
        return ((creative?.clicks / creative?.impressions) * 100).toFixed(2);
    };

    return (
        <AppLayout>
            <Head title={`${creative?.name} - Creative Details`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={creative?.name}
                    description={t("Creative Tracking Codes")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => router.visit(advertiser.creatives.edit(creative?.id))}>
                                <Pencil className="w-4 h-4 mr-2" />
                                {t("Edit Creative")}
                            </Button>
                        </div>
                    } />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <InfoCardSkeleton
                            title={t("Direct Tracking URL")}
                            description={t("Use this URL to track clicks directly to this creative")}
                            icon={<Link2 className="w-5 h-5" />}
                            children={
                                <div className="flex gap-2">
                                    <Input
                                        value={trackingUrl}
                                        readOnly
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton text={trackingUrl} label={t("Copy URL")} />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(trackingUrl, "_blank")}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                </div>
                            } />
                        <InfoCardSkeleton
                            title={t("Embed Code (Click Tracking)")}
                            description={t("Copy this HTML code to embed the creative with click tracking")}
                            icon={<MousePointerClick className="w-5 h-5" />}
                            children={
                                <div className="space-y-4">
                                    <Textarea
                                        value={creative?.embed_code || ""}
                                        readOnly
                                        rows={6}
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton
                                        text={creative?.embed_code || ""}
                                        label={t("Copy Embed Code")}
                                    />
                                </div>
                            } />
                        <InfoCardSkeleton
                            title={t("Impression Tracking Pixel")}
                            description={t("Add this invisible pixel to track impressions (views)")}
                            icon={<Eye className="w-5 h-5" />}
                            children={
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t("Pixel URL")}</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={impressionUrl}
                                                readOnly
                                                className="font-mono text-sm"
                                            />
                                            <CopyButton text={impressionUrl} label={t("Copy")} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("HTML Pixel Code")}</Label>
                                        <Textarea
                                            value={creative?.tracking_pixel || ""}
                                            readOnly
                                            rows={2}
                                            className="font-mono text-sm"
                                        />
                                        <CopyButton
                                            text={creative?.tracking_pixel || ""}
                                            label={t("Copy Pixel Code")}
                                        />
                                    </div>
                                </div>
                            } />
                        <InfoCardSkeleton
                            title={t("Complete Code (Embed + Pixel)")}
                            description={t("Use this code to track both clicks and impressions")}
                            icon={<Code className="w-5 h-5" />}
                            children={
                                <div className="space-y-4">
                                    <Textarea
                                        value={`${creative.embed_code || ""}\n${creative.tracking_pixel || ""}`}
                                        readOnly
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                    <CopyButton
                                        text={`${creative.embed_code || ""}\n${creative.tracking_pixel || ""}`}
                                        label={t("Copy Complete Code")}
                                    />
                                </div>
                            } />
                        {/* {creative?.lead_form_embed_code && (
                            <InfoCardSkeleton
                                title={t("Lead Gen Form Embed")}
                                description={t("Embed this code to collect leads directly on your website")}
                                icon={<FileText className="w-5 h-5" />}
                                className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20"
                                children={
                                    <div className="space-y-4">
                                        <Textarea
                                            value={creative?.lead_form_embed_code}
                                            readOnly
                                            rows={8}
                                            className="font-mono text-sm bg-white dark:bg-gray-950"
                                        />
                                        <div className="flex justify-end">
                                            <CopyButton
                                                text={creative?.lead_form_embed_code}
                                                label={t("Copy Form Code")}
                                            />
                                        </div>
                                    </div>
                                } />
                        )} */}
                    </div>
                    <div className="space-y-6">
                        <InfoCardSkeleton
                            title={t("Preview")}
                            icon={<Image className="w-5 h-5" />}
                            children={
                                <>
                                    {creative?.file_url && (
                                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                            {creative?.type === "video" ? (
                                                <video
                                                    src={creative?.file_url}
                                                    controls
                                                    className="max-w-full h-auto"
                                                />
                                            ) : (
                                                <img
                                                    src={creative?.file_url}
                                                    alt={creative?.alt_text || creative?.name}
                                                    className="max-w-full h-auto"
                                                />
                                            )}
                                        </div>
                                    )}
                                </>
                            } />
                        <InfoCardSkeleton
                            title={t("Creative Details")}
                            icon={<Info className="w-5 h-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t("Type")}
                                        value={<StatusBadge status={creative?.type} />}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Dimensions")}
                                        value={
                                            creative?.width && creative?.height
                                                ? `${creative?.width} x ${creative?.height}`
                                                : "-"
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Campaign")}
                                        value={creative?.campaign?.name || "-"}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Offer")}
                                        value={creative?.offer?.name || "-"}
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Status")}
                                        value={
                                            <StatusBadge status={creative?.status} />
                                        }
                                    />
                                </>
                            } />

                        <InfoCardSkeleton
                            title={t("Performance")}
                            icon={<BarChart3 className="w-5 h-5" />}
                            children={
                                <>
                                    <InfoRow
                                        label={t("Impressions")}
                                        value={
                                            <span className="font-semibold">
                                                {creative?.impressions?.toLocaleString() || 0}
                                            </span>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("Clicks")}
                                        value={
                                            <span className="font-semibold">
                                                {creative?.clicks?.toLocaleString() || 0}
                                            </span>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        label={t("CTR")}
                                        value={<span className="font-semibold">{getCtr()}%</span>}
                                    />
                                </>
                            } />

                        <InfoCardSkeleton
                            title={t("Tracking Code")}
                            icon={<Link2 className="w-5 h-5" />}
                            children={
                                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {creative?.tracking_code || "-"}
                                </code>
                            } />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default CreativeShow;
