/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useForm as useInertiaForm } from '@inertiajs/react';
import {
    ReusableEmailInput,
    ReusableNumberInput,
    ReusableSearchSelect,
    ReusableTextInput
} from '@/dev/core';
import { PublisherPagesTypes, TCurrency, TNetwork } from '@/types';
import { usePage } from '@inertiajs/react';
import { publisherSchemaEdit } from '@/utils/form-schema';
import { update } from '@/routes/publishers';

const EditPublisherForm = ({
    handleDialogContextSwitch,
    componentProps,
}: {
    handleDialogContextSwitch: any,
    componentProps: any
}) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { __ } = useLanguage();
    const { networks, currencies } = usePage<PublisherPagesTypes>().props;
    const initialData = componentProps?.data ?? {};

    const { data, setData, post, processing } = useInertiaForm({
        first_name: initialData.first_name ?? "",
        last_name: initialData.last_name ?? "",
        email: initialData.email ?? "",
        title: initialData.title ?? "",
        network_id: initialData.network_id ? String(initialData.network_id) : "",
        website_url: initialData.website_url ?? "",
        payout_threshold: initialData.payout_threshold
            ? Number(initialData.payout_threshold)
            : 1,
        currency: initialData.currency ?? '',
    });

    const validateStepOne = () => {
        const partialSchema = publisherSchemaEdit.pick({
            first_name: true,
            last_name: true,
            email: true,
            // title: true,
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

    const handleNext = () => {
        if (validateStepOne()) {
            setStep(2);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCheck = publisherSchemaEdit.safeParse(data);
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
        post(update.url(componentProps?.data?.user_id));
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
                {step === 1 ? (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Personal Details")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Provide accurate personal information.")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ReusableTextInput
                                id="first_name"
                                label={__("First Name")}
                                required
                                value={data.first_name}
                                placeholder={__("First name")}
                                onChange={(value) => setData("first_name", String(value))}
                                error={errors.first_name}
                            />
                            <ReusableTextInput
                                id="last_name"
                                label={__("Last Name")}
                                required
                                value={data.last_name}
                                placeholder={__("Last name")}
                                onChange={(value) => setData("last_name", value)}
                                error={errors.last_name}
                            />

                            <ReusableEmailInput
                                id="email"
                                label={__("Email Address")}
                                required
                                value={data.email}
                                placeholder={__("example@mail.com")}
                                onChange={(value) => setData("email", value)}
                                error={errors.email}
                            />
                            <ReusableTextInput
                                id="title"
                                label={__("Title")}
                                required
                                value={data.title}
                                placeholder={__("Publisher")}
                                onChange={(value) => setData("title", value)}
                                error={errors.title}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button variant="outline" disabled className="w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {__("Back")}
                            </Button>
                            {/* <button
                                type="button"
                                onClick={() => handleNext}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                                Next
                            </button> */}
                            <button
                                type="button"
                                onClick={() => handleNext()}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
                                Next
                            </button>

                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{__("Other Information")}</h3>
                            <p className="text-sm text-muted-foreground">
                                {__("Enter other details to complete your account.")}
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
                                id="currency"
                                label={__("Default Currency")}
                                required
                                data={curOptions}
                                placeholder={__("Select Default Currency")}
                                value={String(data.currency)}
                                onChange={(value) => value && setData("currency", String(value))}
                                error={errors.currency}
                            />
                            <ReusableTextInput
                                id="website_url"
                                label={__("Website")}
                                required
                                value={data.website_url}
                                placeholder={__("www.example.com")}
                                onChange={(value) => setData("website_url", value)}
                                error={errors.website_url}
                            />
                            <ReusableNumberInput
                                id="payout_threshold"
                                label={__("Payment Threshold")}
                                value={Number(data.payout_threshold)}
                                min={1}
                                step={1}
                                max={4}
                                required
                                onChange={(value) => setData("payout_threshold", Number(value) || 1)}
                                error={errors.payout_threshold}
                            />

                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setStep(1)}
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

export default EditPublisherForm;