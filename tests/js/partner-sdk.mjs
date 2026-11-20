import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scripts = JSON.parse(fs.readFileSync(0, 'utf8'));
const context = {
    window: { location: { search: '?click_id=42' } },
    URLSearchParams,
    fetch: async () => {
        throw new Error('Unexpected request');
    },
};
for (const script of [...scripts, scripts[0]])
    vm.runInNewContext(script, context);
const sdk = context.window.DMHub;
assert.equal(sdk.version, 2);
assert.equal(Object.keys(sdk.instances).length, 2);
assert.equal(sdk.submitLead, undefined);
assert.equal(sdk.show, undefined);
assert.equal(sdk.hide, undefined);
for (const instance of Object.values(sdk.instances)) {
    assert.equal((await instance.getReferral()).click_id, '42');
}
assert.equal(sdk.getReferral, Object.values(sdk.instances)[0].getReferral);
process.stdout.write('ok');
