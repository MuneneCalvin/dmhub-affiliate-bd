import { FormErrors } from '@/components/finance-form-controls';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AdvertiserWorkspaceProps } from '@/types/advertiser-workspace';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function AdvertiserSettings({
    advertiser: a,
    workspace,
    networks,
    currencies,
}: AdvertiserWorkspaceProps) {
    const { t } = useTranslation();
    const { permissions: can, funded } = workspace;
    const form = useForm({
        business_name: a.business_name,
        website_name: a.website_name ?? '',
        industry: a.industry,
        coc_number: a.coc_number ?? '',
        currency_code: a.advertiser_currency,
        total_budget: a.total_budget,
        network_id: a.network_id,
    });
    const status = useForm({});
    const credit = useForm({ credit_limit: a.credit_limit ?? '0.00' });
    const [confirm, setConfirm] = useState(false);
    const active = a.advertiser_status === 'A';
    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            {can.edit && (
                <section className="campaign-panel p-5">
                    <h2 className="text-lg font-semibold">
                        {t('Business settings')}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                        {t('Update the business details for this advertiser.')}
                    </p>
                    <form
                        className="mt-5 space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(
                                `/advertisers/update/${a.advertiser_id}`,
                                { preserveScroll: true },
                            );
                        }}
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            {(
                                [
                                    'business_name',
                                    'coc_number',
                                    'website_name',
                                    'industry',
                                ] as const
                            ).map((field) => (
                                <div className="space-y-2" key={field}>
                                    <Label htmlFor={`advertiser-${field}`}>
                                        {t(
                                            {
                                                business_name: 'Business Name',
                                                coc_number:
                                                    'Chamber of Commerce number',
                                                website_name: 'Website URL',
                                                industry: 'Industry',
                                            }[field],
                                        )}
                                    </Label>
                                    <Input
                                        id={`advertiser-${field}`}
                                        value={form.data[field]}
                                        required={
                                            field === 'business_name' ||
                                            field === 'industry'
                                        }
                                        maxLength={
                                            field === 'coc_number' ? 10 : 255
                                        }
                                        onChange={(event) =>
                                            form.setData(
                                                field,
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            ))}
                            <div className="space-y-2">
                                <Label htmlFor="advertiser-currency">
                                    {t('Currency')}
                                </Label>
                                <Select
                                    disabled={funded}
                                    value={form.data.currency_code ?? ''}
                                    onValueChange={(value) =>
                                        form.setData('currency_code', value)
                                    }
                                >
                                    <SelectTrigger
                                        id="advertiser-currency"
                                        className="h-10 w-full rounded-md border bg-surface px-3"
                                    >
                                        <SelectValue
                                            placeholder={t('Select currency')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem
                                                value={currency.currency_code}
                                                key={currency.currency_code}
                                            >
                                                {currency.currency_code} ·{' '}
                                                {currency.currency_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {can.changeNetwork && (
                                <div className="space-y-2">
                                    <Label htmlFor="advertiser-network">
                                        {t('Network')}
                                    </Label>
                                    <Select
                                        disabled={funded}
                                        value={
                                            String(
                                                form.data.network_id ?? '',
                                            ) || '__none__'
                                        }
                                        onValueChange={(value) =>
                                            form.setData(
                                                'network_id',
                                                value === '__none__'
                                                    ? null
                                                    : Number(value),
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="advertiser-network"
                                            className="h-10 w-full rounded-md border bg-surface px-3"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                {t('No network assigned')}
                                            </SelectItem>
                                            {a.network_id &&
                                                !networks.some(
                                                    (network) =>
                                                        network.id ===
                                                        a.network_id,
                                                ) && (
                                                    <SelectItem
                                                        value={String(
                                                            a.network_id,
                                                        )}
                                                    >
                                                        {a.network_name}
                                                    </SelectItem>
                                                )}
                                            {networks.map((network) => (
                                                <SelectItem
                                                    value={String(network.id)}
                                                    key={network.id}
                                                >
                                                    {network.network_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="advertiser-budget">
                                    {t('Total Budget')}
                                </Label>
                                <Input
                                    id="advertiser-budget"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={form.data.total_budget ?? ''}
                                    onChange={(event) =>
                                        form.setData(
                                            'total_budget',
                                            event.target.value,
                                        )
                                    }
                                />
                                <p className="text-xs text-ink-muted">
                                    {t('Changing a budget does not add funds.')}
                                </p>
                            </div>
                        </div>
                        {funded && (
                            <p className="text-sm text-ink-muted">
                                {t(
                                    'Currency and network cannot change after financial activity. Use a separate account.',
                                )}
                            </p>
                        )}
                        <FormErrors errors={form.errors} />
                        <Button type="submit" disabled={form.processing}>
                            {t(form.processing ? 'Saving…' : 'Save changes')}
                        </Button>
                    </form>
                </section>
            )}
            {can.edit && (
                <section className="campaign-panel p-5">
                    <h2 className="text-lg font-semibold">
                        {t('Advertiser credit limit')}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                        {t(
                            'Required maximum unpaid commissions across this advertiser’s campaigns. Zero prevents borrowing; assign a positive limit to run without prepaid funds. Deposits and reversals restore credit. Network prepayment requirements take precedence.',
                        )}
                    </p>
                    <form
                        className="mt-5 space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            credit.patch(
                                `/advertisers/show/${a.user_id}/cards/credit`,
                                { preserveScroll: true },
                            );
                        }}
                    >
                        <Label htmlFor="advertiser-credit-limit">
                            {t('Credit limit')} ({a.advertiser_currency})
                        </Label>
                        <Input
                            id="advertiser-credit-limit"
                            required
                            type="number"
                            min="0"
                            max="999999999.99"
                            step="0.01"
                            value={credit.data.credit_limit}
                            onChange={(event) =>
                                credit.setData(
                                    'credit_limit',
                                    event.target.value,
                                )
                            }
                        />
                        <FormErrors errors={credit.errors} />
                        <Button type="submit" disabled={credit.processing}>
                            {t('Save changes')}
                        </Button>
                    </form>
                </section>
            )}
            <section className="campaign-panel p-5">
                <h2 className="text-lg font-semibold">{t('Account status')}</h2>
                <p className="mt-2 text-sm text-ink-muted">
                    {t(
                        'Status changes also apply to the advertiser’s login account.',
                    )}
                </p>
                <p className="my-4 font-medium">
                    {t(active ? 'Active' : 'Inactive')}
                </p>
                {(active ? can.deactivate : can.activate) && (
                    <Button
                        variant={active ? 'destructive' : 'default'}
                        onClick={() => setConfirm(true)}
                    >
                        {t(
                            active
                                ? 'Deactivate advertiser'
                                : 'Activate advertiser',
                        )}
                    </Button>
                )}
                <FormErrors errors={status.errors} />
            </section>
            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t(
                                active
                                    ? 'Deactivate advertiser'
                                    : 'Activate advertiser',
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Status changes also apply to the advertiser’s login account.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirm(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            disabled={status.processing}
                            variant={active ? 'destructive' : 'default'}
                            onClick={() =>
                                status.post(
                                    `/advertisers/${active ? 'deactivate' : 'activate'}/${a.advertiser_id}`,
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setConfirm(false),
                                    },
                                )
                            }
                        >
                            {t('Confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
