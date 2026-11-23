import { IconTile, StepProgress } from '@/components/app';
import {
    ChannelPicker,
    type ChannelErrors,
    type ChannelValues,
} from '@/components/channel-picker';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { useAuthBrand } from '@/layouts/auth/auth-brand-panel';
import {
    PUBLISHER_CHANNELS,
    channelError,
    type ChannelType,
} from '@/lib/publisher-channels';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { type TPublisherOnboardingTypes } from '@/types/schema_types';
import { EREGISTER_TYPE } from '@/utils/enums';
import {
    advertiserSchema,
    publisherCompanySignupSchema,
    publisherIndividualSignupSchema,
} from '@/utils/form-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Building2, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type RegisterValues = TPublisherOnboardingTypes;
type Field = keyof RegisterValues;

const businessFields: Field[] = [
    'business_name',
    'website_name',
    'industry',
    'coc_number',
];
const TOTAL_STEPS = 3;

type PublisherType = 'company' | 'individual';
type RegisterContext = { role: EREGISTER_TYPE; publisherType: PublisherType };
const signupSchema = (context?: RegisterContext) =>
    // The three schemas differ only in which fields they demand; the form values are one shape.
    (context?.role === EREGISTER_TYPE.ADVERTISER
        ? advertiserSchema
        : context?.publisherType === 'individual'
          ? publisherIndividualSignupSchema
          : publisherCompanySignupSchema) as unknown as typeof advertiserSchema;

const resolver: Resolver<RegisterValues, RegisterContext> = (
    values,
    context,
    options,
) =>
    zodResolver(signupSchema(context))(values, context, options) as ReturnType<
        Resolver<RegisterValues, RegisterContext>
    >;

