import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { PublisherEarning, PublisherPayoutRequest } from '@/types';
import { formatCurrency } from '@/utils/utils';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function InvoiceCreate() {
    const { t } = useTranslation();
    const { canRequest, earnings, payoutMethod } = usePage<{
        canRequest: PublisherPayoutRequest;
        earnings: PublisherEarning[];
        payoutMethod: string | null;
    }>().props;
    const first =
        canRequest.groups.find((group) => group.can_request) ??
        canRequest.groups[0];
    const form = useForm({
        currency: first?.currency ?? '',
        network_id: first?.network_id ?? 0,
    });
    const group = canRequest.groups.find(
        (item) =>
            item.currency === form.data.currency &&
            item.network_id === form.data.network_id,
    );
    const selected = earnings.filter(
        (earning) =>
            earning.currency === form.data.currency &&
            earning.network_id === form.data.network_id,
    );
    return (
        <AppLayout>
            <Head title={t('Request Payout')} />
            <div className="workspace-page flex flex-col gap-6">
                <ReusablePageTitle
                    title={t('Request Payout')}
                    description={t(
                        'Invoice reviewed earnings in one currency from one liable network.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Invoices'),
                            href: publisher.invoices.url(),
                        },
                    ]}
                />
                {!first ? (
                    <p className="text-muted-foreground">
                        {t(
                            'No approved earnings are available. Pending earnings require financial review.',
                        )}
                    </p>
                ) : (
                    <form
                        className="space-y-6 rounded-xl border bg-card p-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(publisher.invoices.store.url());
                        }}
                    >
                        <div className="max-w-lg space-y-2">
                            <Label htmlFor="payout-group">
                                {t('Currency and liable network')}
                            </Label>
                            <select
                                id="payout-group"
                                className="w-full rounded-md border bg-background p-3"
                                value={`${form.data.network_id}:${form.data.currency}`}
                                onChange={(event) => {
                                    const [network, currency] =
                                        event.target.value.split(':');
                                    form.setData({
                                        network_id: Number(network),
                                        currency,
                                    });
                                }}
                            >
                                {canRequest.groups.map((item) => (
                                    <option
                                        key={`${item.network_id}:${item.currency}`}
                                        value={`${item.network_id}:${item.currency}`}
                                    >
                                        {item.currency} · {t('Network')}{' '}
                                        {item.network_id} ·{' '}
                                        {formatCurrency(
                                            Number(item.available_amount),
                                            item.currency,
                                        )}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {group && (
                            <div className="space-y-2">
                                <p>
                                    {t('Available after refund recoveries')}:{' '}
                                    <strong className="tabular-nums">
                                        {formatCurrency(
                                            Number(group.available_amount),
                                            group.currency,
                                        )}
                                    </strong>
                                </p>
                                <p>
                                    {t('Minimum payout')}:{' '}
                                    {formatCurrency(
                                        Number(group.threshold),
                                        group.currency,
                                    )}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            {t(
                                'All approved earnings for the selected currency and network are included. Outstanding refund recoveries are deducted.',
                            )}
                        </p>
                        {payoutMethod && (
                            <p>
                                {t('Payout method')}: {payoutMethod}
                            </p>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="py-2">
                                            {t('Campaign')}
                                        </th>
                                        <th>{t('Type')}</th>
                                        <th className="text-right">
                                            {t('Net commission')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selected.map((earning) => (
                                        <tr
                                            key={earning.id}
                                            className="border-b"
                                        >
                                            <td className="py-3">
                                                {earning.publisher_campaign
                                                    ?.campaign?.name ?? '—'}
                                            </td>
                                            <td>{earning.commission_type}</td>
                                            <td className="text-right tabular-nums">
                                                {formatCurrency(
                                                    Number(earning.amount) -
                                                        earning.reversed_minor /
                                                            100,
                                                    earning.currency!,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {Object.entries(form.errors).map(([key, error]) => (
                            <p
                                role="alert"
                                key={key}
                                className="text-destructive"
                            >
                                {error}
                            </p>
                        ))}
                        <Button
                            disabled={form.processing || !group?.can_request}
                            type="submit"
                        >
                            {form.processing
                                ? t('Creating…')
                                : t('Request Payout')}
                        </Button>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}
