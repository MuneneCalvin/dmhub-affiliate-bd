import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoCardSkeleton, ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, PublisherEarning, PublisherPayoutRequest } from '@/types';
import { formatCurrency } from '@/utils/utils';
import { Head, useForm, usePage } from '@inertiajs/react';
import { DollarSign, AlertTriangle, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InvoiceCreate = () => {
    const { t } = useTranslation();
    const { canRequest, earnings, payoutMethod } = usePage<{
        canRequest: PublisherPayoutRequest;
        earnings: PublisherEarning[];
        payoutMethod: string | null;
    }>().props;

    const { post, processing, errors } = useForm({
        start_date: '',
        end_date: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoices'),
            href: publisher.invoices.url(),
        },
        {
            title: t('Request Payout'),
            href: publisher.invoices.create.url(),
        }
    ];

    const totalAmount = earnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(publisher.invoices.store.url());
    };

    return (
        <AppLayout>
            <Head title={t("Request Payout")} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t("Request Payout")}
                    description={t("Create an invoice for your accumulated earnings")}
                    breadcrumbs={breadcrumbs}
                />
                {!canRequest?.can_request ? (
                    <InfoCardSkeleton
                        icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        title={t('Cannot Request Payout')}
                        description={t('You have not reached the minimum payout threshold')}
                        className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800" >
                        <p className="text-yellow-800 dark:text-yellow-200">
                            {t('Minimum payout threshold is')} <strong>{formatCurrency(canRequest?.min_payout || 0, 'USD')}</strong>.
                            {t(' You have')} <strong>{formatCurrency(canRequest?.available_amount || 0, 'USD')}</strong> {t('available.')}
                            {t(' You need')} <strong>{formatCurrency(canRequest?.remaining || 0, 'USD')}</strong> {t('more to request a payout.')}
                        </p>
                    </InfoCardSkeleton>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <InfoCardSkeleton
                            icon={<DollarSign className="h-5 w-5" />}
                            title={t('Payout Summary')}
                            description={t('Review the earnings to be included in your payout request')}
                            className="lg:col-span-2">
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                                <p className="text-sm text-muted-foreground">{t('Total Amount')}</p>
                                <p className="text-4xl font-bold text-green-600">{formatCurrency(totalAmount, 'USD')}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {earnings?.length || 0} {t('earnings to be included')}
                                </p>
                            </div>
                            {earnings?.length > 0 ? (
                                <div className="overflow-x-auto max-h-96">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-background">
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2">{t('Date')}</th>
                                                <th className="text-left py-2 px-2">{t('Campaign')}</th>
                                                <th className="text-left py-2 px-2">{t('Lead')}</th>
                                                <th className="text-left py-2 px-2">{t('Type')}</th>
                                                <th className="text-right py-2 px-2">{t('Amount')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {earnings?.map((earning) => (
                                                <tr key={earning?.id} className="border-b">
                                                    <td className="py-2 px-2 text-xs">
                                                        {new Date(earning?.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-2 px-2 text-xs">
                                                        {earning?.publisher_campaign?.campaign?.name || 'N/A'}
                                                    </td>
                                                    <td className="py-2 px-2 text-xs">
                                                        {earning?.lead?.email || 'N/A'}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {earning?.commission_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2 px-2 text-right font-semibold text-green-600">
                                                        {formatCurrency(parseFloat(earning?.amount), 'USD')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">{t('No earnings available for payout')}</p>
                            )}
                        </InfoCardSkeleton>

                        <InfoCardSkeleton
                            icon={<FileText className="h-5 w-5" />}
                            title={t('Request Invoice')}
                            description={t('Submit your payout request')}>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {payoutMethod && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('Payout Method')}</p>
                                        <p className="font-semibold">{payoutMethod}</p>
                                    </div>
                                )}

                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-2">{t('What happens next?')}</p>
                                    <ol className="text-sm space-y-1 list-decimal list-inside">
                                        <li>{t('Invoice is created and sent for review')}</li>
                                        <li>{t('Network admin reviews and approves')}</li>
                                        <li>{t('Payment is processed')}</li>
                                    </ol>
                                </div>

                                {errors?.start_date && (
                                    <p className="text-sm text-red-500">{errors.start_date}</p>
                                )}
                                {errors?.end_date && (
                                    <p className="text-sm text-red-500">{errors.end_date}</p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={processing || !earnings?.length}>
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {processing ? t('Creating...') : t('Request Payout')} ({formatCurrency(totalAmount, 'USD')})
                                </Button>
                            </form>
                        </InfoCardSkeleton>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default InvoiceCreate;
