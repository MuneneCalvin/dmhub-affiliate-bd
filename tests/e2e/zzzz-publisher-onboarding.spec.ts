import { expect, test } from '@playwright/test';
import { as, english } from './helpers';

// Runs last (file order): it adds a pending individual publisher the other specs do not expect.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString().slice(-8);
const email = `e2e.creator.${stamp}@example.test`;
const name = `Creator${stamp}`;

test('an individual registers with two channels and no company details', async ({
    browser,
}) => {
    const page = await (
        await browser.newContext({ storageState: english })
    ).newPage();
    await page.goto('/register');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('radio', { name: 'Company' })).toBeChecked();
    await page.getByRole('radio', { name: 'Individual' }).check();
    await expect(page.getByLabel('Business name')).toHaveCount(0);
    await expect(page.getByLabel('Chamber of Commerce number')).toHaveCount(0);

    // At least one channel is required.
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Choose at least one channel')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Instagram' }).check();
    await page
        .getByLabel('Instagram: URL or account name')
        .fill('@creator.e2e');
    await page.getByRole('checkbox', { name: 'YouTube' }).check();
    await page
        .getByLabel('YouTube: URL or account name')
        .fill('https://www.youtube.com/@creator-e2e');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('First name').fill(name);
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Work email').fill(email);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Your account is under review',
        }),
    ).toBeVisible();
    await page.context().close();
});

test('the approver sees the type and both channels', async ({ browser }) => {
    const approver = await as(browser, 'network');
    await approver.goto('/networks/pool/publishers');
    await approver
        .getByRole('row')
        .filter({ hasText: email })
        .getByRole('link', { name: /^Details for / })
        .click();

    await expect(approver.getByText('Registered as')).toBeVisible();
    await expect(approver.getByText('Individual').first()).toBeVisible();
    await expect(approver.getByText('Where they promote')).toBeVisible();
    await expect(approver.getByText('@creator.e2e')).toBeVisible();
    const link = approver.getByRole('link', {
        name: 'https://www.youtube.com/@creator-e2e',
    });
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(
        approver.getByText('Chamber of Commerce number'),
    ).toBeVisible();
});

test('a company still registers with one channel and its company details', async ({
    browser,
}) => {
    const page = await (
        await browser.newContext({ storageState: english })
    ).newPage();
    const companyEmail = `e2e.company.${stamp}@example.test`;
    await page.goto('/register');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Business name').fill(`E2E Company ${stamp}`);
    await page.getByLabel('Industry').fill('Media');
    await page
        .getByLabel('Chamber of Commerce number')
        .fill(`C${stamp}`.slice(0, 10));
    await page.getByRole('checkbox', { name: 'Newsletter' }).check();
    await page
        .getByLabel('Newsletter: URL or account name')
        .fill('Pensioen Weekly');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('First name').fill('Carla');
    await page.getByLabel('Last name').fill('Company');
    await page.getByLabel('Work email').fill(companyEmail);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Your account is under review',
        }),
    ).toBeVisible();
    await page.context().close();
});

test('the sign-up step reads in Dutch for a visitor who has not chosen a language', async ({
    browser,
}) => {
    const context = await browser.newContext({
        storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/register');
    await page.getByRole('button', { name: 'Doorgaan' }).click();

    await expect(
        page.getByRole('radio', { name: 'Particulier' }),
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Bedrijf' })).toBeChecked();
    await expect(
        page.getByRole('group', { name: 'Waar ga je promoten?' }),
    ).toBeVisible();
    await expect(
        page.getByRole('checkbox', { name: 'Nieuwsbrief' }),
    ).toBeVisible();
    await context.close();
});
