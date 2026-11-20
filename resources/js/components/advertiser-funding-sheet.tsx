import { FormErrors, OptionCards } from '@/components/finance-form-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

type Advertiser = { id: number; business_name: string; currency: string };

export function FundingSheet({
    open,
    onOpenChange,
    advertisers,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    advertisers: Advertiser[];
}) {
    const { t } = useTranslation();
    const funding = useForm({
        advertiser_id: advertisers[0]?.id ?? 0,
        operation: 'deposit',
        amount: '',
        currency: advertisers[0]?.currency ?? '',
        reference: '',
        evidence: '',
    });

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 sm:max-w-lg">
                <form
                    className="flex h-full flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        funding.post(
                            `/finance/advertisers/${funding.data.advertiser_id}/funding`,
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    funding.reset(
                                        'amount',
                                        'reference',
                                        'evidence',
                                    );
                                    onOpenChange(false);
                                },
                            },
                        );
                    }}
                >
                    <SheetHeader className="border-b p-5">
                        <SheetTitle>
                            {t(
                                'Record advertiser funding or return unused funds',
                            )}
                        </SheetTitle>
                        <SheetDescription>
                            {t(
                                'Verify the transfer in your bank account before recording it.',
                            )}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 space-y-5 overflow-y-auto p-5">
                        <fieldset className="space-y-2">
                            <legend className="mb-2 text-sm font-medium">
                                {t('Operation')}
                            </legend>
                            <OptionCards
                                name="fund-operation"
                                value={funding.data.operation}
                                onChange={(value) =>
                                    funding.setData('operation', value)
                                }
                                options={[
                                    {
                                        value: 'deposit',
                                        label: t('Verified deposit'),
                                        description: t(
                                            'The network funding fee is deducted from the deposit.',
                                        ),
                                    },
                                    {
                                        value: 'refund',
                                        label: t('Return unused funds'),
                                        description: t(
                                            'Returning unused funds does not refund the funding fee.',
                                        ),
                                    },
                                ]}
                            />
                        </fieldset>
                        <div className="space-y-2">
                            <Label htmlFor="fund-advertiser">
                                {t('Advertiser')}
                            </Label>
                            <Select
                                value={String(funding.data.advertiser_id)}
                                onValueChange={(value) => {
                                    const advertiser = advertisers.find(
                                        (item) => item.id === Number(value),
                                    );
                                    if (advertiser)
                                        funding.setData({
                                            ...funding.data,
                                            advertiser_id: advertiser.id,
                                            currency: advertiser.currency,
                                        });
                                }}
                            >
                                <SelectTrigger
                                    id="fund-advertiser"
                                    className="w-full"
                                >
                                    <SelectValue
                                        placeholder={t('Select advertiser')}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {advertisers.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={String(item.id)}
                                        >
                                            {item.business_name} ·{' '}
                                            {item.currency}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="fund-amount">
                                    {t('Amount')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="fund-amount"
                                        required
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        className="pr-14 tabular-nums"
                                        pattern="[0-9]+(\.[0-9]{1,2})?"
                                        value={funding.data.amount}
                                        onChange={(e) =>
                                            funding.setData(
                                                'amount',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                        {funding.data.currency}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fund-reference">
                                    {t('Bank reference')}
                                </Label>
                                <Input
                                    id="fund-reference"
                                    required
                                    maxLength={120}
                                    value={funding.data.reference}
                                    onChange={(e) =>
                                        funding.setData(
                                            'reference',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fund-evidence">
                                {t('Receipt or reconciliation note')}
                            </Label>
                            <Textarea
                                id="fund-evidence"
                                required
                                rows={4}
                                maxLength={1000}
                                value={funding.data.evidence}
                                onChange={(e) =>
                                    funding.setData('evidence', e.target.value)
                                }
                            />
                        </div>
                        <FormErrors errors={funding.errors} />
                    </div>
                    <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            disabled={funding.processing || !advertisers.length}
                            type="submit"
                        >
                            {funding.processing
                                ? t('Recording…')
                                : t('Record funding')}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
