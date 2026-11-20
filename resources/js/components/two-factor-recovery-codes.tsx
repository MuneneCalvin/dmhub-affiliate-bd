import { SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { regenerateRecoveryCodes } from '@/routes/two-factor';
import { Form } from '@inertiajs/react';
import { KeyRound, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AlertError from './alert-error';

interface TwoFactorRecoveryCodesProps {
    /** Element id, so a "View recovery codes" button can control it. */
    id?: string;
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
}

/** The user's one-time recovery codes, with a regenerate action. */
export default function TwoFactorRecoveryCodes({
    id = 'recovery-codes',
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: TwoFactorRecoveryCodesProps) {
    const { t } = useTranslation();

    return (
        <SectionCard
            id={id}
            title={t('Recovery codes')}
            description={t(
                'Each code works once if you lose your authenticator. Store them in a password manager.',
            )}
            icon={<KeyRound />}
            tone="success"
            action={
                <Form
                    {...regenerateRecoveryCodes.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={fetchRecoveryCodes}
                >
                    {({ processing }) => (
                        <Button
                            variant="secondary"
                            type="submit"
                            disabled={processing}
                        >
                            <RefreshCw aria-hidden="true" />
                            {t('Regenerate codes')}
                        </Button>
                    )}
                </Form>
            }
        >
            {errors?.length ? (
                <AlertError errors={errors} />
            ) : recoveryCodesList.length ? (
                <ul
                    aria-label={t('Recovery codes')}
                    className="grid gap-2 rounded-xl bg-surface-muted p-4 font-mono text-sm sm:grid-cols-2"
                >
                    {recoveryCodesList.map((code) => (
                        <li key={code} className="select-all">
                            {code}
                        </li>
                    ))}
                </ul>
            ) : (
                <div
                    role="status"
                    aria-label={t('Loading recovery codes')}
                    className="grid gap-2 rounded-xl bg-surface-muted p-4 sm:grid-cols-2"
                >
                    {Array.from({ length: 8 }, (_, index) => (
                        <span
                            key={index}
                            aria-hidden="true"
                            className="h-4 animate-pulse rounded bg-surface-tint"
                        />
                    ))}
                </div>
            )}
        </SectionCard>
    );
}
