import { IconTile } from '@/components/app';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable } from '@/routes/two-factor';
import { type TwoFactorProps } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: TwoFactorProps) {
    const { t } = useTranslation();
    const titleId = useId();
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showCodes, setShowCodes] = useState(false);

    useEffect(() => {
        if (twoFactorEnabled && !recoveryCodesList.length) {
            fetchRecoveryCodes();
        }
    }, [twoFactorEnabled, recoveryCodesList.length, fetchRecoveryCodes]);

    return (
        <AppLayout>
            <Head title={t('Two-factor authentication')} />
            <SettingsLayout>
                <section
                    aria-labelledby={titleId}
                    className="flex flex-wrap items-center gap-[18px] rounded-card border border-border bg-surface p-[22px] shadow-card"
                >
                    <IconTile
                        size={56}
                        tone={twoFactorEnabled ? 'success' : 'warning'}
                    >
                        {twoFactorEnabled ? <ShieldCheck /> : <ShieldAlert />}
                    </IconTile>
                    <div className="min-w-[220px] flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2 id={titleId} className="text-base font-bold">
                                {t('Two-factor authentication')}
                            </h2>
                            <StatusBadge
                                status={twoFactorEnabled ? 'active' : 'pending'}
                                label={
                                    twoFactorEnabled
                                        ? t('Enabled')
                                        : t('Disabled')
                                }
                            />
                        </div>
                        <p className="mt-1 text-[13px] text-ink-muted">
                            {twoFactorEnabled
                                ? recoveryCodesList.length
                                    ? t(
                                          'Codes come from your authenticator app. {{count}} recovery codes left.',
                                          { count: recoveryCodesList.length },
                                      )
                                    : t(
                                          'Codes come from your authenticator app.',
                                      )
                                : t(
                                      'Add a second step to sign in: a 6-digit code from an authenticator app on your phone.',
                                  )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        {twoFactorEnabled ? (
                            <>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    aria-expanded={showCodes}
                                    aria-controls="recovery-codes"
                                    onClick={() => setShowCodes((v) => !v)}
                                >
                                    {showCodes
                                        ? t('Hide recovery codes')
                                        : t('View recovery codes')}
                                </Button>
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant="soft"
                                            tone="danger"
                                            disabled={processing}
                                        >
                                            {t('Disable')}
                                        </Button>
                                    )}
                                </Form>
                            </>
                        ) : hasSetupData ? (
                            <Button
                                type="button"
                                onClick={() => setShowSetupModal(true)}
                            >
                                <ShieldCheck aria-hidden="true" />
                                {t('Continue setup')}
                            </Button>
                        ) : (
                            <Form
                                {...enable.form()}
                                onSuccess={() => setShowSetupModal(true)}
                            >
                                {({ processing }) => (
                                    <Button type="submit" disabled={processing}>
                                        <ShieldCheck aria-hidden="true" />
                                        {t('Enable two-factor')}
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                </section>

                {twoFactorEnabled && showCodes && (
                    <TwoFactorRecoveryCodes
                        id="recovery-codes"
                        recoveryCodesList={recoveryCodesList}
                        fetchRecoveryCodes={fetchRecoveryCodes}
                        errors={errors}
                    />
                )}

                <TwoFactorSetupModal
                    isOpen={showSetupModal}
                    onClose={() => setShowSetupModal(false)}
                    requiresConfirmation={requiresConfirmation}
                    twoFactorEnabled={twoFactorEnabled}
                    qrCodeSvg={qrCodeSvg}
                    manualSetupKey={manualSetupKey}
                    clearSetupData={clearSetupData}
                    fetchSetupData={fetchSetupData}
                    errors={errors}
                />
            </SettingsLayout>
        </AppLayout>
    );
}
