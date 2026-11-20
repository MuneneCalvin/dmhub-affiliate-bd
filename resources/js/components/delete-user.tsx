import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { FormField, IconTile } from '@/components/app';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { Form } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Danger zone card: closing the account ends access but keeps financial and
 * attribution records, so the copy says "close", not "delete". The dialog asks
 * for the current password.
 */
export default function DeleteUser() {
    const { t } = useTranslation();
    const titleId = useId();
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <section
            aria-labelledby={titleId}
            className="flex flex-wrap items-center gap-4 rounded-card border border-danger-dot/30 bg-danger-soft/40 p-[22px]"
        >
            <IconTile size={40} tone="danger">
                <Trash2 />
            </IconTile>
            <div className="min-w-[220px] flex-1">
                <h2
                    id={titleId}
                    className="text-base font-bold text-danger-ink"
                >
                    {t('Close account')}
                </h2>
                <p className="text-[13px] text-ink-muted">
                    {t(
                        'Ends your access for good. Financial and attribution records are kept for settlement.',
                    )}
                </p>
            </div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="destructive"
                        data-test="delete-user-button"
                    >
                        {t('Close account')}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <Form
                        {...ProfileController.destroy.form()}
                        options={{ preserveScroll: true }}
                        onError={() => passwordInput.current?.focus()}
                        resetOnSuccess
                        className="flex flex-col gap-5"
                    >
                        {({ resetAndClearErrors, processing, errors }) => (
                            <>
                                <DialogHeader icon={<Trash2 />} tone="danger">
                                    <DialogTitle>
                                        {t(
                                            'Are you sure you want to close your account?',
                                        )}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            'Closing your account ends access and disables tracking and postback credentials. Financial and attribution records, including outstanding balances, are retained for settlement. Enter your password to confirm permanent closure.',
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <FormField
                                    id="delete-account-password"
                                    label={t('Password')}
                                    error={errors.password}
                                >
                                    <PasswordInput
                                        id="delete-account-password"
                                        name="password"
                                        ref={passwordInput}
                                        autoComplete="current-password"
                                    />
                                </FormField>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() =>
                                                resetAndClearErrors()
                                            }
                                        >
                                            {t('Cancel')}
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={processing}
                                        data-test="confirm-delete-user-button"
                                    >
                                        {t('Close account')}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
