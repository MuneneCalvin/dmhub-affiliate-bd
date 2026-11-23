/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    EmailField,
    SearchSelect,
    TextField,
} from '@/components/app/form-controls';
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/context/language-context';
import { DEFAULT_CURRENCY } from '@/lib/format';
import { store } from '@/routes/publishers';
import { PublisherPagesTypes, TCurrency, TNetwork } from '@/types';
import { TPublisherOnboardingTypes } from '@/types/schema_types';
import { publisherSchema } from '@/utils/form-schema';
import { useForm as useInertiaForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Loader2, Newspaper } from 'lucide-react';
import React, { useState } from 'react';

const CreatePublisherForm = ({
    handleDialogContextSwitch,
}: {
    handleDialogContextSwitch: any;
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { __ } = useLanguage();
    const { networks, currencies, extingNetwork } =
        usePage<PublisherPagesTypes>().props;

    const { data, setData, post, processing } =
        useInertiaForm<TPublisherOnboardingTypes>({
            business_name: '',
            website_name: '',
            industry: '',
            coc_number: '',
            first_name: '',
            last_name: '',
            email: '',
            title: '',
            currency_code:
                extingNetwork?.network?.default_currency ?? DEFAULT_CURRENCY,
            network_id: extingNetwork ? String(extingNetwork?.network_id) : '',
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
                        <DialogHeader icon={<Newspaper />} tone="partners">
                            <DialogTitle>{__('Business Details')}</DialogTitle>
                            <DialogDescription>
                                {__('Provide accurate business information.')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <TextField
                                id="business_name"
                                label={__('Business Name')}
                                required
                                value={data.business_name}
                                placeholder={__('Publisher LLC')}
                                onChange={(value) =>
                                    setData('business_name', value)
                                }
                                error={errors.business_name}
                            />

                            <TextField
                                id="website_name"
                                label={__('Website URL')}
                                required
                                type="url"
                                value={data.website_name}
                                placeholder={__('https://www.example.com')}
                                onChange={(value) =>
                                    setData('website_name', value)
                                }
                                error={errors.website_name}
                            />

                            <TextField
                                id="industry"
                                label={__('Industry')}
                                required
                                value={data.industry}
                                placeholder={__('Finance, E-commerce, etc')}
                                onChange={(value) => setData('industry', value)}
                                error={errors.industry}
                            />

                            <TextField
                                id="coc_number"
                                label={__('Chamber Of Commerce Number')}
                                required
                                value={data.coc_number}
                                placeholder={__('e.g. SB1234567')}
                                onChange={(value) =>
                                    setData('coc_number', value)
                                }
                                error={errors.coc_number}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" onClick={handleNextToStep2}>
                                {__('Next')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 2: Personal Information */}
                {step === 2 && (
                    <div className="space-y-8">
                        <DialogHeader icon={<Newspaper />} tone="partners">
                            <DialogTitle>
                                {__('Personal Information')}
                            </DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Enter personal details for the publisher account.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <TextField
                                    id="first_name"
                                    label={__('First Name')}
                                    required
                                    value={data.first_name}
                                    placeholder={__('John')}
                                    onChange={(value) =>
                                        setData('first_name', value)
                                    }
                                    error={errors.first_name}
                                />
                                <TextField
                                    id="last_name"
                                    label={__('Last Name')}
                                    required
                                    value={data.last_name}
                                    placeholder={__('Doe')}
                                    onChange={(value) =>
                                        setData('last_name', value)
                                    }
                                    error={errors.last_name}
                                />
                            </div>

                            <EmailField
                                id="email"
                                label={__('Email Address')}
                                required
                                value={data.email}
                                placeholder={__('john.doe@example.com')}
                                onChange={(value) => setData('email', value)}
                                error={errors.email}
                            />

                            <p className="text-sm text-ink-muted">
                                {__(
                                    'Login credentials will be sent to this email after creation.',
                                )}
                            </p>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setStep(1)}
                            >
                                <ArrowLeft />
                                {__('Back')}
                            </Button>

                            <Button type="button" onClick={handleNextToStep3}>
                                {__('Next')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {/* Step 3: Network & Other Details */}
                {step === 3 && (
                    <div className="space-y-8">
                        <DialogHeader icon={<Newspaper />} tone="partners">
                            <DialogTitle>
                                {__('Network & Settings')}
                            </DialogTitle>
                            <DialogDescription>
                                {__('Assign network and configure settings.')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <SearchSelect
                                id="network_id"
                                label={__('Network')}
                                required
                                options={networkOptions}
                                placeholder={__('Select Network')}
                                value={String(data.network_id)}
                                onChange={(value) =>
                                    value &&
                                    setData('network_id', String(value))
                                }
                                error={errors.network_id}
                            />

                            <SearchSelect
                                id="currency_code"
                                label={__('Default Currency')}
                                required
                                options={curOptions}
                                placeholder={__('Select Default Currency')}
                                value={String(data.currency_code)}
                                onChange={(value) =>
                                    value &&
                                    setData('currency_code', String(value))
                                }
                                error={errors.currency_code}
                            />

                            <TextField
                                id="title"
                                label={__('Title')}
                                value={data.title}
                                placeholder={__('Publisher')}
                                onChange={(value) => setData('title', value)}
                                error={errors.title}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setStep(2)}
                                disabled={processing}
                            >
                                <ArrowLeft />
                                {__('Back')}
                            </Button>

                            <Button type="submit" disabled={processing}>
                                {processing && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {__('Submit')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreatePublisherForm;
