import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Coins, FilePlus2, Info, ListChecks, ReceiptText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState, PageHeader, SectionCard } from '@/components/app';
import {
    lineAmount,
    useFormatMoney,
    type PayoutRequest,
} from '@/components/finance';
import { FormErrors } from '@/components/finance-form-controls';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import publisher from '@/routes/publisher';
import { type PublisherEarning } from '@/types';

const key = (group: { network_id: number; currency: string }) =>
    `${group.network_id}:${group.currency}`;

export default function InvoiceCreate() {
    const { t } = useTranslation();
    const money = useFormatMoney();
    const date = useDate();
    const { canRequest, earnings, payoutMethod } = usePage<{
        canRequest: PayoutRequest;
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

    // Live totals in cents, for the selected currency and network only.
    const grossCents = selected.reduce(
        (sum, earning) => sum + Math.round(lineAmount(earning) * 100),
        0,
    );
    const availableCents = Math.round(
        Number(group?.available_amount ?? 0) * 100,
    );
    const recoveryCents = Math.max(0, grossCents - availableCents);
    const currency = group?.currency ?? form.data.currency;

    const breadcrumbs = [
        { title: t('Invoices'), href: publisher.invoices.url() },
        { title: t('Request Payout'), href: publisher.invoices.create.url() },
    ];

    return (
        <AppLayout>
            <Head title={t('Request Payout')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Request Payout')}
                    description={t(
                        'Invoice reviewed earnings in one currency from one liable network.',
                    )}
                    breadcrumbs={breadcrumbs}
                    icon={<FilePlus2 />}
                    tone="finance"
                />
                {!first ? (
                    <section className="rounded-card border border-border bg-surface shadow-card">
                        <EmptyState
                            icon={<Coins />}
                            tone="finance"
                            title={t('Nothing to invoice yet')}
                            description={t(
                                'No approved earnings are available. Pending earnings require financial review.',
                            )}
                            action={
                                <Button variant="secondary" asChild>
                                    <Link href={publisher.earnings.url()}>
                                        {t('My earnings')}
                                    </Link>
                                </Button>
                            }
                        />
                    </section>
                ) : (
                    <form
                        className="flex flex-wrap items-start gap-[18px]"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(publisher.invoices.store.url());
                        }}
                    >
                        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-[18px]">
                            <SectionCard
                                title={t('Currency and liable network')}
                                description={t(
                                    'Each invoice covers one currency at one network.',
                                )}
                                icon={<Coins />}
                                tone="finance"
                            >
                                <RadioCardGroup
                                    name="payout-group"
                                    label={t('Currency and liable network')}
                                    value={key(form.data)}
                                    onValueChange={(value) => {
                                        const [network, code] =
                                            value.split(':');
                                        form.setData({
                                            network_id: Number(network),
                                            currency: code,
                                        });
                                    }}
                                >
                                    {canRequest.groups.map((item) => (
                                        <RadioCard
                                            key={key(item)}
                                            value={key(item)}
                                            tone="finance"
                                            title={`${item.currency} · ${
                                                item.network_name ??
                                                `${t('Network')} ${item.network_id}`
                                            }`}
                                            hint={
                                                item.can_request
                                                    ? t(
                                                          '{{amount}} available',
                                                          {
                                                              amount: money(
                                                                  item.available_amount,
                                                                  item.currency,
                                                              ),
                                                          },
                                                      )
                                                    : t(
                                                          '{{amount}} available · {{remaining}} below the minimum',
                                                          {
                                                              amount: money(
                                                                  item.available_amount,
                                                                  item.currency,
                                                              ),
                                                              remaining: money(
                                                                  item.remaining,
                                                                  item.currency,
                                                              ),
                                                          },
                                                      )
                                            }
                                        />
                                    ))}
                                </RadioCardGroup>
                            </SectionCard>

                            <SectionCard
                                title={t('Included Earnings')}
                                description={t(
                                    'All approved earnings for the selected currency and network are included. Outstanding refund recoveries are deducted.',
                                )}
                                icon={<ListChecks />}
                                tone="finance"
                                flush
                            >
                                <Table className="min-w-[560px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-[22px]">
                                                {t('Campaign')}
                                            </TableHead>
                                            <TableHead>{t('Type')}</TableHead>
                                            <TableHead>{t('Date')}</TableHead>
                                            <TableHead className="pr-[22px] text-right">
                                                {t('Net commission')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selected.map((earning) => (
                                            <TableRow key={earning.id}>
                                                <TableCell className="pl-[22px]">
                                                    <strong className="block">
                                                        {earning
                                                            .publisher_campaign
                                                            ?.campaign?.name ??
                                                            '—'}
                                                    </strong>
                                                    {earning.publisher_campaign
                                                        ?.offer?.name && (
                                                        <span className="block text-xs text-ink-muted">
                                                            {
                                                                earning
                                                                    .publisher_campaign
                                                                    .offer.name
                                                            }
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-ink-muted">
                                                    {earning.commission_type}
                                                </TableCell>
                                                <TableCell className="text-ink-muted">
                                                    {date(earning.created_at)}
                                                </TableCell>
                                                <TableCell className="pr-[22px] text-right font-bold tabular-nums">
                                                    {money(
                                                        lineAmount(earning),
                                                        earning.currency ??
                                                            currency,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </SectionCard>
                        </div>

                        <SectionCard
                            title={t('Invoice summary')}
                            icon={<ReceiptText />}
                            tone="finance"
                            className="flex-[1_1_300px] lg:sticky lg:top-24"
                        >
                            <dl
                                aria-live="polite"
                                className="grid grid-cols-[1fr_auto] gap-2 text-sm"
                            >
                                <dt className="text-ink-muted">
                                    {t('{{count}} earnings', {
                                        count: selected.length,
                                    })}
                                </dt>
                                <dd className="text-right tabular-nums">
                                    {money(grossCents / 100, currency)}
                                </dd>
                                {recoveryCents > 0 && (
                                    <>
                                        <dt className="text-ink-muted">
                                            {t('Outstanding refund recoveries')}
                                        </dt>
                                        <dd className="text-right tabular-nums">
                                            −
                                            {money(
                                                recoveryCents / 100,
                                                currency,
                                            )}
                                        </dd>
                                    </>
                                )}
                                <dt className="border-t border-border pt-2.5 font-extrabold">
                                    {t('Available after refund recoveries')}
                                </dt>
                                <dd className="border-t border-border pt-1.5 text-right text-[22px] font-extrabold text-brand-ink tabular-nums">
                                    {money(availableCents / 100, currency)}
                                </dd>
                                {group && (
                                    <>
                                        <dt className="text-ink-muted">
                                            {t('Minimum payout')}
                                        </dt>
                                        <dd className="text-right tabular-nums">
                                            {money(group.threshold, currency)}
                                        </dd>
                                    </>
                                )}
                                {payoutMethod && (
                                    <>
                                        <dt className="text-ink-muted">
                                            {t('Payout method')}
                                        </dt>
                                        <dd className="text-right">
                                            {payoutMethod}
                                        </dd>
                                    </>
                                )}
                            </dl>
                            {group && !group.can_request && (
                                <Alert
                                    variant="warning"
                                    role="note"
                                    className="mt-4"
                                >
                                    <Info />
                                    <AlertDescription>
                                        {t(
                                            'This balance is below the minimum payout. Choose another currency or wait for more approved earnings.',
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="mt-4 flex flex-col gap-3">
                                <FormErrors errors={form.errors} />
                                <Button
                                    disabled={
                                        form.processing || !group?.can_request
                                    }
                                    type="submit"
                                    className="w-full"
                                >
                                    {form.processing
                                        ? t('Creating…')
                                        : t('Request Payout')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    asChild
                                    className="w-full"
                                >
                                    <Link href={publisher.invoices.url()}>
                                        {t('Cancel')}
                                    </Link>
                                </Button>
                            </div>
                        </SectionCard>
                    </form>
                )}
            </div>
        </AppLayout>
    );
}
