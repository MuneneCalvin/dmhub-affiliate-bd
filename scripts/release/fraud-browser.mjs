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
    const rule = (name) =>
        page.locator('article').filter({
            has: page.getByRole('heading', { name, exact: true }),
        });
    const ruleMode = (name, mode) =>
        rule(name).getByRole('radio', { name: mode, exact: true });
    const setRuleMode = (name, mode) =>
        rule(name).getByText(mode, { exact: true }).click();
    const openHistory = () =>
        page.getByRole('tab', { name: /^History/ }).click();
    const savePolicy = async () => {
        await page
            .getByRole('button', { name: 'Save new policy version' })
            .click();
        // A new policy version remounts the editor and resets its selected tab.
        // Wait for that refresh before opening History.
        await expect(page.getByLabel('Reason for policy change')).toHaveValue(
            '',
        );
    };
    await page.goto(url);
    await expect(
        page.getByRole('heading', { name: 'Fraud rules', exact: true }),
    ).toBeVisible();
    await expect(page.locator('article')).toHaveCount(9);
    await setRuleMode('Filled honeypot', 'Off');
    await page
        .getByLabel('Reason for policy change')
        .fill('Disable noisy honeypot during testing');
    await savePolicy();
    await openHistory();
    await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
    await page.reload();
    await expect(ruleMode('Filled honeypot', 'Off')).toBeChecked();
    await setRuleMode('Filled honeypot', 'Enforce');
    await expect(ruleMode('Filled honeypot', 'Enforce')).toBeChecked();
    await page
        .getByLabel('Reason for policy change')
        .fill('Enforce tested honeypot rule');
    await savePolicy();
    await openHistory();
    await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
    php('tests/Support/fraud-browser-fixture.php', 'assess');
    await page.reload();
    await page
        .getByRole('button', { name: 'Preview on recorded assessments' })
        .click();
    await expect(
        page.getByRole('heading', { name: 'Preview results' }),
    ).toBeVisible();
    await page.goto(`${url}&campaign_id=${fixture.campaign_id}`);
    await expect(
        page.getByLabel('Override network approval settings'),
    ).not.toBeChecked();
    await expect(ruleMode('Filled honeypot', 'Off')).toBeDisabled();
    await rule('Filled honeypot').getByLabel('Override network rule').check();
    await setRuleMode('Filled honeypot', 'Off');
    await page
        .getByLabel('Reason for policy change')
        .fill('Campaign exception');
    await savePolicy();
    await openHistory();
    await expect(
        page.getByText('Campaign exception', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(ruleMode('Filled honeypot', 'Off')).toBeChecked();
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
    await page
        .getByLabel('Outcome', { exact: true })
        .selectOption('legitimate');
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
