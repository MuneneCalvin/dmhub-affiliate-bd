import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { TPublisherOnboardingTypes } from '@/types/schema_types';
import { publisherSchema } from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const PublisherTabsRegister = ({ type }: { type: string }) => {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
        setError,
        clearErrors,
    } = useForm<TPublisherOnboardingTypes>({
        resolver: zodResolver(publisherSchema),
        defaultValues: {
            business_name: '',
            website_name: '',
            industry: '',
            coc_number: '',
            first_name: '',
            last_name: '',
            email: '',
        },
    });

    const handleNext = async () => {
        const valid = await trigger([
            'business_name',
            'website_name',
            'industry',
            'coc_number',
        ]);
        if (valid) setStep(2);
    };

    const handleBack = () => setStep(1);
    const { __ } = useLanguage();

    const onSubmit = (data: TPublisherOnboardingTypes) => {
        clearErrors();
        setIsSubmitting(true);
        router.post(
            store(),
            {
                ...data,
                role_name: type,
            },
            {
                onSuccess: () =>
                    toast.success(__('Account created successfully')),
                onFinish: () => setIsSubmitting(false),
                onError: (serverErrors) => {
                    Object.entries(serverErrors).forEach(([field, message]) => {
                        setError(field as keyof TPublisherOnboardingTypes, {
                            type: 'server',
                            message,
                        });
                    });
                    const businessFields = [
                        'business_name',
                        'website_name',
                        'industry',
                        'coc_number',
                    ];
                    setStep(
                        businessFields.some((field) => serverErrors[field])
                            ? 1
                            : 2,
                    );
                },
            },
        );
    };

    return (
        <div className="w-full">
            <form
                className="w-full space-y-10"
                onSubmit={handleSubmit(onSubmit)}
            >
                {step === 1 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">
                                {__('Business Details')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {__('Provide accurate business information.')}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="publisher-business_name">
                                    {__('Business Name')}
                                </Label>
                                <Input
                                    placeholder="Publisher LLC"
                                    id="publisher-business_name"
                                    {...register('business_name')}
                                />
                                <InputError
                                    message={errors.business_name?.message}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="publisher-website_name">
                                    {__('Website Url')}
                                </Label>
                                <Input
                                    type="url"
                                    placeholder="https://www.example.com"
                                    id="publisher-website_name"
                                    {...register('website_name')}
                                />
                                <InputError
                                    message={errors.website_name?.message}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="publisher-industry">
                                    {__('Industry')}
                                </Label>
                                <Input
                                    placeholder="Finance, E-commerce, etc"
                                    id="publisher-industry"
                                    {...register('industry')}
                                />
                                <InputError
                                    message={errors.industry?.message}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="publisher-coc_number">
                                    {__('Chamber Of Commerse Number')}
                                </Label>
                                <Input
                                    placeholder="e.g. SB1234567"
                                    id="publisher-coc_number"
                                    {...register('coc_number')}
                                />
                                <InputError
                                    message={errors.coc_number?.message}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                variant="outline"
                                disabled
                                className="w-full"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {__('Back')}
                            </Button>

                            <Button
                                className="w-full"
                                type="button"
                                onClick={handleNext}
                            >
                                {__('Next')}
                            </Button>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">
                                {__('Personal Information')}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {__(
                                    'Enter personal details to complete your account.',
                                )}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="publisher-first_name">
                                        {__('First Name')}
                                    </Label>
                                    <Input
                                        placeholder="John"
                                        id="publisher-first_name"
                                        {...register('first_name')}
                                    />
                                    <InputError
                                        message={errors.first_name?.message}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="publisher-last_name">
                                        {__('Last Name')}
                                    </Label>
                                    <Input
                                        placeholder="Doe"
                                        id="publisher-last_name"
                                        {...register('last_name')}
                                    />
                                    <InputError
                                        message={errors.last_name?.message}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="publisher-email">
                                    {__('Email Address')}
                                </Label>
                                <Input
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    id="publisher-email"
                                    {...register('email')}
                                />
                                <InputError message={errors.email?.message} />
                            </div>

                            <p className="text-sm text-muted-foreground">
                                {__(
                                    'Your login credentials will be sent to your email after registration.',
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleBack}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {__('Back')}
                            </Button>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {__('Submit')}
                            </Button>
                        </div>
                    </div>
                )}
                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <TextLink href={login()} tabIndex={12}>
                        {__('Log in')}
                    </TextLink>
                </div>
            </form>
        </div>
    );
};

export default PublisherTabsRegister;
