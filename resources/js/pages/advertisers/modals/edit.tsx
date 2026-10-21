/* eslint-disable @typescript-eslint/no-explicit-any */

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { ReusableSearchSelect } from '@/dev/core';
import { update } from '@/routes/advertisers';
import { EditAdvertiserProps, TCurrency } from '@/types';
import { TAdvertiserOnboardingTypes } from '@/types/schema_types';
import { advertiserSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const EditAdvertiser = ({
    componentProps,
    handleDialogContextSwitch,
}: EditAdvertiserProps) => {
    const { currencies } = usePage<{ currencies: TCurrency[] }>().props;
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
        setValue,
        watch,
    } = useForm<TAdvertiserOnboardingTypes>({
        resolver: zodResolver(advertiserSchema),
        defaultValues: {
            business_name: componentProps?.data?.business_name || "",
            website_name: componentProps?.data?.website_name || "",
            industry: componentProps?.data?.industry || "",
            coc_number: componentProps?.data?.coc_number,
            first_name: componentProps?.data?.first_name || "",
            last_name: componentProps?.data?.last_name || "",
            email: componentProps?.data?.email || "",
            total_budget: componentProps?.data?.total_budget || "",
            currency_code: componentProps?.data?.currencyCode || "",
        },
    });

    const handleNext = async () => {
        const valid = await trigger([
            "business_name",
            "website_name",
            "industry",
            "coc_number",
        ]);
        if (valid) setStep(2);
    };

    const handleBack = () => setStep(1);
    const { __ } = useLanguage();

    const onSubmit = (data: TAdvertiserOnboardingTypes) => {
        setIsSubmitting(true);

        router.post(
            update(componentProps?.data?.id),
            {
                ...data,
                role_name: "advertiser",
            },
            {
                onSuccess: () => {
                    toast.success("Advertiser updated successfully");
                    setIsSubmitting(false);
                    handleDialogContextSwitch?.({ state: false });
                    router.reload({ only: ["advrts"] });
                },
                onError: (errors: any) => {
                    toast.warning(errors?.response?.error || "An error occurred");
                    setIsSubmitting(false);
                },
            }
        );
    };

    return (
        <div className="w-full">
            <form className="w-full space-y-10" onSubmit={handleSubmit(onSubmit)}>
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Business Details")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Provide accurate business information.")}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid gap-2">
                                <Label>{__("Business Name")}</Label>
                                <Input
                                    placeholder="Advertiser LLC"
                                    {...register("business_name")}
                                />
                                <InputError message={errors.business_name?.message} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{__("Chamber Of Commerse No.")}</Label>
                                <Input
                                    placeholder="e.g SB123456"
                                    {...register("coc_number")}
                                />
                                <InputError message={errors.coc_number?.message} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{__("Website Url")}</Label>
                                <Input
                                    placeholder="www.example.com"
                                    {...register("website_name")}
                                />
                                <InputError message={errors.website_name?.message} />
                            </div>

                            <div className="grid gap-2">
                                <Label>{__("Industry")}</Label>
                                <Input
                                    placeholder="Finance, E-commerce, etc"
                                    {...register("industry")}
                                />
                                <InputError message={errors.industry?.message} />
                            </div>
                            <div className="grid gap-2">
                                <Label>{__("Default Currency (Optional)")}</Label>
                                <ReusableSearchSelect
                                    id="currency_code"
                                    label={__("Currency")}
                                    data={currencies.map((currency: TCurrency) => ({
                                        value: String(currency.currency_code),
                                        label: String(currency.currency_name),
                                    }))}
                                    placeholder={__("Select Currency")}
                                    value={watch("currency_code")?.toString()}
                                    onChange={(value) => setValue("currency_code", value)}
                                />
                                <InputError message={errors.currency_code?.message} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button variant="outline" disabled className="w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>

                            <Button className="w-full" type="button" onClick={handleNext}>
                                {__("Next")}
                            </Button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Personal Information")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Enter personal details to complete your account.")}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 grid-cols-1 gap-6">
                                <div className="grid gap-2">
                                    <Label>{__("First Name")}</Label>
                                    <Input placeholder="John" {...register("first_name")} />
                                    <InputError message={errors.first_name?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>{__("Last Name")}</Label>
                                    <Input placeholder="Doe" {...register("last_name")} />
                                    <InputError message={errors.last_name?.message} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>{__("Email Address")}</Label>
                                <Input
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    {...register("email")}
                                />
                                <InputError message={errors.email?.message} />
                            </div>

                            <div className="grid gap-2">
                                <Label>{__("Total Budget")}</Label>
                                <Input
                                    type="text"
                                    placeholder="10000"
                                    {...register("total_budget")}
                                />
                                <InputError message={errors.total_budget?.message} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {__("Submit")}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}

export default EditAdvertiser;