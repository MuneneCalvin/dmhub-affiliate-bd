// Simulates real visitors with a real browser: each visitor follows a publisher's tracking link (a click),
// lands on the demo form and, some of the time, submits it (a lead and a conversion).
//
//   node scripts/demo/simulate-traffic.mjs --base https://affiliates-bnd.dmhub.cloud --links links.json
//        [--clicks 6] [--submit 0.5] [--seed 7] [--pause 2200]
//
// links.json is the output of `php artisan demo:bnd --json`. Nothing here touches the database directly:
// every click and lead goes through the public pages, exactly as a visitor's would.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i === -1 ? fallback : process.argv[i + 1];
};
const base = arg('base');
const links = JSON.parse(readFileSync(arg('links'), 'utf8'));
const clicksPerLink = Number(arg('clicks', 6));
const submitShare = Number(arg('submit', 0.5));
const pause = Number(arg('pause', 2200)); // the lead endpoint allows 30 submits a minute per address
if (!base || !links.length) {
    console.error(
        'Usage: --base <url> --links <file> [--clicks 6] [--submit 0.5] [--seed 7] [--pause 2200]',
    );
    process.exit(1);
}

// A small seeded generator, so a run can be repeated.
let state = Number(arg('seed', 7)) >>> 0;
const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(random() * list.length)];

const first = [
    'Anna',
    'Pieter',
    'Fatima',
    'Jeroen',
    'Sanne',
    'Mohammed',
    'Lotte',
    'Daan',
    'Emma',
    'Bram',
    'Noor',
    'Thijs',
];
const last = [
    'de Vries',
    'Jansen',
    'Bakker',
    'Visser',
    'Smit',
    'Meijer',
    'de Boer',
    'Mulder',
    'van Dijk',
    'Peters',
];
const devices = [
    {
        name: 'desktop',
        viewport: { width: 1366, height: 800 },
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    },
    {
        name: 'desktop',
        viewport: { width: 1440, height: 900 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
    {
        name: 'mobile',
        viewport: { width: 390, height: 844 },
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
    },
    {
        name: 'mobile',
        viewport: { width: 412, height: 915 },
        userAgent:
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
        isMobile: true,
        hasTouch: true,
    },
];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
});
const totals = {
    clicks: 0,
    created: 0,
    duplicate: 0,
    refused: 0,
    noForm: 0,
    errors: 0,
};
const report = [];
let visitor = 0;
const stamp = Date.now().toString(36);

for (const link of links) {
    const row = {
        publisher: link.publisher,
        campaign: link.campaign,
        clicks: 0,
        created: 0,
        duplicate: 0,
        refused: 0,
    };
    let lastEmail = null;
    for (let i = 0; i < clicksPerLink; i++) {
        visitor += 1;
        const device = pick(devices);
        const context = await browser.newContext({
            locale: 'nl-NL',
            timezoneId: 'Europe/Amsterdam',
            ...device,
        });
        const page = await context.newPage();
        try {
            // The click: the tracking link records it and sends the visitor to the form.
            await page.goto(link.tracking_link, {
                waitUntil: 'domcontentloaded',
            });
            row.clicks += 1;
            totals.clicks += 1;
            if (random() > submitShare) continue; // most visitors look and leave

            const form = page.locator('#aanmelden');
            await form.waitFor({ timeout: 10000 });
            await page.waitForFunction(
                () =>
                    window.BNDLeadForm &&
                    Object.keys(window.BNDLeadForm).length > 0,
                null,
                { timeout: 10000 },
            );
            const kind = random();
            const given = pick(first);
            const family = pick(last);
            // A few visitors repeat an email (a duplicate) or forget the consent box (refused).
            const email =
                kind > 0.9 && lastEmail
                    ? lastEmail
                    : `${given}.${family}.${stamp}.${visitor}@demo-lead.test`
                          .toLowerCase()
                          .replace(/\s+/g, '');
            await page.fill('[name=voornaam]', given);
            await page.fill('[name=achternaam]', family);
            await page.fill('[name=emailadres]', email);
            await page.fill(
                '[name=telefoon]',
                `+316${String(Math.floor(random() * 1e8)).padStart(8, '0')}`,
            );
            if (kind < 0.08) {
                await page.uncheck('[name=akkoord_privacy]').catch(() => {});
            } else {
                await page.check('[name=akkoord_privacy]');
            }
            const answer = page.waitForResponse(
                (r) =>
                    r.url().includes('/lf/') && r.request().method() === 'POST',
                { timeout: 15000 },
            );
            if (kind < 0.08) {
                // With the consent box empty the browser would stop a real submit, so send the event by script:
                // the platform must still refuse it.
                await page.evaluate(() => {
                    const el = document.querySelector('#aanmelden');
                    el.querySelector('[name=akkoord_privacy]').removeAttribute(
                        'required',
                    );
                    el.dispatchEvent(
                        new Event('submit', {
                            cancelable: true,
                            bubbles: true,
                        }),
                    );
                });
            } else {
                await page.click('button[type=submit]');
            }
            const status = (await answer).status();
            if (status === 201) {
                row.created += 1;
                totals.created += 1;
                lastEmail = email;
            } else if (status === 200) {
                row.duplicate += 1;
                totals.duplicate += 1;
            } else {
                row.refused += 1;
                totals.refused += 1;
            }
            await sleep(pause);
        } catch (error) {
            totals.errors += 1;
            console.error(
                `visitor ${visitor} (${link.campaign}):`,
                error.message.split('\n')[0],
            );
        } finally {
            await context.close();
        }
    }
    report.push(row);
    console.log(
        `${link.publisher.padEnd(34)} ${link.campaign.padEnd(30)} clicks ${row.clicks}  leads ${row.created}  duplicate ${row.duplicate}  refused ${row.refused}`,
    );
}
await browser.close();
console.log('\nTotal:', JSON.stringify(totals));
process.exitCode = totals.errors > totals.clicks / 2 ? 1 : 0;
