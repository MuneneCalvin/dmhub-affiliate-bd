import {
    test as base,
    expect,
    type BrowserContext,
    type Page,
} from '@playwright/test';
import {
    advertiserEmail,
    app,
    apply,
    approveAccount,
    approveApplication,
    campaignBudget,
    campaignStepTwo,
    createCampaign,
    createOffer,
    english,
    expectCampaignSchedule,
    fillRegistration,
    fixture,
    login,
    merchant,
    merchantAction,
    promoterEmail,
    register,
    state,
} from './helpers';

// Every role has its own real browser session and trace. Workflow regressions
// fail immediately; no operator fallbacks bypass advertiser permissions.
const test = base.extend<{
    actor: (name: string, mobile?: boolean) => Promise<Page>;
}>({
    actor: async ({ browser }, use, info) => {
        const contexts: {
            name: string;
            context: BrowserContext;
            page: Page;
        }[] = [];
        await use(async (name, mobile = false) => {
            const context = await browser.newContext({
                locale: 'en-US',
                timezoneId: 'Africa/Nairobi',
                viewport: mobile
                    ? { width: 390, height: 844 }
                    : { width: 1440, height: 1000 },
                isMobile: mobile,
                hasTouch: mobile,
            });
            // The platform starts in Dutch; the journey reads English, like a visitor who already chose it.
            await context.addCookies([
                { name: 'locale', value: 'en', url: app },
            ]);
            const page = await context.newPage();
            page.setDefaultTimeout(10_000);
            contexts.push({ name, context, page });
            return page;
        });
        for (const { name, context, page } of contexts) {
            if (!page.isClosed()) {
                const screenshot = info.outputPath(`${name}.png`);
                await page.screenshot({ path: screenshot, fullPage: true });
                await info.attach(name, {
                    path: screenshot,
                    contentType: 'image/png',
                });
            }
            await context.close();
        }
    },
});

