import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { as } from './helpers';

// Runs last (file order) because it adds a campaign, an earning and a lead the other specs do not expect.
// A stand-in for Brand New Day's own form page, on another origin than the app. Its form stays on the page
// after a submit so the browser keeps the platform's answer for the assertions below.
test.describe.configure({ mode: 'serial' });
let formServer: Server;
let origin = '';
let snippet = '';
let trackingLink = '';
let offerId = 0;

const formPage = () => `<!doctype html><html lang="nl"><body>
<form id="aanmelden" action="/bedankt" method="post" onsubmit="return false">
  <input name="voornaam" value="Anna"><input name="achternaam" value="de Vries">
  <input type="email" name="emailadres" value="anna@example.nl">
  <label><input type="checkbox" name="akkoord_privacy" checked> Ik ga akkoord met het privacybeleid</label>
  <button type="submit">Verstuur</button>
</form>
${snippet}
</body></html>`;

test.beforeAll(async () => {
    formServer = createServer((request, response) => {
        if (request.url?.startsWith('/form.html')) {
            response.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
            });
            response.end(formPage());
        } else {
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.end('<p>Bedankt</p>');
        }
    });
    await new Promise<void>((accept) =>
        formServer.listen(0, '127.0.0.1', accept),
    );
    origin = `http://127.0.0.1:${(formServer.address() as AddressInfo).port}`;
    const seeded = JSON.parse(
        execFileSync('php', ['tests/Support/e2e.php', 'leadform', origin], {
            encoding: 'utf8',
        }),
    );
    offerId = seeded.offer_id;
    trackingLink = seeded.tracking_link;
});

test.afterAll(
    () => new Promise<void>((accept) => formServer.close(() => accept())),
);

/** Follows the publisher's tracking link the way a visitor would and returns the form URL it redirects to. */
async function clickTrackingLink(page: Page): Promise<string> {
    const response = await page.request.get(trackingLink, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    const location = response.headers()['location'];
    expect(location).toContain(`${origin}/form.html`);
    expect(location).toMatch(/referral_id=/);
    return location;
}

/** Submits the form on the redirected page and returns the status BND's platform answered with. */
async function submitForm(page: Page, uncheckConsent = false): Promise<number> {
    await page.goto(await clickTrackingLink(page));
    if (uncheckConsent) await page.getByRole('checkbox').uncheck();
    const answer = page.waitForResponse(
        (r) => r.url().includes('/lf/') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Verstuur' }).click();
    return (await answer).status();
}

const leadRows = async (page: Page) => {
    await page.goto('/leads');
    return page.getByText('anna@example.nl').count();
};

test('BND staff copy the snippet from the offer page', async ({ browser }) => {
    const page = await as(browser, 'advertiser');
    await page.goto(`/advertiser/offers/${offerId}/show`);
    await page.getByRole('tab', { name: 'Integration' }).click();
    await expect(
        page.getByRole('heading', { name: 'Lead form embed' }),
    ).toBeVisible();
    snippet = (
        await page
            .locator('code', { hasText: '<script async src=' })
            .first()
            .innerText()
    ).trim();
    expect(snippet).toMatch(/\/lf\/[A-Za-z0-9]{32}\.js"><\/script>$/);
    // The landing page host is already allowed; nothing else has to be configured.
    await expect(page.getByText('127.0.0.1').first()).toBeVisible();
});

test('a visitor submits the form and the advertiser sees one lead for the publisher', async ({
    browser,
}) => {
    const visitor = await (await browser.newContext()).newPage();
    expect(await submitForm(visitor)).toBe(201);

    const advertiser = await as(browser, 'advertiser');
    await expect.poll(() => leadRows(advertiser)).toBe(1);
    await expect(advertiser.getByText('Anna').first()).toBeVisible();
});

test('the same email again is a duplicate and creates no second lead', async ({
    browser,
}) => {
    const visitor = await (await browser.newContext()).newPage();
    expect(await submitForm(visitor)).toBe(200);

    const advertiser = await as(browser, 'advertiser');
    expect(await leadRows(advertiser)).toBe(1);
});

test('a submit without consent is refused', async ({ browser }) => {
    const visitor = await (await browser.newContext()).newPage();
    expect(await submitForm(visitor, true)).toBe(422);

    const advertiser = await as(browser, 'advertiser');
    expect(await leadRows(advertiser)).toBe(1);
});

test('publishers never reach the contacts', async ({ browser }) => {
    const publisher = await as(browser, 'publisher');
    await publisher.goto('/leads');
    await expect(publisher).not.toHaveURL(/\/leads/);
    await expect(publisher.getByText('anna@example.nl')).toHaveCount(0);
});
