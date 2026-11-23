import { expect, type Browser, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Demo accounts created by DatabaseSeeder/UsersSeeder in the disposable e2e database.
// The shared demo password comes from those seeders; it only exists in local/testing data.
export const personas = {
    admin: 'superadmin@dmhub.com',
    network: 'network@dmhub.com',
    advertiser: 'advertiser@dmhub.com',
    publisher: 'publisher@dmhub.com',
} as const;
export type Persona = keyof typeof personas;

/** A visitor who already chose English: the platform itself starts in Dutch. */
export const english = {
    cookies: [
        {
            name: 'locale',
            value: 'en',
            domain: '127.0.0.1',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax' as const,
        },
    ],
    origins: [],
};
export const demoPassword = 'Abcd1234!';

// Seeded by tests/Support/e2e.php.
export const seeded = {
    runningCampaign: 'E2E Running Campaign',
    runningOffer: 'E2E Running Offer',
    openCampaign: 'E2E Open Campaign',
    openOffer: 'E2E Open Offer',
    marketplaceCampaign: 'E2E Marketplace Campaign',
    marketplaceOffer: 'E2E Marketplace Offer',
    reviewCampaign: 'E2E Review Campaign',
    bulkApplicants: ['E2E Bulk One', 'E2E Bulk Two'],
    rejectApplicant: 'E2E Reject Me',
    /** USD campaign with one publisher earning (finance currency switch). */
    dollarCampaign: 'E2E Dollar Campaign',
    /** Super admin whose password and 2FA settings.spec changes. */
    settingsUser: 'settings@dmhub.test',
    /** Network member without a role; admin.spec assigns one. */
    staffUser: 'staff@dmhub.test',
};

type State = {
    campaigns: { id: number; name: string; campaign_status: string }[];
    offers: {
        id: number;
        name: string;
        campaign_id: number;
        offer_status: string;
    }[];
    publisher_campaigns: {
        id: number;
        publisher_id: number;
        campaign_id: number;
        status: string;
    }[];
    publisher_earnings: {
        id: number;
        amount: string;
        currency: string;
        status: string;
        invoice_id: number | null;
    }[];
    publisher_invoices: {
        id: number;
        status: string;
        amount: string;
        currency: string;
    }[];
    users: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        locale: string;
    }[];
};
export const state = (): State =>
    JSON.parse(
        execFileSync('php', ['tests/Support/e2e.php', 'state'], {
            encoding: 'utf8',
        }),
    );

/**
 * A page already signed in as `persona`. The session is created once per run and
 * reused, because the login form is rate limited per email. Never log out of a
 * page from here: that would invalidate the shared session for later tests.
 */
export async function as(browser: Browser, persona: Persona): Promise<Page> {
    const file = `${process.env.E2E_RUN_DIR}/session-${persona}.json`;
    if (!existsSync(file)) {
        const context = await browser.newContext({ storageState: english });
        const page = await context.newPage();
        await login(page, persona);
        await context.storageState({ path: file });
        await context.close();
    }
    const context = await browser.newContext({ storageState: file });
    return context.newPage();
}

export async function login(
    page: Page,
    persona: Persona,
    password = demoPassword,
) {
    await loginWith(page, personas[persona], password);
}

/** Signs in any account through the login form (seeded e2e users). */
export async function loginWith(
    page: Page,
    email: string,
    password = demoPassword,
) {
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await Promise.all([
        page.waitForURL(/dashboard|approval|verify/),
        page
            .getByRole('button', { name: /^(Log in|Sign in|Inloggen)$/ })
            .click(),
    ]);
}

export async function logout(page: Page) {
    await page.getByRole('button', { name: 'Account menu' }).click();
    await Promise.all([
        page.waitForURL(/login/),
        page.getByRole('menuitem', { name: /Log out|Uitloggen/ }).click(),
    ]);
}

/**
 * Walks the campaign wizard: essentials → audience & targeting → budget &
 * terms → check details, then creates the campaign. Returns its id.
 */
