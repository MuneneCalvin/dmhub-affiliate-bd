import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import { FormField, SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Form, Head } from '@inertiajs/react';
import { LockKeyhole } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function Password() {
    const { t } = useTranslation();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout>
            <Head title={t('Password')} />
            <SettingsLayout>
                <Form
                    {...PasswordController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) passwordInput.current?.focus();
                        if (errors.current_password)
                            currentPasswordInput.current?.focus();
                    }}
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <SectionCard
                            title={t('Password')}
                            description={t(
                                'Use a long, random password to keep your account secure',
                            )}
                            icon={<LockKeyhole />}
                            tone="admin"
                            bodyClassName="grid gap-4 md:max-w-xl"
                            footer={
                                <>
                                    <p
                                        role="status"
                                        className="mr-auto text-[13px] font-semibold text-success-ink"
                                    >
                                        {recentlySuccessful
                                            ? t('Password updated')
                                            : ''}
                                    </p>
                                    <Button
                                        type="submit"
                                        className="ml-auto"
                                        disabled={processing}
                                        data-test="update-password-button"
                                    >
                                        {t('Save password')}
                                    </Button>
                                </>
                            }
                        >
                            <FormField
                                id="current_password"
                                label={t('Current password')}
                                error={errors.current_password}
                            >
                                <PasswordInput
                                    id="current_password"
                                    ref={currentPasswordInput}
                                    name="current_password"
                                    autoComplete="current-password"
                                />
                            </FormField>
                            <FormField
                                id="password"
                                label={t('New password')}
                                hint={t(
                                    'At least 8 characters. Mix letters, numbers and symbols.',
                                )}
                                error={errors.password}
                            >
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    name="password"
                                    autoComplete="new-password"
                                />
                            </FormField>
                            <FormField
                                id="password_confirmation"
                                label={t('Confirm password')}
                                error={errors.password_confirmation}
                            >
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                />
                            </FormField>
                        </SectionCard>
                    )}
                </Form>
            </SettingsLayout>
        </AppLayout>
    );
}
