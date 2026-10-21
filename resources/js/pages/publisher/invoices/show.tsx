import { Separator } from '@/components/ui/separator';
import { PublisherEarningsColumn } from '@/dev/columns/columns';
import { InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import { CustomBaseTable } from '@/dev/table';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';
import { BreadcrumbItem, PublisherInvoice } from '@/types';
import { formatCurrency } from '@/utils/utils';
import { Head, usePage } from '@inertiajs/react';
import { DollarSign, Clock, CheckCircle, XCircle, FileText, User, Calendar, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const InvoiceShow = () => {
    const { t } = useTranslation();
    const { invoice } = usePage<{ invoice: PublisherInvoice }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoices'),
            href: publisher.invoices.url(),
        },
        {
            title: invoice.invoice_number,
            href: publisher.invoices.show.url(invoice.id),
        }
    ];

    return (
        <AppLayout>
            <Head title={`${t("Invoice")} ${invoice.invoice_number}`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={`${t("Invoice")} ${invoice.invoice_number}`}
                    description={t("View invoice details")}
                    breadcrumbs={breadcrumbs}/>

                <div className="grid gap-6 lg:grid-cols-3">
                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={invoice.invoice_number}
                        description={`${t('Created on')} ${new Date(invoice.created_at).toLocaleDateString()}`}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Amount')}</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatCurrency(parseFloat(invoice.amount), 'USD')}
                                </p>
                            </div>
                            <StatusBadge status={invoice.status} className="text-lg px-4 py-2" />
                        </div>
                        <Separator className="my-4" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <InfoRow
                                label={t('Earnings Included')}
                                value={String(invoice.earnings?.length || 0)}
                                icon={Hash}
                            />
                            <InfoRow
                                label={t('Created')}
                                value={new Date(invoice.created_at).toLocaleDateString()}
                                icon={Calendar}
                            />
                        </div>
                    </InfoCardSkeleton>

                    <InfoCardSkeleton
                        icon={<Clock className="h-5 w-5" />}
                        title={t('Status Timeline')}
                        description={t('Invoice processing history')}
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="font-medium">{t('Created')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(invoice.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {invoice.approved_at && (
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="font-medium">{t('Approved')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(invoice.approved_at).toLocaleString()}
                                        </p>
                                        {invoice.approved_by_user && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {invoice.approved_by_user.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {invoice.paid_at && (
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                    <div>
                                        <p className="font-medium">{t('Paid')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(invoice.paid_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {invoice.status === 'rejected' && (
                                <div className="flex items-center gap-3">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <div>
                                        <p className="font-medium">{t('Rejected')}</p>
                                        {invoice.rejection_reason && (
                                            <p className="text-sm text-red-600">{invoice.rejection_reason}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {invoice.status === 'pending' && (
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
                                    <div>
                                        <p className="font-medium">{t('Awaiting Approval')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('Your invoice is being reviewed')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </InfoCardSkeleton>
                </div>

                <InfoCardSkeleton
                    icon={<DollarSign className="h-5 w-5" />}
                    title={t('Included Earnings')}
                    description={t('All earnings included in this invoice')}>
                    {invoice.earnings && invoice.earnings.length > 0 ? (
                        <CustomBaseTable
                            columns={PublisherEarningsColumn}
                            data={invoice.earnings}
                            showPagination={false}
                            page={1}
                            pageCount={1}
                            pageSize={invoice.earnings.length}
                            onPageChange={() => {}}
                            setPageSize={() => {}}
                            OtherToolsProps={{
                                onChange: () => {},
                                placeholder: '',
                            }}
                        />
                    ) : (
                        <p className="text-muted-foreground">{t('No earnings attached to this invoice')}</p>
                    )}
                </InfoCardSkeleton>

                {invoice.notes && (
                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={t('Notes')}
                    >
                        <p>{invoice.notes}</p>
                    </InfoCardSkeleton>
                )}
            </div>
        </AppLayout>
    );
};

export default InvoiceShow;
