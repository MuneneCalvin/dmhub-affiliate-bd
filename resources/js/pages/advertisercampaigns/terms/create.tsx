import { Button } from '@/components/ui/button';
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import advertiser from '@/routes/advertiser';
import { TCampaignTermsTypes } from '@/types/schema_types';
import { campaignTermsSchema } from '@/utils/form-schema';
import { useForm } from '@inertiajs/react';
import { FileText, Loader2 } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

type DialogSwitch = (options: { state: boolean }) => void;

const CreateTerms = ({
    handleDialogContextSwitch,
}: {
    handleDialogContextSwitch?: DialogSwitch;
}) => {
    const { t } = useTranslation();
    const { data, setData, errors, setError, processing, post } =
        useForm<TCampaignTermsTypes>({ description: '' });
    const close = () => handleDialogContextSwitch?.({ state: false });
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const result = campaignTermsSchema.safeParse(data);
        if (!result.success) {
            result.error.issues.forEach((issue) => {
                if (issue.path?.length) {
                    setError(
                        issue.path[0] as keyof TCampaignTermsTypes,
                        t(issue.message),
                    );
                }
            });
            return;
        }
        post(advertiser.terms.create.url(), {
            preserveScroll: true,
            onSuccess: close,
        });
    };
    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <DialogHeader icon={<FileText />} tone="brand">
                <DialogTitle>{t('Create terms')}</DialogTitle>
                <DialogDescription>
                    {t(
                        'Write one rule publishers must follow, for example “No adult sites”.',
                    )}
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="terms-description">{t('Terms')}</Label>
                <Textarea
                    id="terms-description"
                    rows={4}
                    value={data.description}
                    onChange={(event) =>
                        setData('description', event.target.value)
                    }
                    aria-invalid={!!errors.description}
                    aria-describedby={
                        errors.description
                            ? 'terms-description-error'
                            : undefined
                    }
                    placeholder={t('e.g. No Adult sites')}
                />
                {errors.description && (
                    <p
                        id="terms-description-error"
                        className="text-[13px] font-semibold text-danger-ink"
                    >
                        {errors.description}
                    </p>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={close}>
                    {t('Cancel')}
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing && (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {t('Save terms')}
                </Button>
            </DialogFooter>
        </form>
    );
};

export default CreateTerms;
