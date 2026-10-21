/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useForm as useInertiaForm } from '@inertiajs/react';
import { TPublisherOnboardingTypes } from '@/types/schema_types';
import {
    ReusableEmailInput,
    ReusableSearchSelect,
    ReusableTextInput
} from '@/dev/core';
import { PublisherPagesTypes, TCurrency, TNetwork } from '@/types';
import { usePage } from '@inertiajs/react';
import { publisherSchema } from '@/utils/form-schema';
import { store } from '@/routes/publishers';

const CreatePublisherForm = ({
    handleDialogContextSwitch,
}: {
    handleDialogContextSwitch: any
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { __ } = useLanguage();
    const { networks, currencies, extingNetwork } = usePage<PublisherPagesTypes>().props;

    const { data, setData, post, processing } = useInertiaForm<TPublisherOnboardingTypes>({
        business_name: "",
        website_name: "",
        industry: "",
        coc_number: "",
        first_name: "",
        last_name: "",
        email: "",
        title: "",
        currency_code: extingNetwork?.network?.default_currency ?? "",
        network_id: extingNetwork ? String(extingNetwork?.network_id) : "",
    });
    const validateStepOne = () => {
        const partialSchema = publisherSchema.pick({
            business_name: true,
            website_name: true,
            industry: true,
            coc_number: true,
        });
        const result = partialSchema.safeParse(data);

        if (!result.success) {
            const formatted = result.error.flatten().fieldErrors;
            const errorMap: Record<string, string> = {};

            Object.entries(formatted).forEach(([key, value]) => {
                if (value && value.length > 0) errorMap[key] = value[0];
            });
            setErrors(errorMap);
            return false;
        }
        setErrors({});
        return true;
    };

    const validateStepTwo = () => {
        const partialSchema = publisherSchema.pick({
            first_name: true,
            last_name: true,
            email: true,
        });
        const result = partialSchema.safeParse(data);

        if (!result.success) {
            const formatted = result.error.flatten().fieldErrors;
            const errorMap: Record<string, string> = {};

            Object.entries(formatted).forEach(([key, value]) => {
                if (value && value.length > 0) errorMap[key] = value[0];
            });
            setErrors(errorMap);
            return false;
        }
        setErrors({});
        return true;
    };

    const handleNextToStep2 = () => {
        if (validateStepOne()) setStep(2);
    };

    const handleNextToStep3 = () => {
        if (validateStepTwo()) setStep(3);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCheck = publisherSchema.safeParse(data);
        if (!finalCheck.success) {
            const formatted = finalCheck.error.flatten().fieldErrors;
            const errorMap: Record<string, string> = {};
            Object.entries(formatted).forEach(([key, value]) => {
                if (value && value.length > 0) errorMap[key] = value[0];
            });
            setErrors(errorMap);
            return;
        }
        setErrors({});
        post(store.url());
        handleDialogContextSwitch?.({ state: false });
    };
    const networkOptions = networks.map((network: TNetwork) => ({
        value: String(network.id),
        label: network.network_name,
    }));
    const curOptions = currencies.map((cur: TCurrency) => ({
        value: String(cur.currency_code),
        label: cur.currency_name,
    }));

    return (
        <div className="w-full">
            <form className="w-full space-y-10" onSubmit={handleSubmit}>
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Business Details")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Provide accurate business information.")}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <ReusableTextInput
                                id="business_name"
                                label={__("Business Name")}
                                required
                                value={data.business_name}
                                placeholder={__("Publisher LLC")}
                                onChange={(value) => setData("business_name", value)}
                                error={errors.business_name}
                            />

                            <ReusableTextInput
                                id="website_name"
                                label={__("Website URL")}
                                required
                                type='url'
                                value={data.website_name}
                                placeholder={__("https://www.example.com")}
                                onChange={(value) => setData("website_name", value)}
                                error={errors.website_name}
                            />

                            <ReusableTextInput
                                id="industry"
                                label={__("Industry")}
                                required
                                value={data.industry}
                                placeholder={__("Finance, E-commerce, etc")}
                                onChange={(value) => setData("industry", value)}
                                error={errors.industry}
                            />

                            <ReusableTextInput
                                id="coc_number"
                                label={__("Chamber Of Commerce Number")}
                                required
                                value={data.coc_number}
                                placeholder={__("e.g. SB1234567")}
                                onChange={(value) => setData("coc_number", value)}
                                error={errors.coc_number}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button variant="outline" disabled className="w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>

                            <Button type="button" className="w-full" onClick={handleNextToStep2}>
                                {__("Next")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Personal Information */}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Personal Information")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Enter personal details for the publisher account.")}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ReusableTextInput
                                    id="first_name"
                                    label={__("First Name")}
                                    required
                                    value={data.first_name}
                                    placeholder={__("John")}
                                    onChange={(value) => setData("first_name", value)}
                                    error={errors.first_name}
                                />
                                <ReusableTextInput
                                    id="last_name"
                                    label={__("Last Name")}
                                    required
                                    value={data.last_name}
                                    placeholder={__("Doe")}
                                    onChange={(value) => setData("last_name", value)}
                                    error={errors.last_name}
                                />
                            </div>

                            <ReusableEmailInput
                                id="email"
                                label={__("Email Address")}
                                required
                                value={data.email}
                                placeholder={__("john.doe@example.com")}
                                onChange={(value) => setData("email", value)}
                                error={errors.email}
                            />

                            <p className="text-sm text-muted-foreground">
                                {__("Login credentials will be sent to this email after creation.")}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setStep(1)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>

                            <Button type="button" className="w-full" onClick={handleNextToStep3}>
                                {__("Next")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Network & Other Details */}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Network & Settings")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Assign network and configure settings.")}
                            </p>
                        </div>

                        <div className="space-y-6">
                            <ReusableSearchSelect
                                id="network_id"
                                label={__("Network")}
                                required
                                data={networkOptions}
                                placeholder={__("Select Network")}
                                value={String(data.network_id)}
                                onChange={(value) => value && setData("network_id", String(value))}
                                error={errors.network_id}
                            />

                            <ReusableSearchSelect
                                id="currency_code"
                                label={__("Default Currency")}
                                required
                                data={curOptions}
                                placeholder={__("Select Default Currency")}
                                value={String(data.currency_code)}
                                onChange={(value) => value && setData("currency_code", String(value))}
                                error={errors.currency_code}
                            />

                            <ReusableTextInput
                                id="title"
                                label={__("Title")}
                                value={data.title}
                                placeholder={__("Publisher")}
                                onChange={(value) => setData("title", value)}
                                error={errors.title}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setStep(2)}
                                disabled={processing}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {__("Submit")}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreatePublisherForm;
