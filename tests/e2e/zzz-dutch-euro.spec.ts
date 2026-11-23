import { expect, test, type Page } from '@playwright/test';
import { as, seeded, state } from './helpers';

// The config starts every context as a visitor who chose English; these start with nothing chosen.
const nothingChosen = { cookies: [], origins: [] };

// Runs last (file order): it relies on the lead the lead-form spec created and leaves the language as it found it.
test.describe.configure({ mode: 'serial' });

const switchLanguage = async (
    page: Page,
    language: 'Nederlands' | 'English',
) => {
    await page
        .getByRole('button', { name: /Change language|Taal wijzigen/ })
        .click();
    await page
        .getByRole('menu')
        .getByRole('menuitemradio', { name: language })
        .click();
    await expect(page.locator('html')).toHaveAttribute(
        'lang',
        language === 'English' ? 'en' : 'nl',
    );
};

test('a visitor whose browser asks for English still starts in Dutch', async ({
    browser,
}) => {
    const context = await browser.newContext({
        locale: 'en-US',
        storageState: nothingChosen,
    });
    const page = await context.newPage();

    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Welkom terug' }),
    ).toBeVisible();

    await page.goto('/register');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Maak je account aan' }),
    ).toBeVisible();
    await context.close();
});

test('English appears only after the visitor chooses it, and stays', async ({
    browser,
}) => {
    const context = await browser.newContext({
        locale: 'nl-NL',
        storageState: nothingChosen,
    });
    const page = await context.newPage();
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    await switchLanguage(page, 'English');
    await page.goto('/register');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeVisible();
    await context.close();
});

test('the offer form calls it compensation and explains it from the keyboard', async ({
    browser,
}) => {
    const campaign = state().campaigns.find(
        (c) => c.name === seeded.runningCampaign,
    )!;
    const page = await as(browser, 'advertiser');
    await page.goto(`/advertiser/offers/${campaign.id}/index`);
    await page.locator('#name').fill('Tooltip check');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByText('Compensation Settings')).toBeVisible();
    await expect(page.getByText(/commission/i)).toHaveCount(0);

    const tip = page.getByRole('button', { name: 'What is Compensation?' });
    await tip.focus();
    await expect(page.getByRole('tooltip')).toContainText(/agreed result/i);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('a Dutch advertiser reads "vergoeding", never "commissie"', async ({
    browser,
}) => {
    const offer = state().offers.find((o) => o.name === seeded.runningOffer)!;
    const page = await as(browser, 'advertiser');
    await page.goto('/dashboard');
    await switchLanguage(page, 'Nederlands');
    try {
        await page.goto(`/advertiser/offers/${offer.id}/edit`);
        await page
            .getByRole('button', { name: 'Volgende', exact: true })
            .click();
        await expect(page.getByText('Vergoedingsinstellingen')).toBeVisible();
        await expect(page.getByText(/commissie/i)).toHaveCount(0);
    } finally {
        await page.goto('/dashboard');
        await switchLanguage(page, 'English');
    }
});

test('a converted lead is an opened account, in English and in Dutch', async ({
    browser,
}) => {
    const page = await as(browser, 'advertiser');
    await page.goto('/leads');
    await page
        .getByRole('button', { name: /More actions for/ })
        .first()
        .click();
    await page
        .getByRole('menuitem', { name: 'Mark as account opened' })
        .click();
    await expect(
        page.locator('[data-slot="status-badge"]', {
            hasText: 'Account opened',
        }),
    ).toBeVisible();

    await switchLanguage(page, 'Nederlands');
    try {
        await expect(
            page.locator('[data-slot="status-badge"]', {
                hasText: 'Account geopend',
            }),
        ).toBeVisible();
    } finally {
        await switchLanguage(page, 'English');
    }
});

test('a Dutch publisher sees euro amounts in Dutch notation', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/dashboard');
    await switchLanguage(page, 'Nederlands');
    try {
        await page.goto('/publisher/earnings');
        await expect(page.locator('body')).toContainText(/€\s?\d+,\d{2}/);
        await expect(page.locator('body')).not.toContainText(/commissie/i);
        await expect(page.locator('body')).not.toContainText('$');
    } finally {
        await page.goto('/dashboard');
        await switchLanguage(page, 'English');
    }
});
