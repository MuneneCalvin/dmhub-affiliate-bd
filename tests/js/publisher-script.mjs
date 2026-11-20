import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sent = [];
const listeners = new Map();
const context = {
    window: { location: { search: '?click_id=42' } },
    document: {
        addEventListener: (event, listener) => listeners.set(event, listener),
    },
    URLSearchParams,
    fetch: async (url, request) => {
        sent.push({ url, request });
        throw new Error('Unexpected request');
    },
};
vm.runInNewContext(fs.readFileSync(0, 'utf8'), context);
listeners.get('submit')?.({
    target: { email: 'login@example.com', password: 'private' },
});
assert.equal(listeners.size, 0);
assert.equal(context.window.DMHub.submitLead, undefined);
assert.equal((await context.window.DMHub.getReferral()).click_id, '42');
assert.equal(sent.length, 0);
process.stdout.write('ok');
