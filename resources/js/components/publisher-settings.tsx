import { FormErrors } from '@/components/finance-form-controls';
import { Panel } from '@/components/partner-workspace-ui';
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
import type { PublisherWorkspaceProps } from '@/types/publisher-workspace';
import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PublisherSettings({
    publisher: p,
    workspace: w,
    networks,
    currencies,
}: PublisherWorkspaceProps) {
    const { t } = useTranslation();
    const can = w.permissions;
    const form = useForm({
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        title: p.title ?? '',
        website_url: p.website_url ?? '',
        coc_number: p.coc_number ?? '',
        currency: p.currency ?? '',
        network_id: p.network_id ?? '',
        payout_threshold: p.payout_threshold ?? '0.00',
    });
    const status = useForm({});
    const [confirm, setConfirm] = useState(false);
    const active = p.status === 'A' && p.is_verified;
    if (can.owner)
        return (
            <Panel title={t('Personal settings')}>
                <p className="mb-5 text-ink-muted">
                    {t(
                        'Manage your profile and sign-in security through account settings.',
                    )}
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/settings/profile">
                            {t('Edit profile')}
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/settings/password">
                            {t('Change password')}
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/settings/two-factor">
                            {t('Two-factor authentication')}
                        </Link>
                    </Button>
                </div>
            </Panel>
        );
    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
            {can.edit && (
                <Panel title={t('Publisher settings')}>
                    <p className="mb-5 text-ink-muted">
                        {t(
                            'Update contact details, website and payout preferences.',
                        )}
                    </p>
                    <form
                        className="space-y-5"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!form.data.currency) {
                                form.setError('currency', t('Select currency'));
                                document
                                    .getElementById('publisher-currency')
                                    ?.focus();
                                return;
                            }
                            if (can.changeNetwork && !form.data.network_id) {
                                form.setError(
                                    'network_id',
                                    t('Select network'),
                                );
                                document
                                    .getElementById('publisher-network')
                                    ?.focus();
                                return;
                            }
                            form.post(`/publishers/update/${p.user_id}`, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            {(
                                [
                                    'first_name',
                                    'last_name',
                                    'email',
                                    'title',
                                    'website_url',
                                    'coc_number',
                                ] as const
                            ).map((field) => (
                                <div className="space-y-2" key={field}>
                                    <Label htmlFor={`publisher-${field}`}>
                                        {t(
                                            {
                                                first_name: 'First name',
                                                last_name: 'Last name',
                                                email: 'Email',
                                                title: 'Title',
                                                website_url: 'Website URL',
                                                coc_number:
                                                    'Chamber of Commerce number',
                                            }[field],
                                        )}
                                    </Label>
                                    <Input
                                        id={`publisher-${field}`}
                                        value={form.data[field]}
                                        type={
                                            field === 'email'
                                                ? 'email'
                                                : field === 'website_url'
                                                  ? 'url'
                                                  : 'text'
                                        }
                                        required={[
                                            'first_name',
                                            'last_name',
                                            'email',
                                        ].includes(field)}
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
                                <Label htmlFor="publisher-currency">
                                    {t('Preferred currency')}
                                </Label>
                                <Select
                                    required
                                    value={form.data.currency}
                                    onValueChange={(value) => {
                                        form.setData('currency', value);
                                        form.clearErrors('currency');
                                    }}
                                >
                                    <SelectTrigger
                                        id="publisher-currency"
                                        aria-invalid={!!form.errors.currency}
                                        className="h-10 w-full rounded-md border bg-surface px-3"
                                    >
                                        <SelectValue
                                            placeholder={t('Select currency')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem
                                                key={currency.currency_code}
                                                value={currency.currency_code}
                                            >
                                                {currency.currency_code} ·{' '}
                                                {currency.currency_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="publisher-threshold">
                                    {t('Payout threshold')}
                                </Label>
                                <Input
                                    id="publisher-threshold"
                                    type="number"
                                    required
                                    min="0"
                                    max="999999999"
                                    step="0.01"
                                    value={form.data.payout_threshold}
                                    onChange={(event) =>
                                        form.setData(
                                            'payout_threshold',
                                            event.target.value,
                                        )
                                    }
                                />
                            </div>
                            {can.changeNetwork && (
                                <div className="space-y-2">
                                    <Label htmlFor="publisher-network">
                                        {t('Network')}
                                    </Label>
                                    <Select
                                        required
                                        value={String(form.data.network_id)}
                                        onValueChange={(value) => {
                                            form.setData(
                                                'network_id',
                                                Number(value),
                                            );
                                            form.clearErrors('network_id');
                                        }}
                                    >
                                        <SelectTrigger
                                            id="publisher-network"
                                            aria-invalid={
                                                !!form.errors.network_id
                                            }
                                            className="h-10 w-full rounded-md border bg-surface px-3"
                                        >
                                            <SelectValue
                                                placeholder={t(
                                                    'Select network',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {p.network_id &&
                                                !networks.some(
                                                    (network) =>
                                                        network.id ===
                                                        p.network_id,
                                                ) && (
                                                    <SelectItem
                                                        value={String(
                                                            p.network_id,
                                                        )}
                                                    >
                                                        {p.network_name}
                                                    </SelectItem>
                                                )}
                                            {networks.map((network) => (
                                                <SelectItem
                                                    key={network.id}
                                                    value={String(network.id)}
                                                >
                                                    {network.network_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-ink-muted">
                            {t(
                                'Currency preferences do not convert existing earnings. Payout eligibility is checked separately for each network and currency.',
                            )}
                        </p>
                        <FormErrors errors={form.errors} />
                        <Button disabled={form.processing} type="submit">
                            {t(form.processing ? 'Saving…' : 'Save changes')}
                        </Button>
                    </form>
                </Panel>
            )}
            <Panel title={t('Account status')}>
                <p className="mb-4 text-ink-muted">
                    {t(
                        'Status changes also apply to the publisher’s login account.',
                    )}
                </p>
                <p className="mb-4 font-medium">
                    {t(active ? 'Active' : 'Inactive')}
                </p>
                {(active ? can.deactivate : can.activate) && (
                    <Button
                        variant={active ? 'destructive' : 'default'}
                        onClick={() => setConfirm(true)}
                    >
                        {t(
                            active
                                ? 'Deactivate publisher'
                                : 'Activate publisher',
                        )}
                    </Button>
                )}
                <FormErrors errors={status.errors} />
            </Panel>
            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {t(
                                active
                                    ? 'Deactivate publisher'
                                    : 'Activate publisher',
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Status changes also apply to the publisher’s login account.',
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
                                    `/publishers/${active ? 'deactivate' : 'activate'}/${p.publisher_id}`,
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
