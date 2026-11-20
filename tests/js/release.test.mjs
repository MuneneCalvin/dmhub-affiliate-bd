import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { releaseCompose } from '../../scripts/release/deploy.mjs';

const template = readFileSync('compose.dokploy.yaml', 'utf8');
const env = {
    RELEASE_SHA: 'a'.repeat(40),
    IMAGE_REPO: 'ghcr.io/owner/repo',
    APP_DIGEST: `sha256:${'1'.repeat(64)}`,
    WEB_DIGEST: `sha256:${'2'.repeat(64)}`,
    BACKUP_DIGEST: `sha256:${'3'.repeat(64)}`,
};
test('deployment pins all images and backup evidence to the qualified revision', () => {
    const result = releaseCompose(template, env);
    for (const service of ['app', 'web', 'backup']) {
        assert.ok(
            result.includes(
                `${env.IMAGE_REPO}/${service}@${env[`${service.toUpperCase()}_DIGEST`]}`,
            ),
        );
    }
    assert.ok(!result.includes('${IMAGE_TAG'));
    assert.ok(!result.includes('${IMAGE_REPO'));
    assert.ok(result.includes(`RELEASE_SHA: ${env.RELEASE_SHA}`));
    assert.ok(result.includes('${DB_PASSWORD}'));
});
test('deployment refuses moving refs, missing digests and unexpected compose templates', () => {
    assert.throws(() =>
        releaseCompose(template, { ...env, RELEASE_SHA: 'main' }),
    );
    assert.throws(() =>
        releaseCompose(template, { ...env, WEB_DIGEST: 'staging' }),
    );
    assert.throws(() =>
        releaseCompose(template, { ...env, BACKUP_DIGEST: '' }),
    );
    assert.throws(() => releaseCompose('', env));
});
