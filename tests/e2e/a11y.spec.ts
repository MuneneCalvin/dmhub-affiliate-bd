import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { as, seeded, state, type Persona } from './helpers';

/**
 * Accessibility gate (phase 11). Runs as its own Playwright project after the
 * workflow specs, so it can audit pages that need data those specs create
 * (e.g. the paid invoice from finance.spec). Every pattern is checked in light
 * and dark; serious and critical axe violations fail the test.
 */

type Theme = 'light' | 'dark';

type AuditTarget = {
    name: string;
    /** `null` = signed-out visitor. */
    persona: Persona | null;
    /** A path, a function returning one, or a function that navigates. */
    open: string | ((page: Page) => string | Promise<void>);
};

const campaignId = (name: string) =>
    state().campaigns.find((c) => c.name === name)!.id;
const latestInvoiceId = () => state().publisher_invoices.at(-1)!.id;

const targets: AuditTarget[] = [
    { name: 'login', persona: null, open: '/login' },
    { name: 'register', persona: null, open: '/register' },
    { name: 'network dashboard', persona: 'network', open: '/dashboard' },
    { name: 'advertiser dashboard', persona: 'advertiser', open: '/dashboard' },
    { name: 'admin dashboard', persona: 'admin', open: '/dashboard' },
    { name: 'publisher marketplace', persona: 'publisher', open: '/dashboard' },
    {
        name: 'publisher directory',
        persona: 'network',
        open: '/publishers/index',
    },
    { name: 'applications', persona: 'network', open: '/applications/index' },
    {
        name: 'partner profile',
        persona: 'network',
        open: async (page) => {
            await page.goto('/advertisers/index');
            await page
                .getByRole('link', { name: /^Details for / })
                .first()
                .click();
            await page.waitForURL(/advertisers\/show/);
        },
    },
    {
        name: 'campaign workspace',
        persona: 'advertiser',
        open: () =>
            `/advertiser/campaigns/show/${campaignId(seeded.runningCampaign)}`,
    },
    {
        name: 'campaign wizard',
        persona: 'advertiser',
        open: '/advertiser/campaigns/create',
    },
    {
        name: 'creatives library',
        persona: 'advertiser',
        open: '/advertiser/creatives/index',
    },
    { name: 'embed scripts', persona: 'publisher', open: '/publisher/scripts' },
    {
        name: 'publisher finance',
        persona: 'publisher',
        open: '/publisher/earnings',
    },
    { name: 'publisher invoices', persona: 'network', open: '/admin/invoices' },
    {
        name: 'invoice detail (publisher)',
        persona: 'publisher',
        open: () => `/publisher/invoices/${latestInvoiceId()}`,
    },
    {
        name: 'invoice detail (admin)',
        persona: 'admin',
        open: () => `/admin/invoices/${latestInvoiceId()}`,
    },
    {
        name: 'account settings',
        persona: 'publisher',
        open: '/settings/profile',
    },
    {
        name: 'appearance settings',
        persona: 'network',
        open: '/settings/appearance',
    },
    {
        name: 'roles & permissions',
        persona: 'admin',
        open: '/system/settings/role',
    },
    { name: 'fraud rules', persona: 'network', open: '/finance/fraud' },
];

async function pageFor(
    browser: Browser,
    persona: Persona | null,
    theme: Theme,
): Promise<Page> {
    const page = persona
        ? await as(browser, persona)
        : await (await browser.newContext()).newPage();
    const baseURL = process.env.APP_URL!;
    await page
        .context()
        .addCookies([{ name: 'appearance', value: theme, url: baseURL }]);
    await page.context().addInitScript((value) => {
        window.localStorage.setItem('appearance', value);
    }, theme);
    return page;
}

async function open(page: Page, target: AuditTarget) {
    const destination =
        typeof target.open === 'string' ? target.open : await target.open(page);
    if (typeof destination === 'string') await page.goto(destination);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
}

