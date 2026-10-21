import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import AppLayout from "@/layouts/app-layout";
import { Head, router, usePage } from "@inertiajs/react";
import {
    Calendar,
    Globe,
    MapPin,
    Monitor,
    Save,
    User,
    Activity,
    Target,
    Megaphone,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    InfoCardSkeleton,
    InfoRow,
    ReusableEmailInput,
    ReusableNormalSelect,
    ReusableNumberInput,
    ReusablePageTitle,
    ReusableTextarea,
    ReusableTextInput,
} from "@/dev/core";
import { StatusBadge } from "@/dev/statusBadge";
import { BreadcrumbItem, LeadDetails } from "@/types";
import { formatDate } from "@/utils/utils";
import { priorityOptions, statusOptions } from "@/utils/enums";

const LeadShow = () => {
    const { t } = useTranslation();
    const { lead } = usePage<{ lead: LeadDetails }>().props;

    const [formData, setFormData] = useState({
        first_name: lead.first_name || "",
        last_name: lead.last_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        job_title: lead.job_title || "",
        status: lead.status || "new",
        priority: lead.priority || "medium",
        lead_value: lead.lead_value || "",
        notes: lead.notes || "",
    });

    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t("Leads"), href: "/leads/index" },
        { title: `${lead.first_name} ${lead.last_name}`, href: `/leads/show/${lead.id}` },
    ];

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        setIsSaving(true);
        router.post(`/leads/update/${lead.id}`, formData, {
            onFinish: () => setIsSaving(false),
        });
    };

    const handleStatusChange = (status: string) => {
        handleInputChange("status", status);
        router.post(`/leads/status/${lead.id}`, { status });
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        router.post(`/leads/note/${lead.id}`, { note: newNote }, {
            onSuccess: () => setNewNote(""),
        });
    };

    return (
        <AppLayout>
            <Head title={`${lead.first_name} ${lead.last_name} - ${t('Lead Details')}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={`${lead.first_name} ${lead.last_name}`}
                    description={t("Lead Details")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex gap-2">
                            <Button onClick={handleSave} disabled={isSaving}>
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? t("Saving...") : t("Save Changes")}
                            </Button>
                        </div>
                    } />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <InfoCardSkeleton
                            title={t('Contact Information')}
                            children={
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ReusableTextInput
                                            id="first_name"
                                            label={t("First Name")}
                                            value={formData.first_name}
                                            onChange={(value) => handleInputChange("first_name", value)}
                                        />
                                        <ReusableTextInput
                                            id="last_name"
                                            label={t("Last Name")}
                                            value={formData.last_name}
                                            onChange={(value) => handleInputChange("last_name", value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ReusableEmailInput
                                            id="email"
                                            label={t("Email")}
                                            value={formData.email}
                                            onChange={(value) => handleInputChange("email", value)}
                                        />
                                        <ReusableTextInput
                                            id="phone"
                                            label={t("Phone")}
                                            value={formData.phone}
                                            placeholder="+1 234 567 8900"
                                            onChange={(value) => handleInputChange("phone", value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ReusableTextInput
                                            id="company"
                                            label={t("Company")}
                                            value={formData.company}
                                            onChange={(value) => handleInputChange("company", value)}
                                        />
                                        <ReusableTextInput
                                            id="job_title"
                                            label={t("Job Title")}
                                            value={formData.job_title}
                                            onChange={(value) => handleInputChange("job_title", value)}
                                        />
                                    </div>
                                </>
                            } />
                        <InfoCardSkeleton
                            title={t('Lead Status')}
                            children={
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <ReusableNormalSelect
                                        id="status"
                                        label={t("Status")}
                                        value={formData.status}
                                        data={statusOptions}
                                        onChange={handleStatusChange}
                                    />
                                    <ReusableNormalSelect
                                        id="priority"
                                        label={t("Priority")}
                                        value={formData.priority}
                                        data={priorityOptions}
                                        onChange={(value) => handleInputChange("priority", value)}
                                    />
                                    <ReusableNumberInput
                                        id="lead_value"
                                        label={t("Lead Value")}
                                        value={formData.lead_value}
                                        placeholder="0.00"
                                        step={0.01}
                                        min={0}
                                        onChange={(value) => handleInputChange("lead_value", value)}
                                    />
                                </div>
                            } />
                        <InfoCardSkeleton
                            title={t('Notes')}
                            children={
                                <>
                                    {lead.notes && (
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 whitespace-pre-wrap text-sm">
                                            {lead.notes}
                                        </div>
                                    )}
                                    <ReusableTextarea
                                        id="new_note"
                                        label={t("Add Note")}
                                        value={newNote}
                                        placeholder={t("Add a note...")}
                                        rows={3}
                                        onChange={setNewNote}
                                    />
                                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                                        {t("Add Note")}
                                    </Button>
                                </>
                            } />
                    </div>
                    <div className="space-y-6">
                        <InfoCardSkeleton
                            icon={<Activity className="w-5 h-5" />}
                            title={t("Quick Info")}
                            description={t("Lead overview")}>
                            <InfoRow
                                label={t("Status")}
                                value={<StatusBadge status={lead.status} />}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Priority")}
                                value={<StatusBadge status={lead.priority} />}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Source")}
                                value={lead.source || "-"}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Lead Score")}
                                value={lead.lead_score || 0}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Contact Attempts")}
                                value={lead.contact_attempts || 0}
                            />
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<Megaphone className="w-5 h-5" />}
                            title={t("Campaign Details")}
                            description={t("Associated campaign info")}
                        >
                            <InfoRow
                                label={t("Campaign")}
                                value={lead.campaign?.name || "-"}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Offer")}
                                value={lead.offer?.name || "-"}
                                icon={Target}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Publisher")}
                                value={lead.publisher?.user?.name || "-"}
                                icon={User}
                            />
                            {lead.creative && (
                                <>
                                    <Separator />
                                    <InfoRow
                                        label={t("Creative")}
                                        value={lead.creative.name}
                                    />
                                </>
                            )}
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<Monitor className="w-5 h-5" />}
                            title={t("Tracking Data")}
                            description={t("Device and location info")}
                        >
                            <InfoRow
                                label={t("IP Address")}
                                value={lead.ip_address || "-"}
                                icon={Globe}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Device")}
                                value={`${lead.device_type || "-"} / ${lead.browser || "-"}`}
                                icon={Monitor}
                            />
                            <Separator />
                            <InfoRow
                                label={t("Location")}
                                value={[lead.city_town, lead.region, lead.country_iso].filter(Boolean).join(", ") || "-"}
                                icon={MapPin}
                            />
                            {lead.utm_source && (
                                <>
                                    <Separator />
                                    <div className="py-3">
                                        <p className="text-sm text-muted-foreground mb-2">{t("UTM Parameters")}</p>
                                        <div className="text-xs space-y-1">
                                            <p>{t("Source")}: {lead.utm_source}</p>
                                            {lead.utm_medium && <p>{t("Medium")}: {lead.utm_medium}</p>}
                                            {lead.utm_campaign && <p>{t("Campaign")}: {lead.utm_campaign}</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </InfoCardSkeleton>
                        <InfoCardSkeleton
                            icon={<Calendar className="w-5 h-5" />}
                            title={t("Timeline")}
                            description={t("Important dates")}
                        >
                            <InfoRow
                                label={t("Created")}
                                value={formatDate(lead?.created_at)}
                                icon={Calendar}
                            />
                            {lead.click?.clicked_at && (
                                <>
                                    <Separator />
                                    <InfoRow
                                        label={t("Click Time")}
                                        value={formatDate(lead.click.clicked_at)}
                                        icon={Calendar}
                                    />
                                </>
                            )}
                            {lead.last_contacted_at && (
                                <>
                                    <Separator />
                                    <InfoRow
                                        label={t("Last Contacted")}
                                        value={formatDate(lead.last_contacted_at)}
                                        icon={Calendar}
                                    />
                                </>
                            )}
                            {lead.is_converted && (
                                <>
                                    <Separator />
                                    <InfoRow
                                        label={t("Converted")}
                                        value={
                                            <div className="text-right">
                                                <p className="text-green-600">{formatDate(lead.converted_at)}</p>
                                                {lead.conversion_value && (
                                                    <p className="text-green-600 font-medium">
                                                        ${lead.conversion_value}
                                                    </p>
                                                )}
                                            </div>
                                        }
                                        icon={Calendar}
                                    />
                                </>
                            )}
                        </InfoCardSkeleton>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};
export default LeadShow;