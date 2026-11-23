import { expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const app = process.env.APP_URL!;
export const merchant = process.env.LIFECYCLE_MERCHANT_URL!;
export const password = 'BrowserQA2026!';
export const advertiserEmail = 'lifecycle.advertiser@example.test';
export const promoterEmail = 'lifecycle.promoter@example.test';

type State = {
    users: {
        id: number;
        email: string;
        status: string;
        locale: string;
        email_verified_at: string | null;
    }[];
    advertisers: {
        id: number;
        user_id: number;
        status: string;
        available_budget: string;
    }[];
    publishers: { id: number; user_id: number; network_id: number | null }[];
    campaigns: { id: number; name: string; spent_amount: string }[];
    offers: { id: number; name: string; campaign_id: number }[];
    publisher_campaigns: {
        id: number;
        publisher_id: number;
        campaign_id: number;
        tracking_link: string;
        status: string;
    }[];
    clicks: { id: number; referral_id: string; publisher_id: number }[];
    conversions: { id: number; status: string; sale_amount: string }[];
    conversion_events: { id: number; event_type: string }[];
    publisher_earnings: {
        id: number;
        publisher_id: number;
        amount: string;
        currency: string;
        status: string;
    }[];
    reconciliation_issues: unknown[];
};
export function fixture(...args: string[]) {
    return execFileSync('php', ['tests/Support/lifecycle.php', ...args], {
        encoding: 'utf8',
    });
}
export const state = (): State => JSON.parse(fixture('state'));

export async function login(
    page: Page,
    email: string,
    chosenPassword = password,
) {
    await page.goto(`${app}/login`);
    await page.locator('[name=email]').fill(email);
    await page.locator('[name=password]').fill(chosenPassword);
    await Promise.all([
        page.waitForURL(/dashboard|approval|verify/),
        page.locator('button[type=submit]').click(),
    ]);
}

export async function fillRegistration(
    page: Page,
    role: string,
    email: string,
    coc: string,
) {
    // Phase 04 register: account type → company/website → your details.
    await page.goto(`${app}/register`);
    const advertiser = role === 'advertiser';
    await page
        .getByRole('radio', { name: advertiser ? 'Advertiser' : 'Publisher' })
        .check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
        .getByLabel(advertiser ? /^Company name/ : /^Business name/)
        .fill(`Lifecycle ${role}`);
    await page.getByLabel(/^Website URL/).fill(merchant);
    await page.getByLabel(/^Industry/).fill('Retail');
    await page.getByLabel(/^Chamber of Commerce number/).fill(coc);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel(/^First name/).fill('Lifecycle');
    await page.getByLabel(/^Last name/).fill(role);
    await page.getByLabel(/^Work email/).fill(email);
}

export async function register(
    page: Page,
    role: string,
    email: string,
    coc: string,
) {
    await fillRegistration(page, role, email, coc);
    await Promise.all([
        page.waitForURL(/dashboard|approval|verify/),
        page
            .getByRole('button', {
                name: /^Create account$|^Account aanmaken$/,
            })
            .click(),
    ]);
    const user = state().users.find((u) => u.email === email)!;
    expect(user.status).toBe('P');
    expect(user.locale, 'B12: retain the English registration locale').toBe(
        'en',
    );
    const mail = readFileSync(
        `${process.env.LARAVEL_STORAGE_PATH}/logs/laravel.log`,
        'utf8',
    )
        .replace(/=\r?\n/g, '')
        .replace(/=3D/gi, '=');
    const links = [
        ...mail.matchAll(
            /http:\/\/127\.0\.0\.1:\d+\/(?:reset-password|email\/verify)[^\s"<>]*/g,
        ),
    ].map((m) => m[0].replaceAll('&amp;', '&'));
    const verify = links.find((link) =>
        link.includes(`/email/verify/${user.id}/`),
    );
    const setup = links.find(
        (link) =>
            link.includes('/reset-password/') &&
            new URL(link).searchParams.get('email') === email,
    );
    // One email per sign-up: the password link is also the address confirmation.
    expect(verify, 'No separate verification mail is sent').toBeUndefined();
    expect(setup, 'Password setup email was generated').toBeTruthy();
    // Still signed in from registering: opening the link must show the reset form, not bounce away.
    await page.goto(setup!);
    await page.locator('#password').fill(password);
    await page.locator('#password_confirmation').fill(password);
    await Promise.all([
        page.waitForURL(/login/),
        page.locator('button[type=submit]').click(),
    ]);
    expect(
        state().users.find((u) => u.id === user.id)?.email_verified_at,
        'Choosing a password confirms the address',
    ).toBeTruthy();
    await login(page, email);
}

export async function approveAccount(
    operator: Page,
    role: 'advertisers' | 'publishers',
    email: string,
) {
    await operator.goto(`${app}/networks/pool/${role}`);
    const row = operator.getByRole('row').filter({ hasText: email });
    if (role === 'advertisers') {
        expect(
            await row.innerText(),
            'B13: unapproved advertiser must not be labelled Active',
        ).toMatch(/\b(?:Pending|Awaiting approval)\b/);
    }
    await row.getByRole('link', { name: /^Details for / }).click();
    await operator
        .getByRole('button', { name: 'Approve & Add to Network' })
        .click();
    await operator
        .getByRole('button', { name: 'Approve', exact: true })
        .click();
    await expect
        .poll(() => state().users.find((u) => u.email === email)?.status)
        .toBe('A');
}

export async function english(page: Page) {
    await page.goto(`${app}/dashboard`);
    const language = page.getByRole('button', { name: 'Change language' });
    if (!(await language.innerText()).includes('English')) {
        await language.click();
        await page
            .getByRole('menu')
            .getByText('English', { exact: true })
            .click();
        await expect(language).toContainText('English');
        await page.waitForLoadState('networkidle');
    }
}

/** Wizard (phase 07): fills the essentials step and continues to step 2. */
export async function campaignStepTwo(page: Page, name: string) {
    await page.goto(`${app}/advertiser/campaigns/create`);
    await page.locator('#name').fill(name);
    await page
        .locator('#description')
        .fill('Synthetic deployment lifecycle test');
    await page.getByRole('button', { name: 'Start date', exact: true }).click();
    await page.getByRole('button', { name: /^Today,/ }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('checkbox', { name: 'Never ending campaign' }).check();
    await page.locator('#currency').click();
    await page.getByRole('option', { name: /^USD · / }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

/** From step 2 to the budget step, with the lifecycle budget filled in. */
export async function campaignBudget(page: Page) {
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel(/^Total budget/).fill('1000');
    await page.getByLabel(/^Daily budget/).fill('100');
}

export async function expectCampaignSchedule(page: Page) {
    const expected = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date());
    await expect(
        page.getByText(`${expected} – No end date`, { exact: true }),
        'Campaign schedule shows the selected start date and open-ended duration',
    ).toBeVisible();
}

export async function createCampaign(page: Page, name: string) {
    await campaignStepTwo(page, name);
    await campaignBudget(page);
    // B03 regression: optional ROI is deliberately left blank.
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await Promise.all([
        page.waitForURL(/campaigns\/show/),
        page
            .getByRole('button', { name: 'Create campaign', exact: true })
            .click(),
    ]);
    const id = Number(page.url().split('/').at(-1));
    await expectCampaignSchedule(page);
    await expect(
        page.getByText('Campaign created successfully.', { exact: true }),
    ).toHaveCount(1);
    return id;
}

export async function createOffer(
    page: Page,
    campaignId: number,
    name: string,
    kind: 'submission' | 'purchase',
) {
    await page.goto(`${app}/advertiser/offers/${campaignId}/index`);
    await page.locator('#name').fill(name);
    await page.locator('#description').fill('Synthetic deployment offer');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('#commission_type_1').click();
    await page
        .getByRole('option', {
            name:
                kind === 'submission' ? 'Cost Per Submission' : 'Cost Per Sale',
            exact: true,
        })
        .click();
    await page
        .locator('#commission_value_1')
        .fill(kind === 'submission' ? '5' : '10');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('#conversion_window_hours').fill('72');
    await page.locator('#click_cookie_lifetime_hours').fill('48');
    await page
        .locator('#preview_url')
        .fill(
            `${merchant}/${kind === 'submission' ? 'submission' : 'checkout'}`,
        );
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const [response] = await Promise.all([
        page.waitForResponse(
            (r) =>
                r.request().method() === 'POST' &&
                r.url().endsWith(`/offers/${campaignId}/create`),
        ),
        page.getByRole('button', { name: 'Create Offer', exact: true }).click(),
    ]);
    expect(
        response.status(),
        'Offer creation must succeed for this role',
    ).toBeLessThan(400);
    await page.waitForURL(/\/advertiser\/offers\/\d+\/show$/);
    await expect(page.locator('main')).toContainText(name);
    expect(
        (await page.reload())!.status(),
        'B05: saved offer destination is authorized',
    ).toBe(200);
    return response.status();
}

export async function apply(page: Page, campaignId: number, offer: string) {
    await page.goto(`${app}/publishers/${campaignId}/campaign/application`);
    await page
        .getByRole('article')
        .filter({
            has: page.getByRole('heading', { name: offer, exact: true }),
        })
        .getByRole('button', { name: 'Apply to be a partner' })
        .click();
    const application = page.getByRole('dialog');
    await expect(application.getByRole('combobox')).toHaveText(offer);
    await application
        .getByRole('textbox', { name: 'How will you promote this campaign?' })
        .fill('Synthetic deployment campaign application');
    const submit = application.getByRole('button', {
        name: 'Submit application',
        exact: true,
    });
    await expect(submit).toBeDisabled();
    await application.getByRole('checkbox').check();
    await Promise.all([page.waitForURL(/publisher_dashboard/), submit.click()]);
}

export async function approveApplication(
    operator: Page,
    email: string,
    campaignName: string,
) {
    // Phase 06: list items open a review drawer; the full application page
    // keeps the offer choice with its commission.
    await operator.goto(`${app}/applications/index`);
    await operator
        .getByRole('region', { name: 'Applications' })
        .getByRole('listitem')
        .filter({ hasText: campaignName })
        .getByRole('button', { name: /^Review / })
        .first()
        .click();
    const drawer = operator.getByRole('dialog', {
        name: 'Application details',
    });
    await expect(drawer).toContainText(email);
    await drawer.getByRole('link', { name: 'Open full application' }).click();
    await operator.waitForURL(/applications\/show/);
    const selectedOffer = operator
        .getByRole('radiogroup', { name: 'Select offer' })
        .getByRole('radio', { checked: true });
    await expect(
        selectedOffer,
        'B08: commission includes the correct currency or percentage',
    ).toHaveAccessibleDescription(
        new RegExp(campaignName.includes('Checkout') ? '10%' : '\\$5\\.00'),
    );
    await operator
        .getByRole('button', { name: 'Approve & Assign Offer', exact: true })
        .click();
    await operator
        .getByRole('button', { name: 'Approve', exact: true })
        .click();
    await operator.waitForLoadState('networkidle');
    await expect(
        operator.getByRole('button', {
            name: 'Approve & Assign Offer',
            exact: true,
        }),
    ).toHaveCount(0);
}

export async function merchantAction(
    page: Page,
    button: string,
    endpoint: string,
) {
    // The merchant page attaches its click handlers after the SDK script loads; on a slow
    // runner an early click is lost and the response never arrives.
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    if (button === 'Submit enquiry')
        await page.waitForFunction(() => performance.now() >= 1100);
    const [response] = await Promise.all([
        page.waitForResponse(
            (r) =>
                r.request().method() === 'POST' &&
                new URL(r.url()).pathname === endpoint,
        ),
        page.getByRole('button', { name: button, exact: true }).click(),
    ]);
    expect(response.status(), `HTTP status from ${endpoint}`).toBeLessThan(400);
    const result = await response.json();
    await expect(page.getByRole('status')).toContainText(
        JSON.stringify(result, null, 2),
    );
    return result;
}