export default function Register() {
    // React Hook Form mutates formState.errors in place, so React Compiler
    // memoisation would hide new errors; opt this form out.
    'use no memo';
    const { t } = useTranslation();
    const { name } = useAuthBrand();
    const [role, setRole] = useState<EREGISTER_TYPE>(EREGISTER_TYPE.PUBLISHER);
    const [publisherType, setPublisherType] =
        useState<PublisherType>('company');
    const [channels, setChannels] = useState<ChannelValues>({});
    const [channelErrors, setChannelErrors] = useState<ChannelErrors>({});
    const submittedChannels = useRef<ChannelType[]>([]);
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const movedStep = useRef(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
        setError,
        clearErrors,
    } = useForm<RegisterValues, RegisterContext>({
        // Both roles collect the same fields; each keeps its own schema.
        resolver,
        context: { role, publisherType },
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

    useEffect(() => {
        if (movedStep.current) headingRef.current?.focus();
    }, [step]);

    const goTo = (next: number) => {
        movedStep.current = true;
        setStep(next);
    };

    const isAdvertiser = role === EREGISTER_TYPE.ADVERTISER;
    const steps = [
        {
            title: t('Account type'),
            hint: t("First, tell us how you'll use {{name}}.", { name }),
        },
        isAdvertiser
            ? {
                  title: t('Your company'),
                  hint: t('Tell us about the brand that runs the campaigns.'),
              }
            : {
                  title: t('Your channels'),
                  hint: t('Tell us who you are and where you promote offers.'),
              },
        {
            title: t('Your details'),
            hint: t(
                'Your login credentials will be sent to your email after registration.',
            ),
        },
    ];
    const current = steps[step - 1];

    const individual = !isAdvertiser && publisherType === 'individual';

    /** Every ticked channel needs a value that fits it, and at least one must be ticked. */
    const validateChannels = () => {
        const ticked = PUBLISHER_CHANNELS.filter((c) => c.value in channels);
        const next: ChannelErrors = {};
        if (ticked.length === 0) next.channels = 'Choose at least one channel';
        ticked.forEach((c) => {
            const message = channelError(c.value, channels[c.value] ?? '');
            if (message) next[c.value] = message;
        });
        setChannelErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleContinue = async () => {
        if (step === 1) return goTo(2);
        if (isAdvertiser) {
            if (await trigger(businessFields)) goTo(3);
            return;
        }
        const companyOk = individual
            ? true
            : await trigger(['business_name', 'industry', 'coc_number']);
        const channelsOk = validateChannels();
        if (companyOk && channelsOk) goTo(3);
    };

    const onSubmit = (data: RegisterValues) => {
        clearErrors();
        setSubmitting(true);
        const ticked = PUBLISHER_CHANNELS.filter((c) => c.value in channels);
        submittedChannels.current = ticked.map((c) => c.value);
        const payload = isAdvertiser
            ? { ...data, role_name: role }
            : {
                  first_name: data.first_name,
                  last_name: data.last_name,
                  email: data.email,
                  role_name: role,
                  publisher_type: publisherType,
                  ...(individual
                      ? {}
                      : {
                            business_name: data.business_name,
                            industry: data.industry,
                            coc_number: data.coc_number,
                        }),
                  channels: ticked.map((c) => ({
                      type: c.value,
                      handle: (channels[c.value] ?? '').trim(),
                  })),
              };
        router.post(store(), payload, {
            onSuccess: () => toast.success(t('Account created successfully')),
            onFinish: () => setSubmitting(false),
            onError: (serverErrors) => {
                const forChannels: ChannelErrors = {};
                Object.entries(serverErrors).forEach(([field, message]) => {
                    const channel = /^channels\.(\d+)\./.exec(field);
                    if (channel) {
                        const type =
                            submittedChannels.current[Number(channel[1])];
                        if (type)
                            forChannels[type] = forChannels[type] ?? message;
                    } else if (field === 'channels') {
                        forChannels.channels = message;
                    } else {
                        setError(field as Field, { type: 'server', message });
                    }
                });
                setChannelErrors(forChannels);
                const channelFailed = Object.keys(forChannels).length > 0;
                if (serverErrors.role_name) goTo(1);
                else if (
                    channelFailed ||
                    serverErrors.publisher_type ||
                    businessFields.some((f) => serverErrors[f])
                )
                    goTo(2);
                else goTo(3);
            },
        });
    };

    const field = (
        key: Field,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => {
        const id = `${role}-${key}`;
        const message = errors[key]?.message;
        return (
            <div className="grid gap-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                    id={id}
                    aria-invalid={message ? true : undefined}
                    aria-describedby={message ? `${id}-error` : undefined}
                    {...props}
                    {...register(key)}
                />
                <InputError
                    id={`${id}-error`}
                    message={message ? t(message) : undefined}
                />
            </div>
        );
    };

    return (
        <AuthLayout
            title={t('Create your account')}
            description={t('Join {{name}} as a publisher or an advertiser.', {
                name,
            })}
            width="wide"
        >
            <Head title={t('Register')} />

            <form
                className="flex flex-col gap-[22px]"
                onSubmit={(event) => {
                    if (step < TOTAL_STEPS) {
                        event.preventDefault();
                        void handleContinue();
                        return;
                    }
                    void handleSubmit(onSubmit)(event);
                }}
                noValidate
            >
                <StepProgress
                    current={step}
                    total={TOTAL_STEPS}
                    stepLabel={current.title}
                />

                <div className="flex flex-col gap-1">
                    <h2
                        ref={headingRef}
                        tabIndex={-1}
                        className="text-lg font-extrabold text-ink outline-none"
                    >
                        {current.title}
                    </h2>
                    <p className="text-[13px] text-ink-muted">{current.hint}</p>
                </div>

                {step === 1 && (
                    <RadioCardGroup
                        name="role"
                        label={t('Account type')}
                        value={role}
                        onValueChange={(value) =>
                            setRole(value as EREGISTER_TYPE)
                        }
                        className="gap-3.5"
                    >
                        <RadioCard
                            value={EREGISTER_TYPE.PUBLISHER}
                            tone="partners"
                            title={t('Publisher')}
                            hint={t(
                                'I promote offers on my site, app or channel and earn commission.',
                            )}
                            icon={
                                <IconTile
                                    size={48}
                                    tone="partners"
                                    variant="solid"
                                >
                                    <Users />
                                </IconTile>
                            }
                        />
                        <RadioCard
                            value={EREGISTER_TYPE.ADVERTISER}
                            tone="finance"
                            title={t('Advertiser')}
                            hint={t(
                                'I run campaigns and pay partners for the results they bring.',
                            )}
                            icon={
                                <IconTile
                                    size={48}
                                    tone="finance"
                                    variant="solid"
                                >
                                    <Building2 />
                                </IconTile>
                            }
                        />
                    </RadioCardGroup>
                )}

                {step === 2 && isAdvertiser && (
                    <div className="grid gap-[14px]">
                        {field('business_name', t('Company name'), {
                            autoComplete: 'organization',
                            placeholder: 'Advertiser LLC',
                        })}
                        {field('website_name', t('Website URL'), {
                            type: 'url',
                            autoComplete: 'url',
                            placeholder: 'https://www.example.com',
                        })}
                        {field('industry', t('Industry'), {
                            placeholder: t('Finance, e-commerce, travel…'),
                        })}
                        {field('coc_number', t('Chamber of Commerce number'), {
                            placeholder: 'SB1234567',
                        })}
                    </div>
                )}

                {step === 2 && !isAdvertiser && (
                    <div className="grid gap-[18px]">
                        <RadioCardGroup
                            name="publisher_type"
                            label={t('I register as')}
                            value={publisherType}
                            onValueChange={(value) =>
                                setPublisherType(value as PublisherType)
                            }
                            className="gap-3"
                        >
                            <RadioCard
                                value="company"
                                tone="partners"
                                title={t('Company')}
                                hint={t(
                                    'A business with a Chamber of Commerce number.',
                                )}
                            />
                            <RadioCard
                                value="individual"
                                tone="partners"
                                title={t('Individual')}
                                hint={t(
                                    'A creator or private person promoting on their own channels.',
                                )}
                            />
                        </RadioCardGroup>
                        {!individual && (
                            <div className="grid gap-[14px]">
                                {field('business_name', t('Business name'), {
                                    autoComplete: 'organization',
                                    placeholder: 'Publisher LLC',
                                })}
                                {field('industry', t('Industry'), {
                                    placeholder: t(
                                        'Finance, e-commerce, travel…',
                                    ),
                                })}
                                {field(
                                    'coc_number',
                                    t('Chamber of Commerce number'),
                                    {
                                        placeholder: 'SB1234567',
                                    },
                                )}
                            </div>
                        )}
                        <ChannelPicker
                            values={channels}
                            errors={channelErrors}
                            onChange={(next) => {
                                setChannels(next);
                                setChannelErrors({});
                            }}
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="grid gap-[14px] sm:grid-cols-2">
                        {field('first_name', t('First name'), {
                            autoComplete: 'given-name',
                        })}
                        {field('last_name', t('Last name'), {
                            autoComplete: 'family-name',
                        })}
                        <div className="sm:col-span-2">
                            {field('email', t('Work email'), {
                                type: 'email',
                                autoComplete: 'email',
                                placeholder: 'you@company.com',
                            })}
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    {step > 1 && (
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => goTo(step - 1)}
                        >
                            <ArrowLeft aria-hidden="true" />
                            {t('Back')}
                        </Button>
                    )}
                    {step < TOTAL_STEPS ? (
                        <Button type="submit" className="flex-1">
                            {t('Continue')}
                            <ArrowRight aria-hidden="true" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={submitting}
                        >
                            {submitting && <Spinner />}
                            {t('Create account')}
                        </Button>
                    )}
                </div>

                <p className="text-center text-ink-muted">
                    {t('Already have an account?')}{' '}
                    <TextLink href={login()}>{t('Sign in')}</TextLink>
                </p>
            </form>
        </AuthLayout>
    );
}
