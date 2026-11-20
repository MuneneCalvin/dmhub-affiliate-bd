/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

import {
    EmailField,
    SearchSelect,
    TextField,
} from '@/components/app/form-controls';
import { useLanguage } from '@/context/language-context';
import { store } from '@/routes/advertisers';
import { TCurrency, TNetwork, TUserNetworks } from '@/types';
import { TAdvertiserOnboardingTypes } from '@/types/schema_types';
import { advertiserSchema } from '@/utils/form-schema';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const CreateAdvertiser = ({
    handleDialogContextSwitch,
}: {
    setAdvertiser: React.Dispatch<React.SetStateAction<any>>;
    handleDialogContextSwitch: any;
}) => {
    const { networks, extingNetwork } = usePage<{
        networks: TNetwork[];
        extingNetwork: TUserNetworks;
    }>().props;
    const { currencies } = usePage<{ currencies: TCurrency[] }>().props;
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { __ } = useLanguage();

    const [data, setData] = useState<TAdvertiserOnboardingTypes>({
        business_name: '',
        website_name: '',
        industry: '',
        coc_number: '',
        first_name: '',
        last_name: '',
        email: '',
        total_budget: '',
        currency_code: extingNetwork?.network?.default_currency ?? '',
        network_id: extingNetwork ? String(extingNetwork?.network_id) : '',
    });

    const updateData = <K extends keyof TAdvertiserOnboardingTypes>(
        key: K,
        value: TAdvertiserOnboardingTypes[K],
    ) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const validateStepOne = () => {
        const partialSchema = advertiserSchema.pick({
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
        const partialSchema = advertiserSchema.pick({
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

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalCheck = advertiserSchema.safeParse(data);
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
        setIsSubmitting(true);

        router.post(
            store(),
            {
                ...data,
                role_name: 'advertiser',
            },
            {
                onSuccess: () => {
                    toast.success('Advertiser created successfully');
                    setIsSubmitting(false);
                    handleDialogContextSwitch?.({ state: false });
                    router.reload({ only: ['advrts'] });
                },
                onError: (errors: any) => {
                    toast.warning(
                        errors?.response?.error || 'An error occurred',
                    );
                    setIsSubmitting(false);
                },
            },
        );
    };

    const networkOptions = networks.map((network: TNetwork) => ({
        value: String(network.id),
        label: network.network_name,
    }));

    const currencyOptions = currencies.map((currency: TCurrency) => ({
        value: String(currency.currency_code),
        label: currency.currency_name,
    }));

    return (
        <div className="w-full">
            <form className="w-full space-y-10" onSubmit={onSubmit}>
                {/* Step 1: Business Details */}
                {step === 1 && (
                    <div className="space-y-8">
                        <DialogHeader icon={<Building2 />} tone="partners">
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
                                placeholder="Advertiser LLC"
                                onChange={(value) =>
                                    updateData('business_name', value)
                                }
                                error={errors.business_name}
                            />

                            <TextField
                                id="website_name"
                                label={__('Website URL')}
                                required
                                type="url"
                                value={data.website_name}
                                placeholder="https://www.example.com"
                                onChange={(value) =>
                                    updateData('website_name', value)
                                }
                                error={errors.website_name}
                            />

                            <TextField
                                id="industry"
                                label={__('Industry')}
                                required
                                value={data.industry}
                                placeholder="Finance, E-commerce, etc"
                                onChange={(value) =>
                                    updateData('industry', value)
                                }
                                error={errors.industry}
                            />

                            <TextField
                                id="coc_number"
                                label={__('Chamber Of Commerce Number')}
                                required
                                value={data.coc_number}
                                placeholder="e.g. SB1234567"
                                onChange={(value) =>
                                    updateData('coc_number', value)
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
                        <DialogHeader icon={<Building2 />} tone="partners">
                            <DialogTitle>
                                {__('Personal Information')}
                            </DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Enter personal details for the advertiser account.',
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
                                    placeholder="John"
                                    onChange={(value) =>
                                        updateData('first_name', value)
                                    }
                                    error={errors.first_name}
                                />

                                <TextField
                                    id="last_name"
                                    label={__('Last Name')}
                                    required
                                    value={data.last_name}
                                    placeholder="Doe"
                                    onChange={(value) =>
                                        updateData('last_name', value)
                                    }
                                    error={errors.last_name}
                                />
                            </div>

                            <EmailField
                                id="email"
                                label={__('Email Address')}
                                required
                                value={data.email}
                                placeholder="john.doe@example.com"
                                onChange={(value) => updateData('email', value)}
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

                {/* Step 3: Network & Budget */}
                {step === 3 && (
                    <div className="space-y-8">
                        <DialogHeader icon={<Building2 />} tone="partners">
                            <DialogTitle>{__('Network & Budget')}</DialogTitle>
                            <DialogDescription>
                                {__(
                                    'Assign network and configure budget settings.',
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <SearchSelect
                                id="network_id"
                                label={__('Network')}
                                required
                                options={networkOptions}
                                placeholder={__('Select Network')}
                                value={data.network_id}
                                onChange={(value) =>
                                    value && updateData('network_id', value)
                                }
                                error={errors.network_id}
                            />

                            <SearchSelect
                                id="currency_code"
                                label={__('Default Currency')}
                                required
                                options={currencyOptions}
                                placeholder={__('Select Currency')}
                                value={data.currency_code}
                                onChange={(value) =>
                                    value && updateData('currency_code', value)
                                }
                                error={errors.currency_code}
                            />

                            <TextField
                                id="total_budget"
                                label={__('Total Budget')}
                                value={data.total_budget}
                                placeholder="10000"
                                onChange={(value) =>
                                    updateData('total_budget', value)
                                }
                                error={errors.total_budget}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setStep(2)}
                                disabled={isSubmitting}
                            >
                                <ArrowLeft />
                                {__('Back')}
                            </Button>

                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
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

export default CreateAdvertiser;
