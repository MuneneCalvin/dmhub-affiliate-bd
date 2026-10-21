import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { InfoCardSkeleton, InfoRow, ReusablePageTitle } from '@/dev/core';
import { StatusBadge } from '@/dev/statusBadge';
import { CustomBaseTable } from '@/dev/table';
import AppLayout from '@/layouts/app-layout';
import { AdminInvoiceDetail, BreadcrumbItem } from '@/types';
import { formatCurrency } from '@/utils/utils';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { DollarSign, Clock, CheckCircle, XCircle, FileText, User, Mail, Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { InvoiceEarningsColumns } from '@/dev/columns/columns';

const AdminInvoiceShow = () => {
    const { t } = useTranslation();
    const { invoice } = usePage<{ invoice: AdminInvoiceDetail }>().props;
    const [showRejectForm, setShowRejectForm] = useState(false);

    const rejectForm = useForm({
        reason: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Invoice Management'),
            href: '/admin/invoices',
        },
        {
            title: invoice?.invoice_number,
            href: `/admin/invoices/${invoice?.id}`,
        }
    ];

    const handleApprove = () => {
        router.post(`/admin/invoices/${invoice?.id}/approve`);
    };

    const handleReject = (e: React.FormEvent) => {
        e.preventDefault();
        rejectForm.post(`/admin/invoices/${invoice?.id}/reject`, {
            onSuccess: () => setShowRejectForm(false),
        });
    };

    const handleMarkPaid = () => {
        router.post(`/admin/invoices/${invoice?.id}/mark-paid`);
    };

    return (
        <AppLayout>
            <Head title={`${t("Invoice")} ${invoice?.invoice_number}`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={`${t("Invoice")} ${invoice?.invoice_number}`}
                    description={t("Review and manage this invoice")}
                    breadcrumbs={breadcrumbs}
                    children={
                        <div className="flex items-center gap-2">
                            {invoice?.status === 'pending' && (
                                <>
                                    <Button
                                        variant="default"
                                        onClick={handleApprove}>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        {t('Approve')}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => setShowRejectForm(true)}>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        {t('Reject')}
                                    </Button>
                                </>
                            )}
                            {invoice?.status === 'approved' && (
                                <Button
                                    variant="default"
                                    onClick={handleMarkPaid}>
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {t('Mark as Paid')}
                                </Button>
                            )}
                        </div>
                    } />
                {showRejectForm && (
                    <InfoCardSkeleton
                        icon={<XCircle className="h-5 w-5 text-red-500" />}
                        title={t('Reject Invoice')}
                        description={t('Provide a reason for rejection')}
                        className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800"
                    >
                        <form onSubmit={handleReject} className="space-y-4">
                            <Textarea
                                placeholder={t('Enter rejection reason...')}
                                value={rejectForm.data.reason}
                                onChange={(e) => rejectForm.setData('reason', e.target.value)}
                                rows={3}
                            />
                            {rejectForm.errors.reason && (
                                <p className="text-sm text-red-500">{rejectForm.errors.reason}</p>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" variant="destructive" disabled={rejectForm.processing}>
                                    {t('Confirm Rejection')}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowRejectForm(false)}>
                                    {t('Cancel')}
                                </Button>
                            </div>
                        </form>
                    </InfoCardSkeleton>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={invoice?.invoice_number}
                        description={`${t('Created on')} ${new Date(invoice?.created_at).toLocaleDateString()}`}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Amount')}</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {formatCurrency(parseFloat(invoice?.amount), invoice?.currency || 'USD')}
                                </p>
                            </div>
                            <StatusBadge status={invoice?.status} className="text-lg px-4 py-2" />
                        </div>
                        <Separator className="my-4" />
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Earnings Included')}</p>
                                <p className="text-xl font-semibold">{invoice?.earnings?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Network')}</p>
                                <p className="text-xl font-semibold">{invoice?.network?.network_name || 'N/A'}</p>
                            </div>
                        </div>
                    </InfoCardSkeleton>
                    <InfoCardSkeleton
                        icon={<User className="h-5 w-5" />}
                        title={t('Publisher Information')}
                        description={t('Details about the publisher')}
                    >
                        <InfoRow
                            label={t('Name')}
                            value={`${invoice?.publisher?.user?.first_name || ''} ${invoice?.publisher?.user?.last_name || ''}`}
                            icon={User}
                        />
                        <Separator />
                        <InfoRow
                            label={t('Email')}
                            value={invoice?.publisher?.user?.email || 'N/A'}
                            icon={Mail}
                        />
                        <Separator />
                        <InfoRow
                            label={t('Website')}
                            value={invoice?.publisher?.website_url || 'N/A'}
                            icon={Globe}
                        />
                    </InfoCardSkeleton>
                </div>

                <InfoCardSkeleton
                    icon={<Clock className="h-5 w-5" />}
                    title={t('Status Timeline')}
                    description={t('Invoice processing history')}>
                    <div className="flex flex-wrap gap-8">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="font-medium">{t('Requested')}</p>
                                <p className="text-sm text-muted-foreground">
                                    {invoice?.requested_at ? new Date(invoice?.requested_at).toLocaleString() : '-'}
                                </p>
                            </div>
                        </div>

                        {invoice?.approved_at && (
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="font-medium">{t('Approved')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(invoice?.approved_at).toLocaleString()}
                                    </p>
                                    {invoice?.approved_by_user && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('by')} {invoice?.approved_by_user?.first_name} {invoice?.approved_by_user?.last_name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {invoice?.paid_at && (
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="font-medium">{t('Paid')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(invoice?.paid_at).toLocaleString()}
                                    </p>
                                    {invoice?.payment_reference && (
                                        <p className="text-xs text-muted-foreground">
                                            {t('Ref')}: {invoice?.payment_reference}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {invoice?.status === 'rejected' && (
                            <div className="flex items-center gap-3">
                                <XCircle className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="font-medium">{t('Rejected')}</p>
                                    {invoice?.rejection_reason && (
                                        <p className="text-sm text-red-600">{invoice?.rejection_reason}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {invoice?.status === 'pending' && (
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
                                <div>
                                    <p className="font-medium">{t('Awaiting Review')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('This invoice requires your attention')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </InfoCardSkeleton>
                <InfoCardSkeleton
                    icon={<DollarSign className="h-5 w-5" />}
                    title={t('Included Earnings')}
                    description={t('All earnings included in this invoice')}>
                    {invoice?.earnings && invoice?.earnings?.length > 0 ? (
                        <CustomBaseTable
                            columns={InvoiceEarningsColumns}
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

                {invoice?.notes && (
                    <InfoCardSkeleton
                        icon={<FileText className="h-5 w-5" />}
                        title={t('Notes')}
                    >
                        <p>{invoice?.notes}</p>
                    </InfoCardSkeleton>
                )}
            </div>
        </AppLayout>
    );
};

export default AdminInvoiceShow;