test('onboarding → campaign enrollment → clicks, submissions, checkout and financial review', async ({
    actor,
}, info) => {
    const advertiser = await actor('advertiser');
    const promoter = await actor('promoter');
    const network = await actor('network');
    const admin = await actor('admin');
    const buyer = await actor('buyer');
    const second = await actor('second-promoter');
    const fresh = await actor('mobile-unattributed', true);
    const pageErrors: string[] = [];
    buyer.on('pageerror', (error) => pageErrors.push(error.message));
    const captureBodies: string[] = [];
    buyer.on('request', (request) => {
        if (request.url().endsWith('/submission') && request.postData())
            captureBodies.push(request.postData()!);
    });
    const screenshot = async (page: Page, name: string) => {
        const path = info.outputPath(`${name}.png`);
        await page.screenshot({ path, fullPage: true });
        await info.attach(name, { path, contentType: 'image/png' });
    };
    let submissionCampaign = 0;
    let saleCampaign = 0;
    let submissionOffer = 0;
    let advertiserId = 0;
    let promoterId = 0;
    let submissionLink = '';
    let saleLink = '';

    await test.step('Register, verify mail, choose passwords and approve both accounts', async () => {
        await login(network, 'network@dmhub.com', 'Abcd1234!');
        await login(admin, 'superadmin@dmhub.com', 'Abcd1234!');
        await register(advertiser, 'advertiser', advertiserEmail, 'E2E100001');
        await register(promoter, 'publisher', promoterEmail, 'E2E200001');
        await approveAccount(network, 'advertisers', advertiserEmail);
        await approveAccount(network, 'publishers', promoterEmail);
        await english(advertiser);
        await english(promoter);
        const current = state();
        advertiserId = current.advertisers.find(
            (a) =>
                a.user_id ===
                current.users.find((u) => u.email === advertiserEmail)!.id,
        )!.id;
        promoterId = current.publishers.find(
            (p) =>
                p.user_id ===
                current.users.find((u) => u.email === promoterEmail)!.id,
        )!.id;
    });

    await test.step('Create submission and sale campaigns with optional ROI blank', async () => {
        submissionCampaign = await createCampaign(
            advertiser,
            'Lifecycle Submission Campaign',
        );
        saleCampaign = await createCampaign(
            advertiser,
            'Lifecycle Checkout Campaign',
        );
        await screenshot(advertiser, 'campaign-date');
    });

    await test.step('Edit campaign settings and verify the saved description after reload', async () => {
        await advertiser
            .getByRole('link', { name: 'Settings', exact: true })
            .click();
        const description = advertiser.getByRole('textbox', {
            name: 'Description',
            exact: true,
        });
        const revised = 'Checkout campaign updated by the advertiser';
        await description.fill(revised);
        await advertiser
            .getByRole('button', { name: 'Save changes', exact: true })
            .click();
        await expect(
            advertiser.getByText('Changes saved', { exact: true }),
        ).toBeVisible();
        await advertiser.reload();
        await expect(description).toHaveValue(revised);
    });

    await test.step('Advertiser and network owner create offers and reach authorized success pages', async () => {
        expect(
            await createOffer(
                advertiser,
                submissionCampaign,
                'Lifecycle Submission Offer',
                'submission',
            ),
        ).toBeLessThan(400);
        submissionOffer = state().offers.find(
            (o) => o.campaign_id === submissionCampaign,
        )!.id;
        // B05 is tested independently of advertiser success, using the second offer.
        expect(
            await createOffer(
                network,
                saleCampaign,
                'Lifecycle Sale Offer',
                'purchase',
            ),
        ).toBeLessThan(400);
        await advertiser.goto(
            `${app}/advertiser/campaigns/show/${submissionCampaign}`,
        );
        const offersTab = advertiser
            .getByRole('navigation', { name: 'Campaign sections' })
            .getByRole('link', { name: /^Offers/ });
        await offersTab.click();
        await expect(
            advertiser
                .getByRole('row')
                .filter({ hasText: 'Lifecycle Submission Offer' }),
        ).toContainText('EUR 5 per lead');
        await screenshot(advertiser, 'offer-summary');
        await advertiser.goto(
            `${app}/advertiser/campaigns/show/${saleCampaign}`,
        );
        await offersTab.click();
        await expect(
            advertiser
                .getByRole('row')
                .filter({ hasText: 'Lifecycle Sale Offer' }),
        ).toContainText('10% of sale');
    });

    await test.step('Accept terms and approve promoter for both offers', async () => {
        for (const [campaignId, offer, title] of [
            [
                submissionCampaign,
                'Lifecycle Submission Offer',
                'Lifecycle Submission Campaign',
            ],
            [
                saleCampaign,
                'Lifecycle Sale Offer',
                'Lifecycle Checkout Campaign',
            ],
        ] as const) {
            await apply(promoter, campaignId, offer);
            await approveApplication(network, promoterEmail, title);
        }
        const assignments = state().publisher_campaigns;
        submissionLink = assignments.find(
            (a) =>
                a.campaign_id === submissionCampaign &&
                a.publisher_id === promoterId,
        )!.tracking_link;
        saleLink = assignments.find(
            (a) =>
                a.campaign_id === saleCampaign && a.publisher_id === promoterId,
        )!.tracking_link;
        expect(assignments).toHaveLength(2);
        await promoter.goto(`${app}/publishers/my/campaigns`);
        const table = await promoter.getByRole('table').innerText();
        expect(table, 'B09: campaign list identifies both offers').toContain(
            'Lifecycle Submission Offer',
        );
        expect(table).toContain('Lifecycle Sale Offer');
        const submissionAssignment = assignments.find(
            (a) =>
                a.campaign_id === submissionCampaign &&
                a.publisher_id === promoterId,
        )!;
        await promoter
            .getByRole('row')
            .filter({ hasText: 'Lifecycle Submission Offer' })
            .getByRole('link', { name: /^Details for / })
            .click();
        await expect(promoter).toHaveURL(
            `${app}/publishers/my/campaigns/show/${submissionAssignment.id}`,
        );
        await expect(promoter.locator('main')).toContainText(
            'Lifecycle Submission Offer',
        );
        await expectCampaignSchedule(promoter);
        await screenshot(promoter, 'promoter-campaign-list');
        await promoter.goto(`${app}/publisher/scripts`);
        await expect(promoter.locator('main')).toContainText('/s/');
        await expect(promoter.locator('main')).toContainText(submissionLink);
        fixture('merchant', advertiserEmail);
    });

    await test.step('Record synthetic funding through the admin UI', async () => {
        await admin.goto(`${app}/finance`);
        await admin
            .getByRole('button', { name: 'Record funding', exact: true })
            .click();
        await admin
            .getByRole('combobox', { name: 'Advertiser', exact: true })
            .click();
        await admin
            .getByRole('option', {
                name: 'Lifecycle advertiser · EUR',
                exact: true,
            })
            .click();
        await admin.locator('#fund-amount').fill('2000');
        await admin
            .locator('#fund-reference')
            .fill('LIFECYCLE-SYNTHETIC-FUNDING');
        await admin
            .locator('#fund-evidence')
            .fill('Synthetic deployment test. No bank transfer or real money.');
        await admin
            .getByRole('button', { name: 'Record funding', exact: true })
            .click();
        await expect
            .poll(() =>
                Number(
                    state().advertisers.find((a) => a.id === advertiserId)
                        ?.available_budget,
                ),
            )
            .toBeGreaterThan(1000);
    });

    await test.step('Track successful submissions automatically and ignore unrelated forms', async () => {
        await buyer.goto(
            `${submissionLink}?sub=lifecycle-banner&traffic_source=website`,
        );
        await buyer.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        expect(state().clicks).toHaveLength(1);
        await buyer
            .getByRole('button', { name: 'Sign in', exact: true })
            .click();
        await buyer
            .getByRole('button', { name: 'Submit enquiry', exact: true })
            .click();
        expect(state().publisher_earnings).toHaveLength(0);
        await buyer
            .locator('#submission [name=first_name]')
            .fill('Lifecycle buyer');
        await buyer
            .locator('#submission [name=email]')
            .fill('lifecycle.buyer@example.test');
        expect(
            await merchantAction(buyer, 'Submit enquiry', '/submission'),
        ).toMatchObject({
            http_status: 201,
            commission_status: 'pending',
            commission_amount: '5.00',
            currency: 'EUR',
        });
        expect(
            await merchantAction(buyer, 'Replay confirmation', '/replay'),
        ).toMatchObject({ http_status: 200, duplicate: true });
        expect(state().publisher_earnings).toHaveLength(1);
        await buyer.goto(`${merchant}/submission`);
        await buyer.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        await buyer
            .locator('#submission [name=first_name]')
            .fill('Returning buyer');
        await buyer
            .locator('#submission [name=email]')
            .fill('lifecycle.buyer@example.test');
        expect(
            await merchantAction(buyer, 'Submit enquiry', '/submission'),
        ).toMatchObject({ duplicate: true });
        expect(state().conversion_events).toHaveLength(1);
        expect(captureBodies.length).toBeGreaterThan(0);
        expect(captureBodies.join('')).not.toMatch(
            /never-send-this|card_number|password/,
        );
        await screenshot(buyer, 'submission-deduplication');
    });

    await test.step('Reject unattributed submissions and remove hosted forms', async () => {
        await fresh.goto(`${merchant}/submission`);
        await fresh.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        await fresh
            .locator('#submission [name=first_name]')
            .fill('No referral');
        await fresh
            .locator('#submission [name=email]')
            .fill('no-referral@example.test');
        expect(
            await merchantAction(fresh, 'Submit enquiry', '/submission'),
        ).toMatchObject({ http_status: 422 });
        expect(state().publisher_earnings).toHaveLength(1);
        expect(
            (await fresh.goto(
                `${app}/lead/capture/${state().clicks[0].id}`,
            ))!.status(),
        ).toBe(404);
    });

    await test.step('Failed and successful checkout, immutable retries and multiple orders', async () => {
        await buyer.goto(
            `${saleLink}?sub=lifecycle-checkout&traffic_source=website`,
        );
        await buyer.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        const referral = new URL(buyer.url()).searchParams.get('referral_id');
        expect(referral).toBeTruthy();
        await buyer.getByRole('link', { name: 'Go to cart' }).click();
        expect(new URL(buyer.url()).search).toBe('');
        expect(
            await merchantAction(buyer, 'Simulate failed payment', '/purchase'),
        ).toMatchObject({ confirmed: false });
        expect(state().publisher_earnings).toHaveLength(1);
        expect(
            await merchantAction(buyer, 'Pay test order', '/purchase'),
        ).toMatchObject({ http_status: 201, commission_amount: '10.00' });
        expect(
            await merchantAction(buyer, 'Replay confirmation', '/replay'),
        ).toMatchObject({ http_status: 200, duplicate: true });
        expect(
            await merchantAction(buyer, 'Replay changed amount', '/conflict'),
        ).toMatchObject({ http_status: 409 });
        expect(state().publisher_earnings).toHaveLength(2);
        expect(
            await merchantAction(buyer, 'Pay test order', '/purchase'),
        ).toMatchObject({ http_status: 201, commission_amount: '10.00' });
        expect(state().publisher_earnings).toHaveLength(3);
        expect(state().clicks).toHaveLength(2);
        await screenshot(buyer, 'checkout-confirmed');
    });

    await test.step('Approve commissions and verify reports without labelling them paid', async () => {
        await promoter.goto(`${app}/publisher/earnings`);
        await expect(promoter.locator('main')).toContainText('€25.00');
        // Phase 09: earning statuses are StatusBadges ("Pending", sentence case).
        await expect(promoter.locator('main')).toContainText(/pending/i);
        await network.goto(`${app}/finance`);
        for (let i = 0; i < 3; i++) {
            await network
                .getByRole('button', { name: 'Review', exact: true })
                .first()
                .click();
            await network
                .getByRole('textbox', { name: 'Reason and evidence' })
                .fill('Verified synthetic deployment conversion');
            await network
                .getByRole('button', {
                    name: 'Approve compensation',
                    exact: true,
                })
                .click();
            await expect(
                network.getByRole('textbox', { name: 'Reason and evidence' }),
            ).toHaveCount(0);
        }
        expect(
            state().publisher_earnings.filter((e) => e.status === 'approved'),
        ).toHaveLength(3);
        await advertiser.goto(`${app}/advertiser/dashboard`);
        const dashboard = await advertiser.locator('main').innerText();
        expect(dashboard).toContain('€200.00');
        expect(dashboard).toContain('€25.00');
        expect(dashboard, 'B10: funding excludes the €160 fee').toContain(
            'Net funded budget\n€1,840.00',
        );
        // Phase 05 dashboard: approved commissions draw down the funded
        // budget as "Spent budget" (never labelled as paid).
        expect(
            dashboard,
            'B11: approved commissions are labelled accurately',
        ).toMatch(/Spent budget\s+€25\.00/);
        expect(dashboard).not.toMatch(/compensation paid/i);
        expect(dashboard).not.toContain('Total Compensation Paid');
        await screenshot(advertiser, 'approved-dashboard');
        await promoter.goto(`${app}/publisher/earnings`);
        await expect(promoter.locator('main')).toContainText(/approved/i);
    });

    await test.step('Inactive offer rejects traffic; reactivation restores it', async () => {
        await admin.goto(`${app}/advertiser/offers/${submissionOffer}/show`);
        await admin
            .getByRole('button', { name: 'Deactivate', exact: true })
            .click();
        await expect(
            admin.getByRole('button', { name: 'Activate', exact: true }),
        ).toBeVisible();
        expect((await buyer.goto(submissionLink))!.status()).toBe(403);
        expect(state().clicks).toHaveLength(2);
        await admin
            .getByRole('button', { name: 'Activate', exact: true })
            .click();
        await expect(
            admin.getByRole('button', { name: 'Deactivate', exact: true }),
        ).toBeVisible();
    });

    await test.step('Second promoter wins last-click attribution despite first promoter embed script', async () => {
        await login(second, 'publisher@dmhub.com', 'Abcd1234!');
        await apply(second, submissionCampaign, 'Lifecycle Submission Offer');
        await approveApplication(
            network,
            'publisher@dmhub.com',
            'Lifecycle Submission Campaign',
        );
        const current = state();
        const secondId = current.publishers.find(
            (p) =>
                p.user_id ===
                current.users.find((u) => u.email === 'publisher@dmhub.com')!
                    .id,
        )!.id;
        const secondLink = current.publisher_campaigns.find(
            (a) => a.publisher_id === secondId,
        )!.tracking_link;
        await buyer.goto(submissionLink);
        await buyer.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        await buyer.goto(secondLink);
        const referral = new URL(buyer.url()).searchParams.get('referral_id')!;
        await buyer.waitForFunction(
            (id) =>
                Object.values(localStorage).some((value) => value.includes(id)),
            referral,
        );
        await buyer.goto(`${merchant}/submission`);
        await buyer.waitForFunction(() => Boolean(window.DMHub?.getReferral));
        await buyer.locator('#submission [name=first_name]').fill('Last click');
        await buyer
            .locator('#submission [name=email]')
            .fill('last-click@example.test');
        expect(
            await merchantAction(buyer, 'Submit enquiry', '/submission'),
        ).toMatchObject({ http_status: 201 });
        expect(state().publisher_earnings.at(-1)).toMatchObject({
            publisher_id: secondId,
            amount: '5.00',
            status: 'pending',
        });
        expect(state().clicks).toHaveLength(4);
        expect(state().conversion_events).toHaveLength(4);
        expect(state().publisher_earnings).toHaveLength(4);
        expect(state().reconciliation_issues).toEqual([]);
        expect(pageErrors).toEqual([]);
        await promoter.setViewportSize({ width: 390, height: 844 });
        await promoter.goto(`${app}/publishers/my/campaigns`);
        expect(
            await promoter.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        ).toBe(true);
        await screenshot(promoter, 'mobile-campaigns');
    });
});

