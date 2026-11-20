import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

declare global {
    interface Window {
        DMHub?: {
            getReferral(): Promise<{ referral_id?: string; click_id?: number }>;
        };
    }
}

const fixture = JSON.parse(readFileSync('.release-fixture.json', 'utf8'));
const state = () =>
    JSON.parse(
        execFileSync('php', ['tests/Support/release-fixture.php', 'state'], {
            encoding: 'utf8',
        }),
    );

test('real merchant browser persists attribution, excludes secrets and confirms exactly once', async ({
    page,
    request,
}) => {
    // This full journey includes multiple PHP/database snapshots and merchant callbacks.
    test.setTimeout(120_000);

    const sent: string[] = [];
    page.on('request', (req) => {
        if (req.postData()) sent.push(req.postData()!);
    });
    await page.goto(fixture.links[0]);
    await page.waitForFunction(() =>
        Object.keys(localStorage).some((key) =>
            key.startsWith('dmhub:referral:'),
        ),
    );
    const first = new URL(page.url()).searchParams.get('referral_id');
    await page.getByRole('button', { name: 'Sign in' }).click();
    expect(state().events).toHaveLength(0);

    // A later publisher visit supersedes the first, even though the merchant installed publisher one's script.
    await page.goto(fixture.links[1]);
    const second = new URL(page.url()).searchParams.get('referral_id');
    expect(second).not.toBe(first);
    await page.waitForFunction(
        (id) => Object.values(localStorage).some((value) => value.includes(id)),
        second,
    );
    await page.goto('http://127.0.0.1:8766/return');
    await page.waitForFunction(() => Boolean(window.DMHub?.getReferral));
    const referralData = await page.evaluate(() => window.DMHub!.getReferral());
    expect(referralData.referral_id).toBe(second);
    expect(state().earnings).toHaveLength(0);
    const payload = {
        event_type: 'submission',
        external_id: 'browser-submission-1',
        referral_id: second,
        successful: true,
        spam_checks: {
            honeypot_filled: false,
            form_duration_ms: 5000,
            is_spam: false,
        },
        amount: '0.00',
        currency: 'USD',
        occurred_at: new Date().toISOString(),
    };
    const confirm = await request.post('http://127.0.0.1:8766/confirm', {
        data: payload,
    });
    expect(confirm.status(), await confirm.text()).toBe(201);
    expect(
        (
            await request.post('http://127.0.0.1:8766/confirm', {
                data: payload,
            })
        ).status(),
    ).toBe(200);
    expect(state().events[0].publisher_id).toBe(fixture.publishers[1]);
    expect(state().earnings).toHaveLength(1);
    expect(state().earnings[0].status).toBe('pending');
    expect(sent.join('')).not.toContain('never-send-this');
    expect(JSON.stringify(state().events)).not.toContain('never-send-this');

    // First publisher also gets their own independent confirmed customer.
    await page.evaluate(() => localStorage.clear());
    await page.goto(fixture.links[0]);
    const referral = new URL(page.url()).searchParams.get('referral_id');
    const firstConfirm = await request.post('http://127.0.0.1:8766/confirm', {
        data: {
            ...payload,
            referral_id: referral,
            external_id: 'browser-submission-2',
            occurred_at: new Date().toISOString(),
        },
    });
    expect(firstConfirm.status(), await firstConfirm.text()).toBe(201);
    expect(state().events[1].publisher_id).toBe(fixture.publishers[0]);

    await page.evaluate(() => localStorage.clear());
    await page.goto(`http://127.0.0.1:8766/?referral_id=${fixture.expired}`);
    await page.waitForFunction(() => Boolean(window.DMHub?.getReferral));
    expect(
        await page.evaluate(async () => {
            try {
                await window.DMHub!.getReferral();
                return false;
            } catch {
                return true;
            }
        }),
    ).toBe(true);

    // Independent merchant checkout: failed payments rejected, two paid orders from one click retained.
    const order = {
        sale: true,
        event_type: 'purchase',
        external_id: 'order-1',
        referral_id: fixture.sale_referral,
        amount: '100.00',
        currency: 'USD',
        occurred_at: new Date().toISOString(),
    };
    expect(
        (
            await request.post('http://127.0.0.1:8766/confirm', {
                data: { ...order, status: 'failed' },
            })
        ).status(),
    ).toBe(422);
    for (const external_id of ['order-1', 'order-2']) {
        const result = await request.post('http://127.0.0.1:8766/confirm', {
            data: { ...order, external_id },
        });
        expect(result.status(), await result.text()).toBe(201);
    }
    expect(state().earnings).toHaveLength(4);
    expect(state().issues).toEqual([]);
});
