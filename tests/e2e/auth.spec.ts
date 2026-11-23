import { expect, test } from '@playwright/test';
import {
    as,
    demoPassword,
    login,
    logout,
    personas,
    state,
    type Persona,
} from './helpers';

const landing: Record<Persona, { url: RegExp; heading: string }> = {
    admin: { url: /admin_dashboard|dashboard/, heading: 'Platform overview' },
    network: { url: /network\/dashboard/, heading: 'Network overview' },
    advertiser: {
        url: /advertiser_dashboard|dashboard/,
        heading: 'Advertiser dashboard',
    },
    publisher: {
        url: /publisher_dashboard\/dashboard/,
        heading: 'Campaign marketplace',
    },
};

for (const persona of Object.keys(landing) as Persona[]) {
    test(`${persona} signs in to their dashboard and signs out`, async ({
        page,
    }) => {
        await login(page, persona);
        await expect(page).toHaveURL(landing[persona].url);
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: landing[persona].heading,
            }),
        ).toBeVisible();
        await logout(page);
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/login/);
    });
}

test('wrong password shows an error and stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill(personas.publisher);
    await page.getByLabel(/^Password/).fill('not-the-password');
    await page.getByRole('button', { name: /^(Log in|Sign in)$/ }).click();
    await expect(
        page.getByText(/credentials do not match|onjuist/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/login/);
});

test('guests are sent to login', async ({ page }) => {
    await page.goto('/publisher/earnings');
    await expect(page).toHaveURL(/login/);
});

test('forgot password sends a reset link and shows the status', async ({
    page,
}) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'Forgot your password?' }),
    ).toBeVisible();
    await page.getByLabel('Email address').fill(personas.advertiser);
    await page
        .getByRole('button', { name: 'Email password reset link' })
        .click();
    await expect(page.getByRole('alert')).toContainText(
        /emailed your password reset link|wachtwoord/i,
    );
    await page.getByRole('link', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/login/);
});

test('show password reveals what was typed', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel(/^Password/);
    await password.fill('secret-value');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
});

test('registering as a publisher lands on the waiting-approval page', async ({
    page,
}) => {
    const stamp = Date.now().toString().slice(-8);
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'Create your account' }),
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Publisher' })).toBeChecked();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Business name').fill(`E2E Media ${stamp}`);
    await page.getByRole('checkbox', { name: 'Website or blog' }).check();
    await page
        .getByLabel('Website or blog: URL or account name')
        .fill('https://e2e-media.example.test');
    await page.getByLabel('Industry').fill('Media');
    await page
        .getByLabel('Chamber of Commerce number')
        .fill(`E2E${stamp}`.slice(0, 10));
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('First name').fill('Erin');
    await page.getByLabel('Last name').fill('Tester');
    await page
        .getByLabel('Work email')
        .fill(`e2e.publisher.${stamp}@example.test`);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
        page.getByRole('heading', {
            level: 1,
            name: 'Your account is under review',
        }),
    ).toBeVisible();
    await expect(page.getByText('Pending approval')).toBeVisible();
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    await expect(page).toHaveURL(/login/);
});

test('an unverified account is asked to verify its email', async ({ page }) => {
    // New accounts start in the app's default locale (Dutch), so match both.
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill('unverified@dmhub.test');
    await page.getByLabel(/^Password/).fill(demoPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: /^(Check your inbox|Controleer je inbox)$/,
        }),
    ).toBeVisible();
    await expect(page.getByText(/unverified@dmhub\.test/)).toBeVisible();
    await page
        .getByRole('button', {
            name: /^(Resend email|E-mail opnieuw versturen)$/,
        })
        .click();
    await expect(page.getByRole('alert')).toContainText(
        /new verification link|nieuwe verificatielink/,
    );
    await page.getByRole('button', { name: /^(Log out|Uitloggen)$/ }).click();
    await expect(page).toHaveURL(/login/);
});

test('a forbidden page shows 403 with a way back', async ({ browser }) => {
    const page = await as(browser, 'network');
    const campaign = state().campaigns.find(
        (c) => c.name === 'E2E Running Campaign',
    );
    expect(campaign).toBeDefined();
    const response = await page.goto(
        `/advertiser/campaigns/edit/${campaign!.id}`,
    );
    expect(response?.status()).toBe(403);
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: "You don't have access to this page",
        }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Back to overview' }).click();
    await expect(
        page.getByRole('heading', { level: 1, name: 'Network overview' }),
    ).toBeVisible();
});