test('B03 invalid ROI stays on its wizard step', async ({ actor }) => {
    const page = await actor('roi-validation');
    await login(page, 'advertiser@dmhub.com', 'Abcd1234!');
    await campaignStepTwo(page, 'Unsaved invalid ROI');
    await campaignBudget(page);
    await page.locator('#target_roi').fill('-1');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
        page.getByText('Invalid ROI format', { exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Budget & terms', exact: true }),
    ).toBeVisible();
    await expect(
        page
            .getByRole('navigation', { name: 'Campaign setup steps' })
            .locator('[aria-current="step"]'),
    ).toContainText('Budget & terms');
});

for (const role of ['advertiser', 'publisher']) {
    test(`B01 ${role} duplicate company number returns field validation`, async ({
        actor,
    }) => {
        const page = await actor('duplicate-company');
        await fillRegistration(
            page,
            role,
            `duplicate-coc-${role}@example.test`,
            'E2E999999',
        );
        const [response] = await Promise.all([
            page.waitForResponse(
                (r) =>
                    r.request().method() === 'POST' &&
                    r.url().endsWith('/register'),
            ),
            page
                .getByRole('button', { name: 'Create account', exact: true })
                .click(),
        ]);
        expect(
            response.status(),
            'Duplicate company registration must not produce 500',
        ).toBeLessThan(400);
        expect(
            state().users.some(
                (u) => u.email === `duplicate-coc-${role}@example.test`,
            ),
        ).toBe(false);
        await page.waitForLoadState('networkidle');
        // Server errors send the form back to the step that owns the field.
        await expect(
            page.getByLabel(/^Chamber of Commerce number/),
        ).toHaveValue('E2E999999');
        await expect(page.locator('body')).toContainText(
            /(?:company|coc)(?: number)? (?:has already been taken|is already (?:taken|registered|in use)|already exists)/i,
        );
    });
}

for (const role of ['advertiser', 'publisher']) {
    test(`B02/B15 ${role} registration explains duplicate email and labels inputs`, async ({
        actor,
    }) => {
        const page = await actor(`${role}-registration-validation`);
        await fillRegistration(
            page,
            role,
            'advertiser@dmhub.com',
            role === 'advertiser' ? 'E2E999998' : 'E2E999997',
        );
        expect(
            await page.getByLabel(/^First name/).count(),
            'B15: associate labels with inputs',
        ).toBe(1);
        await page
            .getByRole('button', { name: 'Create account', exact: true })
            .click();
        await page.waitForLoadState('networkidle');
        expect(
            await page
                .getByText('Account created successfully', { exact: true })
                .isVisible(),
            'B02: failed registration must not claim success',
        ).toBe(false);
        await expect(page.getByLabel(/^Work email/)).toHaveValue(
            'advertiser@dmhub.com',
        );
        // Keep this phrase specific: a broad email.*already expression can
        // accidentally match "Email Address ... Already have an account?".
        await expect(
            page.locator('body'),
            'B02: show actionable duplicate-email error',
        ).toContainText(
            /email(?: address)? (?:has already been taken|is already (?:taken|registered|in use)|already exists)/i,
        );
    });
}

test('B14 valid website URL with explicit port is accepted', async ({
    actor,
}) => {
    const page = await actor('website-url');
    await page.goto(`${app}/register`);
    await page.getByRole('radio', { name: 'Advertiser' }).check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (const [name, value] of Object.entries({
        business_name: 'Port URL test',
        website_name: merchant,
        industry: 'Retail',
        coc_number: 'E2E999996',
    })) {
        await page.locator(`[name=${name}]`).fill(value);
    }
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('[name=first_name]')).toBeVisible();
});
