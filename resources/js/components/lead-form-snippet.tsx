import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { CopyField } from '@/components/app/copy-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import advertiser from '@/routes/advertiser';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type LeadFormSettings = {
    key: string;
    snippet: string;
    destinationHost: string | null;
    allowedOrigins: string[];
};

const ORIGIN = /^https?:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?\/?$/i;

/** Embed code for a form built elsewhere, plus which pages may report submissions for this offer. */
export function LeadFormSnippet({
    offerId,
    leadForm,
}: {
    offerId: number;
    leadForm: LeadFormSettings;
}) {
    const { t } = useTranslation();
    const [origins, setOrigins] = useState(leadForm.allowedOrigins);
    const [draft, setDraft] = useState('');
    const [invalid, setInvalid] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const url = advertiser.offers.leadForm.update.url(offerId);

    function addOrigin() {
        const origin = draft.trim().replace(/\/$/, '').toLowerCase();
        if (!ORIGIN.test(origin)) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        setDraft('');
        setOrigins((current) =>
            current.includes(origin) ? current : [...current, origin],
        );
    }

    return (
        <div className="space-y-4 rounded-xl border bg-surface p-5 sm:p-6">
            <div>
                <h2 className="text-lg font-semibold">
                    {t('Lead form embed')}
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                    {t(
                        'Paste this on the page that holds your form. It reports each consent-confirmed submission so the visitor counts as a lead for the publisher who sent them. The form itself is never changed or delayed.',
                    )}
                </p>
            </div>
            <CopyField
                label={t('Embed code')}
                value={leadForm.snippet}
                multiline
                variant="code"
            />
            <p className="text-sm text-ink-muted">
                {t(
                    'Mark the form with data-bnd-form if the page has more than one, and the consent checkbox with data-bnd-consent.',
                )}
            </p>
            <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                    {t('Pages allowed to report')}
                </h3>
                <p className="text-sm text-ink-muted">
                    {t(
                        'Submissions are accepted from the landing page host below and from any extra origin you add.',
                    )}
                </p>
                <ul className="space-y-1.5 text-sm">
                    {leadForm.destinationHost && (
                        <li className="font-medium">
                            {leadForm.destinationHost}
                        </li>
                    )}
                    {origins.map((origin) => (
                        <li
                            key={origin}
                            className="flex items-center justify-between gap-2"
                        >
                            <span className="break-all">{origin}</span>
                            <Button
                                type="button"
                                variant="soft"
                                size="sm"
                                aria-label={`${t('Remove')} ${origin}`}
                                onClick={() =>
                                    setOrigins((current) =>
                                        current.filter((o) => o !== origin),
                                    )
                                }
                            >
                                <X />
                            </Button>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <Label htmlFor="lead-form-origin">
                            {t('Extra allowed origin')}
                        </Label>
                        <Input
                            id="lead-form-origin"
                            value={draft}
                            placeholder="https://forms.example"
                            aria-invalid={invalid || undefined}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                    <Button type="button" variant="soft" onClick={addOrigin}>
                        {t('Add origin')}
                    </Button>
                </div>
                {invalid && (
                    <p role="alert" className="text-sm text-danger-ink">
                        {t('Enter an origin like https://forms.example')}
                    </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                        type="button"
                        onClick={() =>
                            router.post(
                                url,
                                { allowed_origins: origins },
                                { preserveScroll: true },
                            )
                        }
                    >
                        {t('Save origins')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setConfirmRotate(true)}
                    >
                        {t('Rotate key')}
                    </Button>
                </div>
            </div>
            <ConfirmDialog
                open={confirmRotate}
                onOpenChange={setConfirmRotate}
                title={t('Rotate lead form key')}
                description={t(
                    'The current embed code stops working at once. Replace it on your form page with the new code.',
                )}
                confirmLabel={t('Rotate key')}
                cancelLabel={t('Cancel')}
                variant="destructive"
                onConfirm={() =>
                    router.post(url, { rotate: true }, { preserveScroll: true })
                }
            />
        </div>
    );
}
