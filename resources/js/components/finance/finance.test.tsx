import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CurrencyTotals } from './currency-totals';
import { InvoiceDetail } from './invoice-detail';
import { InvoiceDocument } from './invoice-document';
import {
    availableFor,
    formatMoney,
    invoiceTotals,
    lineAmount,
    summaryTotal,
} from './money';
import { RecordPaymentDialog, validatePayment } from './record-payment-dialog';
import type { FinanceSummary, Invoice } from './types';

const summary: FinanceSummary = {
    EUR: {
        approved: { amount: '100.10', count: 2 },
        pending: { amount: '0.20', count: 1 },
        paid: { amount: '50.00', count: 1 },
    },
    USD: {
        approved: { amount: '999.99', count: 9 },
        pending: { amount: '1.00', count: 1 },
    },
};

const invoice: Invoice = {
    id: 7,
    invoice_number: 'INV-TEST-7',
    amount: '40.00',
    currency: 'EUR',
    status: 'approved',
    created_at: '2026-11-01T09:00:00Z',
    requested_at: '2026-11-01T09:00:00Z',
    approved_at: '2026-11-02T10:00:00Z',
    period_start: '2026-10-01',
    period_end: '2026-10-31',
    invoice_details: {
        gross_minor: 5000,
        recovery_minor: 1000,
        net_minor: 4000,
    },
    approved_by_user: { first_name: 'Ada', last_name: 'Admin' },
    network: { id: 1, network_name: 'Northwind Network' },
    publisher: {
        id: 3,
        business_name: 'Brightside Media',
        user: { email: 'dana@brightside.test' },
    },
    earnings: [
        {
            id: 1,
            amount: '30.00',
            invoice_amount: '30.00',
            commission_type: 'CPL',
            created_at: '2026-10-05T00:00:00Z',
            publisher_campaign: {
                campaign: { name: 'Summer Sale' },
                offer: { name: 'Lead offer' },
            },
        },
        {
            id: 2,
            amount: '25.00',
            invoice_amount: '20.00',
            commission_type: 'CPS',
            created_at: '2026-10-06T00:00:00Z',
            publisher_campaign: { campaign: { name: 'Cosy Nights' } },
        },
    ],
};

describe('money helpers', () => {
    it('formats each amount in its own currency', () => {
        expect(formatMoney(1234.5, 'EUR', 'en')).toBe('€1,234.50');
        expect(formatMoney('25', 'USD', 'en')).toBe('$25.00');
        expect(formatMoney(1234.5, 'EUR', 'nl')).toMatch(/1\.234,50/);
        expect(formatMoney('not a number', 'GBP', 'en')).toBe('£0.00');
    });

    it('never adds amounts of another currency into a total', () => {
        expect(summaryTotal(summary, 'EUR', ['approved', 'pending'])).toEqual({
            amount: 100.3,
            count: 3,
        });
        expect(summaryTotal(summary, 'USD', ['approved', 'pending'])).toEqual({
            amount: 1000.99,
            count: 10,
        });
        expect(summaryTotal(summary, 'GBP', ['approved'])).toEqual({
            amount: 0,
            count: 0,
        });

        const groups = [
            {
                network_id: 1,
                currency: 'EUR',
                available_amount: '10.10',
                threshold: '5',
                remaining: '0',
                can_request: true,
            },
            {
                network_id: 2,
                currency: 'EUR',
                available_amount: '0.20',
                threshold: '5',
                remaining: '4.80',
                can_request: false,
            },
            {
                network_id: 1,
                currency: 'USD',
                available_amount: '500.00',
                threshold: '5',
                remaining: '0',
                can_request: true,
            },
        ];
        const eur = availableFor(groups, 'EUR');
        expect(eur.amount).toBe(10.3);
        expect(eur.groups).toHaveLength(2);
        expect(availableFor(groups, 'GBP')).toMatchObject({
            amount: 0,
            canRequest: false,
        });
    });

    it('uses the totals the backend reserved on the invoice', () => {
        expect(invoiceTotals(invoice)).toEqual({
            subtotal: 50,
            recovery: 10,
            total: 40,
        });
        expect(
            invoiceTotals({ amount: '12.00', invoice_details: null }),
        ).toEqual({ subtotal: 12, recovery: 0, total: 12 });
        expect(lineAmount({ amount: '10.00', reversed_minor: 250 })).toBe(7.5);
        expect(lineAmount({ amount: '10.00', invoice_amount: '9.00' })).toBe(9);
    });
});

describe('CurrencyTotals', () => {
    it('renders one card per currency with its own amounts', () => {
        renderWithApp(<CurrencyTotals summary={summary} label="Totals" />);
        const eur = screen.getByRole('article', { name: 'EUR totals' });
        const usd = screen.getByRole('article', { name: 'USD totals' });
        expect(within(eur).getByText('€100.10')).toBeInTheDocument();
        expect(within(eur).queryByText(/\$/)).not.toBeInTheDocument();
        expect(within(usd).getByText('$999.99')).toBeInTheDocument();
        expect(within(usd).queryByText(/€/)).not.toBeInTheDocument();
    });

    it('shows an empty state without activity', () => {
        renderWithApp(<CurrencyTotals summary={{}} />);
        expect(
            screen.getByText('No reviewed financial activity yet.'),
        ).toBeInTheDocument();
    });
});

