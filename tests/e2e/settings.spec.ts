import { expect, test } from '@playwright/test';
import { as, loginWith, logout, seeded, state } from './helpers';

test('user updates their profile', async ({ browser }) => {
    const page = await as(browser, 'advertiser');
    await page.goto('/settings/profile');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Account settings' }),
    ).toBeVisible();
    await expect(
        page
            .getByRole('navigation', { name: 'Settings sections' })
            .getByRole('link', { name: 'Profile' }),
    ).toHaveAttribute('aria-current', 'page');

    const profile = page.getByRole('region', { name: 'Profile' });
    await profile.getByLabel('First name').fill('Taylor');
    await profile.getByRole('button', { name: 'Save changes' }).click();
    await expect(profile.getByRole('status')).toHaveText('Saved');
    expect(
        state().users.find((u) => u.email === 'advertiser@dmhub.com')
            ?.first_name,
    ).toBe('Taylor');
});

test('two-factor setup shows the QR code and setup key', async ({ page }) => {
    await loginWith(page, seeded.settingsUser);
    await page.goto('/settings/two-factor');
    // The page asks for the password first (Fortify confirmPassword).
    if (page.url().includes('confirm-password')) {
        await page.getByLabel(/^Password/).fill('Abcd1234!');
        await page.getByRole('button', { name: 'Confirm password' }).click();
    }
    const status = page.getByRole('region', {
        name: 'Two-factor authentication',
    });
    await expect(status).toContainText('Disabled');
    await status.getByRole('button', { name: 'Enable two-factor' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByRole('heading', {
            name: 'Enable two-factor authentication',
        }),
    ).toBeVisible();
    await expect(
        dialog.getByRole('img', { name: 'QR code for your authenticator app' }),
    ).toBeVisible();
    await expect(dialog.getByText('Setup key', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Continue' }).click();
    await expect(dialog.getByLabel('Authentication code')).toBeVisible();
    // No real device: stop before confirming a code.
    await dialog.getByRole('button', { name: 'Close' }).click();
    await logout(page);
});

test('user changes their password and signs in with it', async ({ page }) => {
    await loginWith(page, seeded.settingsUser);
    await page.goto('/settings/password');
    const card = page.getByRole('region', { name: 'Password' });
    await card.getByLabel('Current password').fill('Abcd1234!');
    await card.getByLabel('New password').fill('Changed5678!');
    await card.getByLabel('Confirm password').fill('Changed5678!');
    await card.getByRole('button', { name: 'Save password' }).click();
    await expect(card.getByRole('status')).toHaveText('Password updated');

    await logout(page);
    await loginWith(page, seeded.settingsUser, 'Changed5678!');
    await expect(page).toHaveURL(/dashboard/);
});

test('theme and language persist after reload', async ({ browser }) => {
    const page = await as(browser, 'publisher');
    await page.goto('/settings/appearance');
    const theme = page.getByRole('radiogroup', { name: 'Theme' });
    await theme.getByRole('radio', { name: 'Dark' }).check();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page
        .getByRole('group', { name: 'Language' })
        .getByRole('button', { name: 'Nederlands' })
        .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(
        page.getByRole('radiogroup', { name: 'Thema' }).getByRole('radio', {
            name: 'Donker',
        }),
    ).toBeChecked();

    await page
        .getByRole('group', { name: 'Taal' })
        .getByRole('button', { name: 'English' })
        .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page
        .getByRole('radiogroup', { name: 'Theme' })
        .getByRole('radio', { name: 'Light' })
        .check();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
});

// The top bar menu names each language in its own language (phase 03).
test('language switches to Dutch and back from the top bar', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/dashboard');
    await page
        .getByRole('button', { name: /Change language|Taal wijzigen/ })
        .click();
    await page
        .getByRole('menu')
        .getByRole('menuitemradio', { name: 'Nederlands' })
        .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await page
        .getByRole('button', { name: /Change language|Taal wijzigen/ })
        .click();
    await page
        .getByRole('menu')
        .getByRole('menuitemradio', { name: 'English' })
        .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
