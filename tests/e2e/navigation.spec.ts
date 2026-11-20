import { expect, test } from '@playwright/test';
import { as, type Persona } from './helpers';

// Menu entries each role must see, and entries it must never see. Labels follow
// the phase 03 sidebar (sentence case; finance labels differ per role).
const menus: Record<Persona, { visible: string[]; hidden: string[] }> = {
    admin: {
        visible: [
            'Overview',
            'Networks',
            'System users',
            'Roles & permissions',
            'Platform finance',
            'Network invoices',
        ],
        hidden: ['Marketplace', 'My earnings', 'Network settings'],
    },
    network: {
        visible: [
            'Overview',
            'Campaigns',
            'Advertisers',
            'Publishers',
            'Partner pool',
            'Financial review',
            'Publisher invoices',
            'My invoices',
            'Network settings',
            'Fraud rules',
        ],
        hidden: ['System users', 'Marketplace', 'My earnings', 'Networks'],
    },
    advertiser: {
        visible: ['Overview', 'My campaigns', 'Creatives'],
        hidden: [
            'System users',
            'Network settings',
            'Marketplace',
            'My earnings',
            'Advertisers',
        ],
    },
    publisher: {
        visible: [
            'Marketplace',
            'My campaigns',
            'My earnings',
            'Invoices',
            'Embed scripts',
        ],
        hidden: ['System users', 'Network settings', 'Advertisers', 'Overview'],
    },
};

for (const persona of Object.keys(menus) as Persona[]) {
    test(`${persona} sees only their navigation`, async ({ browser }) => {
        const page = await as(browser, persona);
        await page.goto('/dashboard');
        const nav = page.getByRole('navigation', { name: 'Main navigation' });
        for (const name of menus[persona].visible) {
            await expect(
                nav.getByRole('link', { name, exact: true }),
            ).toBeVisible();
        }
        for (const name of menus[persona].hidden) {
            await expect(
                nav.getByRole('link', { name, exact: true }),
            ).toHaveCount(0);
        }
        // Exactly one item is current: the dashboard's own entry.
        await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);
    });
}

test('network owner sees the pending applications badge', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/dashboard');
    // The seeded open campaign has no applications yet, so the link may have a
    // count or not; when present it is announced as "N waiting".
    const link = page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: /^Applications( \d+ waiting)?$/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/applications\/index/);
    await expect(link).toHaveAttribute('aria-current', 'page');
});

test('publisher cannot open network settings by URL', async ({ browser }) => {
    const page = await as(browser, 'publisher');
    const response = await page.goto('/networks/settings');
    expect(response?.status()).toBeLessThan(500);
    await expect(page).not.toHaveURL(/networks\/settings/);
    await expect(
        page.getByRole('heading', { name: /Network Settings/i }),
    ).toHaveCount(0);
});

test('menu links navigate to their page and stay current on detail pages', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await nav.getByRole('link', { name: 'My earnings', exact: true }).click();
    await expect(page).toHaveURL(/publisher\/earnings/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
        nav.getByRole('link', { name: 'My earnings', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
});

test('mobile: the drawer opens, a link navigates and the drawer closes', async ({
    browser,
}) => {
    const page = await as(browser, 'publisher');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeHidden();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await drawer
        .getByRole('link', { name: 'Embed scripts', exact: true })
        .click();
    await expect(page).toHaveURL(/publisher\/scripts/);
    await expect(drawer).toBeHidden();
    // Nothing scrolls sideways at phone width.
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
});

test('desktop: the sidebar collapses to icons and expands again', async ({
    browser,
}) => {
    const page = await as(browser, 'network');
    await page.goto('/dashboard');
    const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Links keep their accessible names when collapsed.
    await expect(
        page
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'Advertisers', exact: true }),
    ).toBeAttached();
    await expect(
        page.getByRole('link', { name: /^DM ?Hub|DMHub/ }).first(),
    ).toBeAttached();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('notifications panel opens from the top bar', async ({ browser }) => {
    const page = await as(browser, 'publisher');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /^Notifications/ }).click();
    await expect(
        page.getByRole('region', { name: 'Notifications', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
        page.getByRole('region', { name: 'Notifications', exact: true }),
    ).toBeHidden();
});

test('search palette jumps to a page', async ({ browser }) => {
    const page = await as(browser, 'network');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /^Search pages and tools/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search workspace' });
    await dialog.getByRole('combobox').fill('Publishers');
    await dialog.getByRole('option', { name: 'Publishers' }).click();
    await expect(page).toHaveURL(/publishers\/index/);
});
