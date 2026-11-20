import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Download,
    HandCoins,
    Info,
    TriangleAlert,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/app/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { type BreadcrumbItem } from '@/types';

import {
    CancelInvoiceDialog,
    type CancelTarget,
} from './cancel-invoice-dialog';
import { InvoiceDocument, publisherName } from './invoice-document';
import { InvoiceTimeline } from './invoice-timeline';
import {
    RecordPaymentDialog,
    type PaymentTarget,
} from './record-payment-dialog';
import type { Invoice, InvoiceAbilities } from './types';

export type InvoiceEndpoints = {
    pdf: string;
    approve?: string;
    reject?: string;
    pay?: string;
};

/**
 * Invoice detail body shared by the publisher and network/admin pages:
 * header with the actions the viewer may perform, the document card and the
 * status history. Actions without permission are not rendered at all.
 */
export function InvoiceDetail({
    invoice,
    breadcrumbs,
    can = {},
    endpoints,
    audience,
}: {
    invoice: Invoice;
    breadcrumbs: BreadcrumbItem[];
    can?: InvoiceAbilities;
    endpoints: InvoiceEndpoints;
    /** Wording of the "what happens next" note. */
    audience: 'publisher' | 'network';
}) {
    const { t } = useTranslation();
    const [payment, setPayment] = useState<PaymentTarget | null>(null);
    const [cancel, setCancel] = useState<CancelTarget | null>(null);
    const [approving, setApproving] = useState(false);

    const pending = invoice.status === 'pending';
    const approved = invoice.status === 'approved';
    const showApprove = pending && can.approve && endpoints.approve;
    const showReject = (pending || approved) && can.reject && endpoints.reject;
    const showPay = approved && can.pay && endpoints.pay;

    const download = () => {
        window.location.href = endpoints.pdf;
    };

    const note = (() => {
        if (pending) {
            return audience === 'publisher'
                ? t('Your invoice is being reviewed')
                : can.approve
                  ? t('This invoice requires your attention')
                  : t('Waiting for a finance approver to review this invoice.');
        }
        if (approved) {
            return audience === 'publisher'
                ? t(
                      'Approved. The payment will be recorded once the transfer is made.',
                  )
                : can.pay
                  ? t(
                        'Approved. Record the bank payment once the transfer is made.',
                    )
                  : t('Approved and waiting for payment.');
        }
        return null;
    })();

    return (
        <>
            <PageHeader
                breadcrumbs={breadcrumbs}
                title={
                    <span className="flex flex-wrap items-center gap-3">
                        <span className="[overflow-wrap:anywhere]">
                            {invoice.invoice_number}
                        </span>
                        <StatusBadge status={invoice.status} />
                    </span>
                }
                description={
                    publisherName(invoice) && audience === 'network'
                        ? publisherName(invoice)
                        : undefined
                }
                actions={
                    <div className="flex flex-wrap gap-2.5">
                        <Button variant="secondary" asChild>
                            <a href={endpoints.pdf} download>
                                <Download className="text-finance" />
                                {t('Download PDF')}
                            </a>
                        </Button>
                        {showReject && (
                            <Button
                                variant={pending ? 'destructive' : 'secondary'}
                                onClick={() =>
                                    setCancel({
                                        url: endpoints.reject!,
                                        invoiceNumber: invoice.invoice_number,
                                        mode: pending ? 'reject' : 'cancel',
                                    })
                                }
                            >
                                <XCircle />
                                {pending ? t('Reject') : t('Cancel invoice')}
                            </Button>
                        )}
                        {showApprove && (
                            <Button
                                disabled={approving}
                                onClick={() =>
                                    router.post(
                                        endpoints.approve!,
                                        {},
                                        {
                                            preserveScroll: true,
                                            onStart: () => setApproving(true),
                                            onFinish: () => setApproving(false),
                                        },
                                    )
                                }
                            >
                                <CheckCircle2 />
                                {t('Approve')}
                            </Button>
                        )}
                        {showPay && (
                            <Button
                                variant="success"
                                onClick={() =>
                                    setPayment({
                                        url: endpoints.pay!,
                                        invoiceNumber: invoice.invoice_number,
                                        payee: publisherName(invoice),
                                        amount: invoice.amount,
                                        currency: invoice.currency,
                                    })
                                }
                            >
                                <HandCoins />
                                {t('Record payment')}
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-wrap items-start gap-[18px]">
                <InvoiceDocument
                    invoice={invoice}
                    className="flex-[3_1_560px]"
                />
                <InvoiceTimeline invoice={invoice} className="flex-[1_1_280px]">
                    {note && (
                        <Alert
                            variant={approved ? 'warning' : 'info'}
                            role="note"
                        >
                            {approved ? <TriangleAlert /> : <Info />}
                            <AlertDescription>{note}</AlertDescription>
                        </Alert>
                    )}
                    {invoice.notes && (
                        <div className="rounded-[14px] bg-surface-muted p-3.5 text-[13px]">
                            <strong className="block">{t('Notes')}</strong>
                            {invoice.notes}
                        </div>
                    )}
                </InvoiceTimeline>
            </div>

            <RecordPaymentDialog
                target={payment}
                onClose={() => setPayment(null)}
                followUp={{ label: t('Download PDF'), onClick: download }}
            />
            <CancelInvoiceDialog
                target={cancel}
                onClose={() => setCancel(null)}
            />
        </>
    );
}
