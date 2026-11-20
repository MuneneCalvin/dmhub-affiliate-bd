import { chromium, expect } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

if (existsSync('bootstrap/cache/config.php'))
    throw new Error(
        'Clear cached configuration before isolated browser testing.',
    );
if (!existsSync('public/build/manifest.json'))
    throw new Error('Run npm run build first.');
const directory = mkdtempSync(resolve(tmpdir(), 'dmhub-fraud-'));
for (const path of [
    'framework/cache/data',
    'framework/sessions',
    'framework/views',
    'logs',
    'app/public',
])
    mkdirSync(`${directory}/storage/${path}`, { recursive: true });
writeFileSync(`${directory}/database.sqlite`, '');
const port = await new Promise((accept) => {
    const socket = createServer();
    socket.listen(0, '127.0.0.1', () => {
        const port = socket.address().port;
        socket.close(() => accept(port));
    });
});
const base = `http://127.0.0.1:${port}`;
const env = {
    ...process.env,
    APP_ENV: 'testing',
    APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
    APP_URL: base,
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: `${directory}/database.sqlite`,
    DB_URL: '',
    CACHE_STORE: 'array',
    SESSION_DRIVER: 'file',
    SESSION_DOMAIN: 'null',
    SESSION_SECURE_COOKIE: 'false',
    SESSION_COOKIE: 'dmhub_fraud_browser',
    APP_FORCE_HTTPS: 'false',
    LOG_CHANNEL: 'single',
    QUEUE_CONNECTION: 'database',
    MAIL_MAILER: 'array',
    LIFECYCLE_RUN_DIR: directory,
    LARAVEL_STORAGE_PATH: `${directory}/storage`,
    VIEW_COMPILED_PATH: `${directory}/storage/framework/views`,
    APP_DEBUG: 'false',
};
const php = (...args) => execFileSync('php', args, { env, encoding: 'utf8' });
let server;
let browser;
let page;
let success = false;
try {
    php('artisan', 'migrate', '--force');
    const fixture = JSON.parse(
        php('tests/Support/fraud-browser-fixture.php', 'seed'),
    );
    server = spawn(
        'php',
        [
            '-S',
            `127.0.0.1:${port}`,
            '-t',
            'public',
            'tests/Support/lifecycle-server.php',
        ],
        { env, stdio: 'ignore' },
    );
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(`${base}/up`)).ok) {
                ready = true;
                break;
            }
        } catch {
            // Server not accepting connections yet; retry.
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready) throw new Error('Test server did not start.');
    browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
            : {}),
    });
    page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        locale: 'en-US',
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page.locator('[name=email]').fill('fraud-operator@example.test');
    await page.locator('[name=password]').fill('FraudBrowser2026!');
    await Promise.all([
        page.waitForURL(/dashboard/),
        page.locator('button[type=submit]').click(),
    ]);
    const url = `${base}/finance/fraud?network_id=${fixture.network_id}`;
    // Phase 10 layout: one card per rule with an on/off switch and a
    // Monitor / Enforce segmented control; history is its own region.
    const rule = (name) => page.getByRole('article', { name, exact: true });
    const ruleSwitch = (name) =>
        rule(name).getByRole('switch', { name, exact: true });
    const modeButton = (name, mode) =>
        rule(name).getByRole('button', { name: mode, exact: true });
    const setRuleMode = async (name, mode) => {
        const on =
            (await ruleSwitch(name).getAttribute('aria-checked')) === 'true';
        if (mode === 'Off') {
            if (on) await ruleSwitch(name).click();
            await expect(ruleSwitch(name)).toHaveAttribute(
                'aria-checked',
                'false',
            );
            return;
        }
        if (!on) await ruleSwitch(name).click();
        await modeButton(name, mode).click();
        await expect(modeButton(name, mode)).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    };
    const expectRuleMode = async (name, mode) =>
        mode === 'Off'
            ? expect(ruleSwitch(name)).toHaveAttribute('aria-checked', 'false')
            : expect(modeButton(name, mode)).toHaveAttribute(
                  'aria-pressed',
                  'true',
              );
    const history = page.getByRole('region', { name: 'Policy history' });
    const savePolicy = async (reason) => {
        await page.getByLabel('Reason for policy change').fill(reason);
        await page.getByRole('button', { name: 'Save as new version' }).click();
        await expect(history.getByRole('listitem').first()).toContainText(
            reason,
        );
    };
    await page.goto(url);
    await expect(
        page.getByRole('heading', { level: 1, name: 'Fraud rules' }),
    ).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(9);
    await setRuleMode('Filled honeypot', 'Off');
    await savePolicy('Disable noisy honeypot during testing');
    await expect(history.getByRole('listitem').first()).toContainText('v1');
    await page.reload();
    await expectRuleMode('Filled honeypot', 'Off');
    await setRuleMode('Filled honeypot', 'Enforce');
    await savePolicy('Enforce tested honeypot rule');
    await expect(history.getByRole('listitem').first()).toContainText('v2');
    php('tests/Support/fraud-browser-fixture.php', 'assess');
    await page.reload();
    const preview = page.getByRole('region', { name: 'Preview results' });
    await preview.getByRole('button', { name: 'Run preview' }).click();
    await expect(preview.getByText('Assessments compared')).toBeVisible();
    await page.goto(`${url}&campaign_id=${fixture.campaign_id}`);
    await expect(
        page.getByLabel('Override network approval settings'),
    ).not.toBeChecked();
    await expect(ruleSwitch('Filled honeypot')).toBeDisabled();
    await rule('Filled honeypot')
        .getByRole('checkbox', { name: 'Override network rule' })
        .check();
    await setRuleMode('Filled honeypot', 'Off');
    await savePolicy('Campaign exception');
    await page.reload();
    await expectRuleMode('Filled honeypot', 'Off');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${directory}/rules-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${directory}/rules-mobile.png` });
    if (
        await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
    )
        throw new Error('Mobile page overflows horizontally.');
    await page.goto(`${base}/finance/earnings/${fixture.earning_id}/fraud`);
    await expect(
        page.getByRole('heading', { name: 'Record the verified outcome' }),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Outcome', exact: true }).click();
    await page
        .getByRole('option', { name: 'Confirmed legitimate', exact: true })
        .click();
    await page
        .getByLabel('Evidence or reason')
        .fill('Verified during rule testing');
    await page.getByRole('button', { name: 'Record outcome' }).click();
    await expect(
        page.getByText('Verified during rule testing', { exact: true }),
    ).toBeVisible();
    await page.goto(`${base}/finance`);
    await expect(
        page.getByRole('link', { name: 'Manage fraud rules' }),
    ).toBeVisible();
    await page.getByLabel('Fraud checks', { exact: true }).click();
    await page.getByRole('option', { name: 'Needs manual review' }).click();
    await expect(
        page.getByRole('cell', { name: /^submission:merchant-1/ }),
    ).toBeVisible();
    if (errors.length) throw new Error(errors.join('\n'));
    success = true;
    console.log(`Fraud browser checks passed. Screenshots: ${directory}`);
} catch (error) {
    if (page) {
        await page.screenshot({ path: `${directory}/failure.png` });
        writeFileSync(`${directory}/failure.html`, await page.content());
        console.error(`Failed at ${page.url()}`);
    }
    throw error;
} finally {
    await browser?.close();
    server?.kill('SIGTERM');
    rmSync(`${directory}/database.sqlite`, { force: true });
    if (success)
        rmSync(`${directory}/storage`, { recursive: true, force: true });
    else console.error(`Failure evidence: ${directory}`);
}
