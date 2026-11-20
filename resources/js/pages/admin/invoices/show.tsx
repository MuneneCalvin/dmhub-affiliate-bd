import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import {
    InvoiceDetail,
    type Invoice,
    type InvoiceAbilities,
} from '@/components/finance';
import FinanceErrorNotice from '@/components/finance-error-notice';
import AppLayout from '@/layouts/app-layout';
import adminInvoices from '@/routes/admin/invoices';

export default function AdminInvoiceShow() {
    const { t } = useTranslation();
    const { invoice, can } = usePage<{
        invoice: Invoice;
        can?: InvoiceAbilities;
    }>().props;

    return (
        <AppLayout>
            <Head title={`${t('Invoice')} ${invoice.invoice_number}`} />
            <div className="workspace-page flex flex-col gap-6">
                <FinanceErrorNotice />
                <InvoiceDetail
                    invoice={invoice}
                    audience="network"
                    can={can}
                    breadcrumbs={[
                        {
                            title: t('Publisher invoices'),
                            href: adminInvoices.index.url(),
                        },
                        {
                            title: invoice.invoice_number,
                            href: adminInvoices.show.url(invoice.id),
                        },
                    ]}
                    endpoints={{
                        pdf: adminInvoices.pdf.url(invoice.id),
                        approve: adminInvoices.approve.url(invoice.id),
                        reject: adminInvoices.reject.url(invoice.id),
                        pay: adminInvoices.markPaid.url(invoice.id),
                    }}
                />
            </div>
        </AppLayout>
    );
}