/** Full axe report per page for reviewers (CI artifact, not compared). */
function saveReport(name: string, theme: Theme, report: unknown) {
    const dir = 'test-results/e2e/a11y';
    mkdirSync(dir, { recursive: true });
    const slug = `${name}-${theme}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    writeFileSync(`${dir}/${slug}.json`, JSON.stringify(report, null, 2));
}

function describeViolations(
    violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
    return violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    }));
}

for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
        for (const target of targets) {
            test(`${target.name} has no serious axe violations`, async ({
                browser,
            }) => {
                const page = await pageFor(browser, target.persona, theme);
                await open(page, target);
                await expect(page.locator('html')).toHaveClass(
                    theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/,
                );
                const results = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                    .analyze();
                saveReport(target.name, theme, results.violations);
                const blocking = results.violations.filter(
                    (v) => v.impact === 'serious' || v.impact === 'critical',
                );
                expect(describeViolations(blocking)).toEqual([]);
                await page.context().close();
            });
        }
    });
}

test.describe('responsive layout', () => {
    // Phone, tablet, laptop, wide desktop (tokens.md: max content 1680px).
    const widths = [375, 768, 1280, 1680];
    for (const target of targets) {
        test(`${target.name} has no horizontal page scroll`, async ({
            browser,
        }) => {
            const page = await pageFor(browser, target.persona, 'light');
            await open(page, target);
            for (const width of widths) {
                await page.setViewportSize({ width, height: 900 });
                await expect
                    .poll(
                        () =>
                            page.evaluate(
                                () =>
                                    document.documentElement.scrollWidth -
                                    document.documentElement.clientWidth,
                            ),
                        { message: `horizontal overflow at ${width}px` },
                    )
                    .toBeLessThanOrEqual(0);
            }
            await page.context().close();
        });
    }
});

test.describe('keyboard-only flows', () => {
    test('campaign wizard moves focus to each step and to invalid fields', async ({
        browser,
    }) => {
        const page = await as(browser, 'advertiser');
        await page.goto('/advertiser/campaigns/create');
        const name = page.getByRole('textbox', { name: 'Campaign name' });
        const continueButton = page.getByRole('button', {
            name: 'Continue',
            exact: true,
        });

        // Continue with an empty step: focus lands on the first invalid field.
        await continueButton.focus();
        await page.keyboard.press('Enter');
        await expect(name).toBeFocused();

        await page.keyboard.type('Keyboard only campaign');
        await page
            .getByRole('textbox', { name: 'Description' })
            .fill('Checked with the keyboard');
        await page
            .getByRole('checkbox', { name: 'Never ending campaign' })
            .focus();
        await page.keyboard.press('Space');
        await page
            .getByRole('button', { name: 'Start date', exact: true })
            .focus();
        await page.keyboard.press('Enter');
        await page.getByRole('button', { name: /^Today,/ }).focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');

        await continueButton.focus();
        await page.keyboard.press('Enter');
        const title = page.locator('#campaign-step-title');
        await expect(title).toHaveText('Audience & targeting');
        await expect(title).toBeFocused();
        await page.context().close();
    });

    test('campaign drawer traps focus and returns it to the trigger', async ({
        browser,
    }) => {
        const page = await as(browser, 'publisher');
        await page.goto('/dashboard');
        const trigger = page
            .getByRole('button', { name: /^View details: / })
            .first();
        await trigger.focus();
        await page.keyboard.press('Enter');
        const sheet = page.getByRole('dialog');
        await expect(sheet).toBeVisible();
        await expectFocusTrapped(page, sheet);
        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();
        await expect(trigger).toBeFocused();
        await page.context().close();
    });

    test('form dialog traps focus and returns it to the trigger', async ({
        browser,
    }) => {
        const page = await as(browser, 'network');
        await page.goto('/advertisers/index');
        const trigger = page.getByRole('button', { name: 'Add advertiser' });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expectFocusTrapped(page, dialog);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
        await page.context().close();
    });
});

async function expectFocusTrapped(
    page: Page,
    container: ReturnType<Page['getByRole']>,
) {
    await expect
        .poll(() =>
            container.evaluate((el) => el.contains(document.activeElement)),
        )
        .toBe(true);
    for (let i = 0; i < 25; i++) {
        await page.keyboard.press('Tab');
        expect(
            await container.evaluate((el) =>
                el.contains(document.activeElement),
            ),
        ).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift+Tab');
        expect(
            await container.evaluate((el) =>
                el.contains(document.activeElement),
            ),
        ).toBe(true);
    }
}
