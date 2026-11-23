import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { as, english, loginWith } from './helpers';

// Runs last (file order): it adds a pending partner the other specs do not expect.
// Mail goes to the log driver in the e2e environment, so the emails are read back from the run's log.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString().slice(-8);
const email = `e2e.partner.${stamp}@example.test`;
const business = `E2E Partner ${stamp}`;
const password = 'Chosen-by-partner-1!';
let setupLink = '';
let partner: Page;

test.beforeAll(async ({ browser }) => {
    partner = await browser.newPage({ storageState: english });
});

test.afterAll(async () => {
    await partner.close();
});

const mailLog = () =>
    readFileSync(`${process.env.E2E_RUN_DIR}/storage/logs/laravel.log`, 'utf8')
        // Messages are logged as raw MIME, quoted-printable encoded.
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/g, (_, hex) =>
            String.fromCharCode(parseInt(hex, 16)),
        );

/** Every logged message that mentions this partner's address. */
const mailsTo = (address: string) =>
    mailLog()
        .split(/\[\d{4}-\d{2}-\d{2} [\d:]+\] \w+\.\w+: /)
        .filter(
            (entry) =>
                entry.includes(`To: ${address}`) ||
                entry.includes(`<${address}>`),
        );

async function register(page: Page) {
    await page.goto('/register');
    await page.getByRole('radio', { name: 'Publisher' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Business name').fill(business);
    await page.getByRole('checkbox', { name: 'Website or blog' }).check();
    await page
        .getByLabel('Website or blog: URL or account name')
        .fill('https://e2e-partner.example.test');
    await page.getByLabel('Industry').fill('Media');
    await page
        .getByLabel('Chamber of Commerce number')
        .fill(`P${stamp}`.slice(0, 10));
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('First name').fill('Pia');
    await page.getByLabel('Last name').fill('Partner');
    await page.getByLabel('Work email').fill(email);
    await page.getByRole('button', { name: 'Create account' }).click();
}

test('a new partner registers, is signed in and is told what happens next', async () => {
    const page = partner;
    await register(page);

    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Your account is under review',
        }),
    ).toBeVisible();
    await expect(
        page.getByText(
            /Check your inbox for the email with your password link/,
        ),
    ).toBeVisible();

    const mails = mailsTo(email);
    expect(mails).toHaveLength(1);
    expect(mails[0]).toContain('Subject: Choose your password for');
    expect(mails.join()).not.toContain('Verify Email Address');
    setupLink =
        mails[0].match(
            /https?:\/\/[^\s"<>]+\/reset-password\/[A-Za-z0-9]+\?email=[^\s"<>]+/,
        )?.[0] ?? '';
    expect(setupLink).not.toBe('');
});

test('opening the link in the same browser lets the partner choose a password', async () => {
    const page = partner;
    // Still signed in from registering: the link must not bounce them away.
    await page.goto(setupLink);

    await page.getByLabel('New password').fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page).toHaveURL(/login/);

    await loginWith(page, email, password);
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Your account is under review',
        }),
    ).toBeVisible();
});

test('the approver sees the partner waiting and approves them', async ({
    browser,
}) => {
    const approver = await as(browser, 'network');
    await approver.goto('/network/dashboard');
    await expect(
        approver.getByRole('heading', { name: 'Pending approvals' }),
    ).toBeVisible();
    await expect(
        approver.getByRole('link', { name: /Partner pool \d+ waiting/ }),
    ).toBeVisible();

    await approver
        .getByRole('link', { name: 'Review in the partner pool' })
        .click();
    await expect(approver).toHaveURL(/networks\/pool/);
    await approver
        .getByRole('button', { name: `More actions for ${business}` })
        .click();
    await approver.getByRole('menuitem', { name: 'Approve' }).click();
    await approver
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Approve' })
        .click();
    await expect(
        approver.getByText(/approved and assigned to your network/i),
    ).toBeVisible();

    const approved = mailsTo(email).filter((m) =>
        m.includes('Subject: Your account has been approved at'),
    );
    expect(approved).toHaveLength(1);
});

test('the approved partner signs in and reaches the workspace', async ({
    browser,
}) => {
    const page = await browser.newPage({ storageState: english });
    await loginWith(page, email, password);
    await expect(page).toHaveURL(/publisher_dashboard\/dashboard/);
    await expect(
        page.getByRole('heading', { level: 1, name: 'Campaign marketplace' }),
    ).toBeVisible();
});
