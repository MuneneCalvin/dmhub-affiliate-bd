/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
    ReusableNormalSelect,
    ReusableNumberInput,
    ReusableTextarea,
    ReusableTextInput,
    ReusableSearchSelect,
    ReusablePageTitle
} from "@/dev/core";
import AppLayout from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import advertiser from "@/routes/advertiser";
import { BreadcrumbItem } from "@/types";
import { CreativeFormValuesTypes } from "@/types/schema_types";
import { CREATIVE_TYPES } from "@/utils/enums";
import { creativeSchema } from "@/utils/form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head, router, usePage } from "@inertiajs/react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const CreateCreativesPage = () => {
    const { t } = useTranslation();

    const { campaigns, offers } = usePage<any>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Creatives'),
            href: advertiser.creatives.index.url(),
        },
        {
            title: t('Create'),
            href: advertiser.creatives.create.url(),
        }
    ];
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: zodResolver(creativeSchema),
        defaultValues: {
            offer_id: '',
            campaign_id: '',
            name: '',
            type: '',
            width: '',
            height: '',
            file_url: '',
            preview_url: '',
            html_code: '',
            alt_text: '',
        },
    });

    const onSubmit = (values: CreativeFormValuesTypes) => {
        router.post(advertiser.creatives.store(), values, {
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <AppLayout>
            <Head title={t("Creatives")} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Creatives")}
                    description={t("Manage creatives here")}
                    breadcrumbs={breadcrumbs} />
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{t("Create Creative")}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Controller
                                    name="campaign_id"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableSearchSelect
                                            id="campaign_id"
                                            label={t("Campaign")}
                                            required
                                            data={campaigns?.map((c: any) => ({
                                                value: String(c.id),
                                                label: c?.name
                                            }))}
                                            placeholder={t("Select Campaign")}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.campaign_id?.message}
                                        />
                                    )}
                                />
                            </div>
                            <div>
                                <Controller
                                    name="offer_id"
                                    control={control}
                                    render={({ field }) => (
                                        <ReusableSearchSelect
                                            id="offer_id"
                                            label={t("Offer")}
                                            required
                                            data={offers?.map((o: any) => ({
                                                value: String(o?.id),
                                                label: o?.name
                                            }))}
                                            placeholder={t("Select Offer")}
                                            value={field.value}
                                            onChange={field.onChange}
                                            error={errors.offer_id?.message}
                                        />
                                    )}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <ReusableTextInput
                                        id="name"
                                        label={t("Creative Name")}
                                        required
                                        placeholder={t("Enter creative name")}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.name?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <ReusableNormalSelect
                                        id="type"
                                        label={t("Creative Type")}
                                        required
                                        data={CREATIVE_TYPES}
                                        placeholder={t("Select Type")}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.type?.message}
                                    />
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Controller
                                name="width"
                                control={control}
                                render={({ field }) => (
                                    <ReusableNumberInput
                                        id="width"
                                        label={t("Width (px)")}
                                        placeholder={t("e.g. 728")}
                                        step={1}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.width?.message}
                                    />
                                )}
                            />
                            <Controller
                                name="height"
                                control={control}
                                render={({ field }) => (
                                    <ReusableNumberInput
                                        id="height"
                                        label={t("Height (px)")}
                                        placeholder={t("e.g. 90")}
                                        step={1}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.height?.message}
                                    />
                                )}
                            />
                        </div>
                        <Controller
                            name="file_url"
                            control={control}
                            render={({ field }) => (
                                <ReusableTextInput
                                    id="file_url"
                                    label={t("File URL")}
                                    type="url"
                                    required
                                    placeholder="https://example.com/creative.jpg"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.file_url?.message}
                                />
                            )}
                        />
                        <Controller
                            name="preview_url"
                            control={control}
                            render={({ field }) => (
                                <ReusableTextInput
                                    id="preview_url"
                                    label={t("Preview URL")}
                                    type="url"
                                    placeholder="https://example.com/preview.jpg"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.preview_url?.message}
                                />
                            )}
                        />
                        <Controller
                            name="html_code"
                            control={control}
                            render={({ field }) => (
                                <ReusableTextarea
                                    id="html_code"
                                    label={t("HTML Code")}
                                    rows={4}
                                    placeholder="<a href='...'><img src='...' /></a>"
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.html_code?.message}
                                />
                            )}
                        />
                        <Controller
                            name="alt_text"
                            control={control}
                            render={({ field }) => (
                                <ReusableTextarea
                                    id="alt_text"
                                    label={t("Alt Text")}
                                    rows={2}
                                    placeholder={t("Descriptive text for the creative")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.alt_text?.message}
                                />
                            )}
                        />
                    </div>

                    <div className="col-span-2 flex gap-4 justify-end mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                router.visit(advertiser.creatives.index.url())
                            }>
                            {t("Back")}
                        </Button>
                        <Button
                            type="submit" className={cn('bg-primary')}>
                            {t("Create Creative")}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
};

export default CreateCreativesPage;