export async function createCampaign(page: Page, name: string) {
    await page.goto('/advertiser/campaigns/create');
    const steps = page.getByRole('navigation', {
        name: 'Campaign setup steps',
    });
    await page.getByRole('textbox', { name: 'Campaign name' }).fill(name);
    await page
        .getByRole('textbox', { name: 'Description' })
        .fill('Created by the e2e workflow suite');
    await page.getByRole('button', { name: 'Start date', exact: true }).click();
    await page.getByRole('button', { name: /^Today,/ }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('checkbox', { name: 'Never ending campaign' }).check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(steps.locator('[aria-current="step"]')).toContainText(
        'Audience & targeting',
    );
    await page
        .getByRole('combobox', { name: 'Campaign tags' })
        .fill('E2E season');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(steps.locator('[aria-current="step"]')).toContainText(
        'Budget & terms',
    );
    await page.getByLabel(/^Total budget/).fill('1000');
    await page.getByLabel(/^Daily budget/).fill('100');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(steps.locator('[aria-current="step"]')).toContainText(
        'Check details',
    );
    const review = page.getByRole('main');
    await expect(review).toContainText(name);
    await expect(review).toContainText('E2E season');
    await Promise.all([
        page.waitForURL(/campaigns\/show/),
        page
            .getByRole('button', { name: 'Create campaign', exact: true })
            .click(),
    ]);
    await expect(
        page.getByText('Campaign created successfully.', { exact: true }),
    ).toHaveCount(1);
    return Number(page.url().split('/').at(-1));
}

export async function createOffer(
    page: Page,
    campaignId: number,
    name: string,
) {
    await page.goto(`/advertiser/offers/${campaignId}/index`);
    await page.locator('#name').fill(name);
    await page
        .locator('#description')
        .fill('Offer created by the e2e workflow suite');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('#commission_type_1').click();
    await page
        .getByRole('option', { name: 'Cost Per Submission', exact: true })
        .click();
    await page.locator('#commission_value_1').fill('5');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('#conversion_window_hours').fill('72');
    await page.locator('#click_cookie_lifetime_hours').fill('48');
    await page
        .locator('#preview_url')
        .fill('https://advertiser.example.test/signup');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await Promise.all([
        page.waitForURL(/\/advertiser\/offers\/\d+\/show$/),
        page.getByRole('button', { name: 'Create Offer', exact: true }).click(),
    ]);
    await expect(page.locator('main')).toContainText(name);
}

export async function applyToCampaign(
    page: Page,
    campaignId: number,
    offer: string,
) {
    await page.goto(`/publishers/${campaignId}/campaign/application`);
    await submitApplication(page, offer);
}

/** On a campaign's application page: apply for `offer`, accept the terms, submit. */
export async function submitApplication(page: Page, offer: string) {
    await page
        .getByRole('article')
        .filter({
            has: page.getByRole('heading', { name: offer, exact: true }),
        })
        .getByRole('button', { name: 'Apply to be a partner' })
        .click();
    const dialog = page.getByRole('dialog');
    await dialog
        .getByRole('textbox', { name: 'How will you promote this campaign?' })
        .fill('Newsletter and blog placements');
    const submit = dialog.getByRole('button', {
        name: 'Submit application',
        exact: true,
    });
    await expect(submit).toBeDisabled();
    await dialog.getByRole('checkbox').check();
    await Promise.all([page.waitForURL(/publisher_dashboard/), submit.click()]);
}

/**
 * Approves a pending application from the applications list: opens the review
 * drawer for the publisher's row and approves the offer they requested.
 */
export async function approveApplication(
    page: Page,
    campaignName: string,
    applicant?: string,
) {
    await page.goto('/applications/index');
    let row = page
        .getByRole('region', { name: 'Applications' })
        .getByRole('listitem')
        .filter({ hasText: campaignName });
    if (applicant) row = row.filter({ hasText: applicant });
    await row.getByRole('button', { name: /^Review / }).click();
    const drawer = page.getByRole('dialog', { name: 'Application details' });
    await drawer.getByRole('button', { name: 'Approve publisher' }).click();
    await expect(drawer).toHaveCount(0);
    await expect(row).toHaveCount(0);
}
