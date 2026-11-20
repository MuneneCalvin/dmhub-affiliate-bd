import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

import { InvoiceDetail, type Invoice } from '@/components/finance';
import AppLayout from '@/layouts/app-layout';
import publisher from '@/routes/publisher';

export default function InvoiceShow() {
    const { t } = useTranslation();
    const { invoice } = usePage<{ invoice: Invoice }>().props;

    return (
        <AppLayout>
            <Head title={`${t('Invoice')} ${invoice.invoice_number}`} />
            <div className="workspace-page flex flex-col gap-6">
                <InvoiceDetail
                    invoice={invoice}
                    audience="publisher"
                    breadcrumbs={[
                        {
                            title: t('Invoices'),
                            href: publisher.invoices.url(),
                        },
                        {
                            title: invoice.invoice_number,
                            href: publisher.invoices.show.url(invoice.id),
                        },
                    ]}
                    endpoints={{ pdf: publisher.invoices.pdf.url(invoice.id) }}
                />
            </div>
        </AppLayout>
    );
}
