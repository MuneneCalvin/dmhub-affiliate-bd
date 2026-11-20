import { router, useForm } from '@inertiajs/react';
import { ImagePlus, Loader2, Upload } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFilePreview } from '@/hooks/use-file-preview';
import advertiser from '@/routes/advertiser';

export type CreativeOfferOption = {
    id: number;
    name: string;
    campaign_id: number;
};

type CreativeUploadDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** A checked image from the drop zone; without it the dialog only picks an offer. */
    file: File | null;
    campaigns: { id: number; name: string }[];
    offers: CreativeOfferOption[];
    /** Campaign currently filtered in the library (preselects its first offer). */
    campaignId?: number | null;
};

type UploadData = {
    campaign_id: string;
    offer_id: string;
    name: string;
    type: 'banner' | 'email';
    asset: File | null;
    return_to: 'library';
};

function nameFromFile(file: File | null) {
    return file ? file.name.replace(/\.[^.]+$/, '').slice(0, 100) : '';
}

/**
 * Library upload: choose the offer the creative belongs to, name it and save
 * it through the normal store endpoint. Without a file it opens the full
 * editor for the chosen offer instead. Give it a new `key` for each opening
 * so the form starts from the dropped file.
 */
function CreativeUploadDialog({
    open,
    onOpenChange,
    file,
    campaigns,
    offers,
    campaignId,
}: CreativeUploadDialogProps) {
    const { t } = useTranslation();
    const fieldId = React.useId();
    const preview = useFilePreview(file);
    const firstOffer =
        offers.find((offer) => offer.campaign_id === campaignId) ?? offers[0];
    const form = useForm<UploadData>({
        campaign_id: firstOffer ? String(firstOffer.campaign_id) : '',
        offer_id: firstOffer ? String(firstOffer.id) : '',
        name: nameFromFile(file),
        type: 'banner',
        asset: file,
        return_to: 'library',
    });
    const { setData } = form;

    const grouped = campaigns
        .map((campaign) => ({
            campaign,
            offers: offers.filter((offer) => offer.campaign_id === campaign.id),
        }))
        .filter((group) => group.offers.length > 0);

    const chooseOffer = (value: string) => {
        const offer = offers.find((item) => String(item.id) === value);
        setData((current) => ({
            ...current,
            offer_id: value,
            campaign_id: offer ? String(offer.campaign_id) : '',
        }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.data.offer_id) {
            form.setError('offer_id', t('Select an offer from this campaign.'));
            return;
        }
        if (!file) {
            router.visit(
                advertiser.creatives.create.url({
                    query: { offer_id: form.data.offer_id, from: 'library' },
                }),
            );
            return;
        }
        if (!form.data.name.trim()) {
            form.setError('name', t('Enter a material name.'));
            return;
        }
        form.post(advertiser.creatives.store.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const errors = form.errors as Partial<Record<string, string>>;
    const assetError = errors.asset || errors.width || errors.height;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => !form.processing && onOpenChange(next)}
        >
            <DialogContent className="sm:max-w-[560px]">
                <form noValidate onSubmit={submit} className="grid gap-5">
                    <DialogHeader
                        icon={file ? <Upload /> : <ImagePlus />}
                        tone="brand"
                    >
                        <DialogTitle>
                            {file ? t('Upload creative') : t('New creative')}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Creatives belong to an offer, so publishers get the right tracking link.',
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {file && preview && (
                        <div className="flex items-center gap-4 rounded-[16px] bg-canvas p-3">
                            <img
                                src={preview}
                                alt=""
                                className="size-20 rounded-[12px] bg-surface object-contain"
                            />
                            <div className="min-w-0 text-sm">
                                <p className="truncate font-bold">
                                    {file.name}
                                </p>
                                <p className="text-ink-muted tabular-nums">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor={`${fieldId}-offer`}>{t('Offer')}</Label>
                        <Select
                            value={form.data.offer_id}
                            onValueChange={chooseOffer}
                        >
                            <SelectTrigger
                                id={`${fieldId}-offer`}
                                aria-invalid={Boolean(form.errors.offer_id)}
                            >
                                <SelectValue
                                    placeholder={t('Choose an offer')}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {grouped.map((group) => (
                                    <SelectGroup key={group.campaign.id}>
                                        <SelectLabel>
                                            {group.campaign.name}
                                        </SelectLabel>
                                        {group.offers.map((offer) => (
                                            <SelectItem
                                                key={offer.id}
                                                value={String(offer.id)}
                                            >
                                                {offer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError
                            message={
                                form.errors.offer_id || form.errors.campaign_id
                            }
                        />
                    </div>

                    {file && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`${fieldId}-name`}>
                                    {t('Material name')}
                                </Label>
                                <Input
                                    id={`${fieldId}-name`}
                                    value={form.data.name}
                                    maxLength={100}
                                    aria-invalid={Boolean(form.errors.name)}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <span className="text-[13px] font-bold">
                                    {t('Format')}
                                </span>
                                <SegmentedControl
                                    label={t('Format')}
                                    value={form.data.type}
                                    onValueChange={(value) =>
                                        setData('type', value)
                                    }
                                    options={[
                                        { value: 'banner', label: t('Banner') },
                                        { value: 'email', label: t('Email') },
                                    ]}
                                />
                            </div>
                            <InputError message={assetError} />
                        </>
                    )}

                    {form.progress && (
                        <p role="status" className="text-sm text-ink-muted">
                            {t('Uploading')}: {form.progress.percentage}%
                        </p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={form.processing}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && (
                                <Loader2 className="animate-spin" />
                            )}
                            {file
                                ? form.processing
                                    ? t('Saving…')
                                    : t('Upload creative')
                                : t('Continue')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export { CreativeUploadDialog };
