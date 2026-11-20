import assert from 'node:assert/strict';
import fs from 'node:fs';
import process from 'node:process';
import vm from 'node:vm';

const source = fs.readFileSync(0, 'utf8');
const match = source.match(/const scope = (\{[^\n]+\});/);
const scope = JSON.parse(match[1]);
const storage = new Map();
const sent = [];
const now = Date.now();
const referrals = {
    first: {
        referral_id: 'first',
        click_id: 41,
        campaign_id: scope.campaignId,
        offer_id: scope.offerId,
        clicked_at: new Date(now - 2000).toISOString(),
        expires_at: new Date(now + 100000).toISOString(),
    },
    second: {
        referral_id: 'second',
        click_id: 42,
        campaign_id: scope.campaignId,
        offer_id: scope.offerId,
        clicked_at: new Date(now - 1000).toISOString(),
        expires_at: new Date(now + 100000).toISOString(),
    },
};
function page(search, blocked = false) {
    const window = {
        location: { search },
        localStorage: {
            getItem: (key) => {
                if (blocked) throw new Error('blocked');
                return storage.get(key);
            },
            setItem: (key, value) => {
                if (blocked) throw new Error('blocked');
                storage.set(key, value);
            },
            removeItem: (key) => storage.delete(key),
        },
    };
    vm.runInNewContext(source, {
        window,
        URLSearchParams,
        Date,
        fetch: async (url, request) => {
            if (request.method === 'POST') {
                sent.push(JSON.parse(request.body));
                return {
                    ok: true,
                    json: async () => ({ success: true, confirmed: false }),
                };
            }
            const referral = referrals[url.split('/').pop()];
            return { ok: !!referral, json: async () => referral };
        },
    });
    return window.DMHub;
}

const first = page('?referral_id=first&click_id=41');
assert.equal((await first.getReferral()).referral_id, 'first');
assert.equal((await page('').getReferral()).click_id, 41);
assert.equal(
    (await page('?referral_id=second&click_id=42').getReferral()).click_id,
    42,
);
assert.equal(
    (await page('?referral_id=first&click_id=41').getReferral()).click_id,
    42,
);
assert.equal(
    (await page('?referral_id=second', true).getReferral()).click_id,
    42,
);
await assert.rejects(() => page('?referral_id=invalid').getReferral());
referrals.second.expires_at = new Date(now - 1000).toISOString();
await assert.rejects(() => page('').getReferral());
assert.equal((await page('').getReferral()).referral_id, undefined);
assert.equal(sent.length, 0, 'SDK must never POST form data');
process.stdout.write('ok');