describe('InvoiceDocument', () => {
    it('lists the lines and the subtotal, recovery and total', () => {
        renderWithApp(<InvoiceDocument invoice={invoice} />);
        const doc = screen.getByRole('article', { name: /INV-TEST-7/ });
        expect(within(doc).getByText('Northwind Network')).toBeInTheDocument();
        expect(within(doc).getByText('Brightside Media')).toBeInTheDocument();
        const rows = within(doc).getAllByRole('row').slice(1);
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText('Summer Sale')).toBeInTheDocument();
        expect(within(rows[1]).getByText('€20.00')).toBeInTheDocument();

        const totals = within(doc).getByLabelText('Invoice totals');
        expect(within(totals).getByText('€50.00')).toBeInTheDocument();
        expect(within(totals).getByText('−€10.00')).toBeInTheDocument();
        expect(within(totals).getByText('€40.00')).toBeInTheDocument();
    });
});

describe('InvoiceDetail', () => {
    const endpoints = {
        pdf: '/admin/invoices/7/pdf',
        approve: '/admin/invoices/7/approve',
        reject: '/admin/invoices/7/reject',
        pay: '/admin/invoices/7/mark-paid',
    };

    it('shows no settlement actions without permission', () => {
        renderWithApp(
            <InvoiceDetail
                invoice={{ ...invoice, status: 'pending', approved_at: null }}
                breadcrumbs={[]}
                endpoints={endpoints}
                audience="network"
                can={{ approve: false, reject: false, pay: false }}
            />,
        );
        expect(
            screen.getByRole('link', { name: 'Download PDF' }),
        ).toHaveAttribute('href', '/admin/invoices/7/pdf');
        expect(
            screen.queryByRole('button', { name: 'Approve' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Reject' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(
                'Waiting for a finance approver to review this invoice.',
            ),
        ).toBeInTheDocument();
    });

    it('offers the next step to a permitted user and shows the history', () => {
        renderWithApp(
            <InvoiceDetail
                invoice={invoice}
                breadcrumbs={[]}
                endpoints={endpoints}
                audience="network"
                can={{ approve: true, reject: true, pay: true }}
            />,
        );
        // Approved invoice: record payment or cancel, no second approval.
        expect(
            screen.getByRole('button', { name: 'Record payment' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Cancel invoice' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Approve' }),
        ).not.toBeInTheDocument();

        const history = screen.getByRole('region', { name: 'Status history' });
        const steps = within(history).getAllByRole('listitem');
        expect(steps.map((step) => step.dataset.state)).toEqual([
            'waiting',
            'done',
            'done',
        ]);
        expect(within(history).getByText(/by Ada Admin/)).toBeInTheDocument();
    });
});

describe('RecordPaymentDialog', () => {
    const target = {
        url: '/admin/invoices/7/mark-paid',
        invoiceNumber: 'INV-TEST-7',
        payee: 'Brightside Media',
        amount: '40.00',
        currency: 'EUR',
    };

    it('validates reference and note before submitting', () => {
        const t = (key: string) => key;
        expect(
            validatePayment(
                { payment_reference: ' ', payment_evidence: '' },
                t,
            ),
        ).toEqual({
            payment_reference: 'Enter the bank reference.',
            payment_evidence: 'Add the receipt or reconciliation note.',
        });
        expect(
            validatePayment(
                {
                    payment_reference: 'x'.repeat(121),
                    payment_evidence: 'ok',
                },
                t,
            ),
        ).toEqual({
            payment_reference:
                'The bank reference can be at most 120 characters.',
        });
        expect(
            validatePayment(
                { payment_reference: 'BANK-1', payment_evidence: 'Line 4' },
                t,
            ),
        ).toEqual({});
    });

    it('shows the amount due and inline messages for empty fields', async () => {
        const { user } = renderWithApp(
            <RecordPaymentDialog target={target} onClose={() => {}} />,
        );
        const dialog = screen.getByRole('dialog', { name: 'Record payment' });
        expect(within(dialog).getByText('Amount due')).toBeInTheDocument();
        expect(within(dialog).getByText('€40.00')).toBeInTheDocument();
        expect(
            within(dialog).getByText('INV-TEST-7 · Brightside Media'),
        ).toBeInTheDocument();
        expect(
            within(dialog).queryByLabelText('Method'),
        ).not.toBeInTheDocument();

        await user.click(
            within(dialog).getByRole('button', { name: 'Record payment' }),
        );
        expect(
            within(dialog).getByText('Enter the bank reference.'),
        ).toBeInTheDocument();
        expect(
            within(dialog).getByText('Add the receipt or reconciliation note.'),
        ).toBeInTheDocument();
        const reference = within(dialog).getByLabelText('Bank reference');
        expect(reference).toHaveAttribute('aria-invalid', 'true');
        expect(reference).toHaveFocus();
    });

    it('asks for the method on network invoices', () => {
        renderWithApp(
            <RecordPaymentDialog
                target={{ ...target, askMethod: true }}
                onClose={() => {}}
            />,
        );
        expect(screen.getByLabelText('Method')).toHaveValue('Bank transfer');
    });
});
