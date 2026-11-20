import { CopyField } from '@/components/app';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { confirm } from '@/routes/two-factor';
import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { ScanLine } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AlertError from './alert-error';
import { Spinner } from './ui/spinner';

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
}) {
    const { t } = useTranslation();
    if (errors?.length) return <AlertError errors={errors} />;
    return (
        <>
            {/* QR codes need a light background in both themes to scan. */}
            <div
                role="img"
                aria-label={t('QR code for your authenticator app')}
                className="mx-auto flex aspect-square w-56 items-center justify-center rounded-2xl border border-border bg-white p-4"
            >
                {qrCodeSvg ? (
                    <div
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                ) : (
                    <Spinner />
                )}
            </div>
            {manualSetupKey ? (
                <CopyField
                    label={t('Setup key')}
                    value={manualSetupKey}
                    copiedMessage={t('Setup key copied')}
                />
            ) : (
                <div className="flex h-11 items-center justify-center rounded-xl bg-surface-muted">
                    <Spinner />
                </div>
            )}
            <DialogFooter>
                <Button type="button" onClick={onNextStep}>
                    {buttonText}
                </Button>
            </DialogFooter>
        </>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const { t } = useTranslation();
    const [code, setCode] = useState<string>('');
    const pinInputContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeout(() => {
            pinInputContainerRef.current?.querySelector('input')?.focus();
        }, 0);
    }, []);

    return (
        <Form
            {...confirm.form()}
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
            className="flex flex-col gap-5"
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => (
                <>
                    <div
                        ref={pinInputContainerRef}
                        className="flex flex-col items-center gap-3 py-2"
                    >
                        <InputOTP
                            id="otp"
                            name="code"
                            aria-label={t('Authentication code')}
                            maxLength={OTP_MAX_LENGTH}
                            onChange={setCode}
                            disabled={processing}
                            pattern={REGEXP_ONLY_DIGITS}
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
                        <InputError
                            message={
                                errors?.confirmTwoFactorAuthentication?.code
                            }
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onBack}
                            disabled={processing}
                        >
                            {t('Back')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                processing || code.length < OTP_MAX_LENGTH
                            }
                        >
                            {t('Confirm')}
                        </Button>
                    </DialogFooter>
                </>
            )}
        </Form>
    );
}

interface TwoFactorSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
}

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: TwoFactorSetupModalProps) {
    const { t } = useTranslation();
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
        buttonText: string;
    }>(() => {
        if (twoFactorEnabled) {
            return {
                title: t('Two-factor authentication enabled'),
                description: t(
                    'Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app.',
                ),
                buttonText: t('Close'),
            };
        }
        if (showVerificationStep) {
            return {
                title: t('Verify authentication code'),
                description: t(
                    'Enter the 6-digit code from your authenticator app',
                ),
                buttonText: t('Continue'),
            };
        }
        return {
            title: t('Enable two-factor authentication'),
            description: t(
                'To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app',
            ),
            buttonText: t('Continue'),
        };
    }, [t, twoFactorEnabled, showVerificationStep]);

    const handleModalNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);
            return;
        }
        clearSetupData();
        onClose();
    }, [requiresConfirmation, clearSetupData, onClose]);

    const resetModalState = useCallback(() => {
        setShowVerificationStep(false);
        if (twoFactorEnabled) clearSetupData();
    }, [twoFactorEnabled, clearSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) fetchSetupData();
    }, [isOpen, qrCodeSvg, fetchSetupData]);

    const handleClose = useCallback(() => {
        resetModalState();
        onClose();
    }, [onClose, resetModalState]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="flex flex-col gap-5 sm:max-w-md">
                <DialogHeader icon={<ScanLine />} tone="success">
                    <DialogTitle>{modalConfig.title}</DialogTitle>
                    <DialogDescription>
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>
                {showVerificationStep ? (
                    <TwoFactorVerificationStep
                        onClose={onClose}
                        onBack={() => setShowVerificationStep(false)}
                    />
                ) : (
                    <TwoFactorSetupStep
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        buttonText={modalConfig.buttonText}
                        onNextStep={handleModalNextStep}
                        errors={errors}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
