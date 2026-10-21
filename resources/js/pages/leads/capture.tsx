import { Button } from "@/components/ui/button";
import {
    InfoCardSkeleton,
    ReusableEmailInput,
    ReusableTextInput,
} from "@/dev/core";
import { LeadCaptureProps } from "@/types";
import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const LeadCapturePage = () => {
    const { t } = useTranslation();
    const { click_id, campaign } = usePage<LeadCaptureProps>().props;

    const [formData, setFormData] = useState({
        click_id: click_id,
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        company: "",
        job_title: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: "" }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        router.post("/lead/submit", formData, {
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <div className="min-h-screen from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <Head title={t("Complete Your Registration")} />
            <div className="w-full max-w-2xl">
                <InfoCardSkeleton
                    title={t("Complete Your Registration")}
                    description={campaign?.name ? `${campaign.name} - ${t("Please fill in your details below to continue")}` : t("Please fill in your details below to continue")}
                    className="shadow-xl"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReusableTextInput
                                id="first_name"
                                label={t("First Name")}
                                value={formData.first_name}
                                placeholder="John"
                                required
                                error={errors.first_name}
                                onChange={(value) => handleChange("first_name", value)}
                            />
                            <ReusableTextInput
                                id="last_name"
                                label={t("Last Name")}
                                value={formData.last_name}
                                placeholder="Doe"
                                onChange={(value) => handleChange("last_name", value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReusableEmailInput
                                id="email"
                                label={t("Email Address")}
                                value={formData.email}
                                placeholder="john@example.com"
                                required
                                error={errors.email}
                                onChange={(value) => handleChange("email", value)}
                            />
                            <ReusableTextInput
                                id="phone"
                                label={t("Phone Number")}
                                value={formData.phone}
                                placeholder="+1 234 567 8900"
                                onChange={(value) => handleChange("phone", value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ReusableTextInput
                                id="company"
                                label={t("Company")}
                                value={formData.company}
                                placeholder="Company Name"
                                onChange={(value) => handleChange("company", value)}
                            />
                            <ReusableTextInput
                                id="job_title"
                                label={t("Job Title")}
                                value={formData.job_title}
                                placeholder="Marketing Manager"
                                onChange={(value) => handleChange("job_title", value)}
                            />
                        </div>
                        <ReusableTextInput
                            id="address"
                            label={t("Address")}
                            value={formData.address}
                            placeholder="123 Main Street"
                            onChange={(value) => handleChange("address", value)}
                        />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ReusableTextInput
                                id="city"
                                label={t("City")}
                                value={formData.city}
                                placeholder="New York"
                                onChange={(value) => handleChange("city", value)}
                            />
                            <ReusableTextInput
                                id="state"
                                label={t("State")}
                                value={formData.state}
                                placeholder="NY"
                                onChange={(value) => handleChange("state", value)}
                            />
                            <ReusableTextInput
                                id="postal_code"
                                label={t("Postal Code")}
                                value={formData.postal_code}
                                placeholder="10001"
                                onChange={(value) => handleChange("postal_code", value)}
                            />
                            <ReusableTextInput
                                id="country"
                                label={t("Country")}
                                value={formData.country}
                                placeholder="USA"
                                onChange={(value) => handleChange("country", value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t("Submitting...") : t("Submit")}
                        </Button>

                        <p className="text-xs text-center text-gray-500">
                            {t("By submitting this form, you agree to our Terms of Service and Privacy Policy.")}
                        </p>
                    </form>
                </InfoCardSkeleton>
            </div>
        </div>
    );
};

export default LeadCapturePage;
