import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/two-factor/login';
import { Form, Head } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function TwoFactorChallenge() {
    const { t } = useTranslation();
    const [recovery, setRecovery] = useState(false);
    const [code, setCode] = useState('');

    const content = recovery
        ? {
              title: t('Use a recovery code'),
              description: t(
                  'Please confirm access to your account by entering one of your emergency recovery codes.',
              ),
              toggle: t('Use an authentication code instead'),
          }
        : {
              title: t('Two-step verification'),
              description: t(
                  'Enter the 6-digit code from your authenticator app.',
              ),
              toggle: t('Use a recovery code instead'),
          };

    return (
        <AuthLayout title={content.title} description={content.description}>
            <Head title={t('Two-Factor Authentication')} />

            <Form
                {...store.form()}
                className="flex flex-col gap-[18px]"
                resetOnError
                resetOnSuccess={!recovery}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {recovery ? (
                            <div className="grid gap-1.5">
                                <Label htmlFor="recovery_code">
                                    {t('Recovery code')}
                                </Label>
                                <InputGroup
                                    leading={
                                        <KeyRound
                                            className="text-admin"
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    <Input
                                        id="recovery_code"
                                        name="recovery_code"
                                        type="text"
                                        autoComplete="one-time-code"
                                        autoFocus
                                        required
                                        className="font-mono"
                                        aria-invalid={
                                            errors.recovery_code
                                                ? true
                                                : undefined
                                        }
                                    />
                                </InputGroup>
                                <InputError message={errors.recovery_code} />
                            </div>
                        ) : (
                            <div className="grid gap-1.5">
                                <Label htmlFor="code">
                                    {t('Authentication code')}
                                </Label>
                                <InputOTP
                                    id="code"
                                    name="code"
                                    maxLength={OTP_MAX_LENGTH}
                                    value={code}
                                    onChange={setCode}
                                    disabled={processing}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    autoFocus
                                    containerClassName="justify-between sm:justify-start"
                                    aria-invalid={
                                        errors.code ? true : undefined
                                    }
                                >
                                    <InputOTPGroup>
                                        {Array.from(
                                            { length: OTP_MAX_LENGTH },
                                            (_, index) => (
                                                <InputOTPSlot
                                                    key={index}
                                                    index={index}
                                                />
                                            ),
                                        )}
                                    </InputOTPGroup>
                                </InputOTP>
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            {t('Continue')}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="self-center"
                            onClick={() => {
                                setRecovery((value) => !value);
                                clearErrors();
                                setCode('');
                            }}
                        >
                            {content.toggle}
                        </Button>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
