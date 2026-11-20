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
    await page.goto(`${app}/register`);
    await page.getByRole('tab', { name: role, exact: true }).click();
    for (const [name, value] of Object.entries({
        business_name: `Lifecycle ${role}`,
        website_name: merchant,
        industry: 'Retail',
        coc_number: coc,
    })) {
        const labels: Record<string, string> = {
            business_name: 'Business Name',
            website_name: 'Website URL',
            industry: 'Industry',
            coc_number: 'Chamber Of Commerce Number',
            first_name: 'First Name',
            last_name: 'Last Name',
            email: 'Email Address',
        };
        await page.getByLabel(labels[name], { exact: true }).fill(value);
    }
    await page.getByRole('button', { name: /Next|Volgende/ }).click();
    for (const [name, value] of Object.entries({
        first_name: 'Lifecycle',
        last_name: role,
        email,
    })) {
        const labels: Record<string, string> = {
            business_name: 'Business Name',
            website_name: 'Website URL',
            industry: 'Industry',
            coc_number: 'Chamber Of Commerce Number',
            first_name: 'First Name',
            last_name: 'Last Name',
            email: 'Email Address',
        };
        await page.getByLabel(labels[name], { exact: true }).fill(value);
    }
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
        page.getByRole('button', { name: /^Submit$|^Verzenden$/ }).click(),
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
    expect(verify, 'Verification email was generated').toBeTruthy();
    expect(setup, 'Password setup email was generated').toBeTruthy();
    await page.goto(verify!);
    expect(
        state().users.find((u) => u.id === user.id)?.email_verified_at,
    ).toBeTruthy();
    await page
        .getByRole('button', { name: /Terug naar inloggen|Go Back To Login/ })
        .click();
    await page.waitForURL(/login/);
    await page.goto(setup!);
    await page.locator('#password').fill(password);
    await page.locator('#password_confirmation').fill(password);
    await Promise.all([
        page.waitForURL(/login/),
        page.locator('button[type=submit]').click(),
    ]);
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
        ).toMatch(/\bPending\b/);
    }
    await row.getByRole('link', { name: /View overview/ }).click();
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

export async function campaignStepTwo(page: Page, name: string) {
    await page.goto(`${app}/advertiser/campaigns/create`);
    await page.locator('#name').fill(name);
    await page
        .locator('#description')
        .fill('Synthetic deployment lifecycle test');
    await page
        .getByRole('button', { name: 'Start Date *', exact: true })
        .click();
    await page.getByRole('button', { name: /^Today,/ }).click();
    await page.keyboard.press('Escape');
    await page.locator('#no_end_date').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('#total_budget').fill('1000');
    await page.locator('#daily_budget').fill('100');
    await page.locator('#currency').click();
    await page
        .getByRole('option', {
            name: 'USD - United States Dollar',
            exact: true,
        })
        .click();
}

export async function expectCampaignSchedule(page: Page) {
    const expected = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date());
    await expect(
        page.locator('.campaign-meta'),
        'Campaign schedule shows the selected start date and open-ended duration',
    ).toContainText(`${expected} – No end date`);
}

export async function createCampaign(page: Page, name: string) {
    await campaignStepTwo(page, name);
    // B03 regression: optional ROI is deliberately left blank.
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await Promise.all([
        page.waitForURL(/campaigns\/show/),
        page
            .getByRole('button', { name: 'Create Campaign', exact: true })
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
    await expect(
        application.getByRole('combobox').locator('option:checked'),
    ).toHaveText(offer);
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
    await operator.goto(`${app}/applications/index`);
    await operator
        .getByRole('row')
        .filter({ hasText: email })
        .filter({ hasText: campaignName })
        .getByRole('link', { name: /View overview/ })
        .click();
    await operator.waitForURL(/applications\/show/);
    const selectedOffer = operator.getByRole('combobox');
    await expect(
        selectedOffer,
        'B08: commission includes the correct currency or percentage',
    ).toContainText(campaignName.includes('Checkout') ? '10%' : '$5.00');
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
