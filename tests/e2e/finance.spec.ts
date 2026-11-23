import { expect, test } from '@playwright/test';
import { as, seeded, state } from './helpers';

test('publisher switches currency and sees separate totals', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/publisher/earnings');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Earnings & invoices' }),
    ).toBeVisible();

    const currency = page.getByRole('group', { name: 'Currency' });
    await expect(currency.getByRole('button', { name: 'EUR' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    const hero = page.getByRole('region', { name: 'Available to invoice' });
    await expect(hero).toContainText('€25.00');
    const history = page.getByRole('region', { name: 'Earnings History' });
    await expect(history).toContainText(seeded.runningCampaign);
    await expect(history).not.toContainText(seeded.dollarCampaign);

    await currency.getByRole('button', { name: 'USD' }).click();
    await expect(page).toHaveURL(/currency=USD/);
    await expect(currency.getByRole('button', { name: 'USD' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    await expect(history).toContainText(seeded.dollarCampaign);
    await expect(history).not.toContainText(seeded.runningCampaign);
    const breakdown = page.getByRole('region', {
        name: 'Compensation breakdown',
    });
    await expect(breakdown).toContainText('$');
    await expect(breakdown).not.toContainText('€');
});

test('publisher sees approved earnings and requests a payout invoice', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/publisher/earnings');
    await expect(page.getByRole('main')).toContainText(seeded.runningCampaign);
    await expect(page.getByRole('main')).toContainText('€25.00');

    await page
        .getByRole('region', { name: 'Available to invoice' })
        .getByRole('link', { name: 'Create invoice' })
        .click();
    await expect(page).toHaveURL(/publisher\/invoices\/create$/);
    const group = page.getByRole('radiogroup', {
        name: 'Currency and liable network',
    });
    await group.getByRole('radio', { name: /^EUR · / }).check();
    await expect(
        page.getByRole('row', { name: /E2E Running Campaign/ }),
    ).toContainText('€25.00');
    await expect(
        page.getByRole('region', { name: 'Invoice summary' }),
    ).toContainText('€25.00');
    await Promise.all([
        page.waitForURL(/publisher\/invoices\/\d+$/),
        page
            .getByRole('button', { name: 'Request Payout', exact: true })
            .click(),
    ]);
    await expect(page.getByRole('main')).toContainText('25.00');

    const invoices = state().publisher_invoices;
    expect(invoices).toHaveLength(1);
    expect(invoices[0].currency).toBe('EUR');
    // Only EUR earnings are invoiced; the USD earning stays separate.
    const earnings = state().publisher_earnings;
    expect(
        earnings
            .filter((e) => e.currency === 'EUR')
            .every((e) => e.invoice_id === invoices[0].id),
    ).toBe(true);
    expect(
        earnings
            .filter((e) => e.currency === 'USD')
            .every((e) => e.invoice_id === null),
    ).toBe(true);

    await page.goto('/publisher/invoices');
    await expect(page.getByRole('main')).toContainText('25.00');

    // The PDF download of the publisher's own invoice works.
    const pdf = await page.request.get(
        `/publisher/invoices/${invoices[0].id}/pdf`,
    );
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

// Approving publisher invoices needs approve_network_invoices, which the default
// network_owner role does not have: the network owner sees the invoice but no
// settlement actions.
test('network owner reviews the invoice without settlement actions', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/admin/invoices');
    await expect(page.getByRole('main')).toContainText('25.00');
    await page.goto(`/admin/invoices/${state().publisher_invoices[0].id}`);
    await expect(page.getByRole('main')).toContainText('E2E Running Campaign');
    await expect(
        page.getByRole('link', { name: 'Download PDF' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Approve', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'Record payment' }),
    ).toHaveCount(0);
});

test('super admin approves the invoice and records the payment', async ({
    browser,
}) => {
    const page = await as(browser, 'admin');
    const invoice = state().publisher_invoices[0];

    await page.goto(`/admin/invoices/${invoice.id}`);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect
        .poll(() => state().publisher_invoices[0].status)
        .toBe('approved');

    // Phase 09: "Mark as Paid" is now "Record payment" (Overlays board).
    await page.getByRole('button', { name: 'Record payment' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record payment' });
    await expect(dialog).toContainText('Amount due');
    await expect(dialog).toContainText('€25.00');
    // Empty fields are caught before anything is sent.
    await dialog.getByRole('button', { name: 'Record payment' }).click();
    await expect(dialog).toContainText('Enter the bank reference.');
    await dialog.getByLabel('Bank reference').fill('E2E-BANK-0001');
    await dialog
        .getByLabel('Receipt or reconciliation note')
        .fill('Statement line 14, 25.00 EUR');
    await dialog.getByRole('button', { name: 'Record payment' }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => state().publisher_invoices[0].status).toBe('paid');

    await expect(page.getByText('Payment recorded')).toBeVisible();
    const history = page.getByRole('region', { name: 'Status history' });
    await expect(history).toContainText('Paid');
    await expect(history).toContainText('E2E-BANK-0001');
    await expect(
        page.getByRole('heading', { level: 1 }).getByText('Paid'),
    ).toBeVisible();

    const pdf = await page.request.get(`/admin/invoices/${invoice.id}/pdf`);
    expect(pdf.status()).toBe(200);

    const publisher = await as(browser, 'publisher');
    await publisher.goto('/publisher/invoices');
    await expect(publisher.getByRole('main')).toContainText(/Paid/);
});
