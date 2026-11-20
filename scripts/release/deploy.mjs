import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export function releaseCompose(template, env) {
    if (!/^[a-f0-9]{40}$/.test(env.RELEASE_SHA || ''))
        throw new Error('Full tested SHA required');
    if (!/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(env.IMAGE_REPO || ''))
        throw new Error('Invalid image repository');
    for (const service of ['app', 'web', 'backup']) {
        const digest = env[`${service.toUpperCase()}_DIGEST`];
        if (!/^sha256:[a-f0-9]{64}$/.test(digest || ''))
            throw new Error(`Missing ${service} digest`);
        const source = `\${IMAGE_REPO:?set IMAGE_REPO}/${service}:\${IMAGE_TAG:?set the qualified full commit SHA}`;
        if (!template.includes(source))
            throw new Error(`Missing ${service} image placeholder`);
        template = template.replaceAll(
            source,
            `${env.IMAGE_REPO}/${service}@${digest}`,
        );
    }
    return template.replaceAll(
        '${IMAGE_TAG:?set the qualified full commit SHA}',
        env.RELEASE_SHA,
    );
}

export async function deploy(env = process.env, fetcher = fetch) {
    for (const key of [
        'DOKPLOY_URL',
        'DOKPLOY_API_KEY',
        'DOKPLOY_COMPOSE_ID',
        'APP_URL',
    ]) {
        if (!env[key])
            throw new Error(`Missing required deployment setting: ${key}`);
    }
    for (const key of ['DOKPLOY_URL', 'APP_URL']) {
        if (new URL(env[key]).protocol !== 'https:')
            throw new Error(`${key} must use HTTPS`);
    }
    if (
        execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
        }).trim() !== env.RELEASE_SHA
    ) {
        throw new Error('Checkout differs from qualified revision');
    }
    const composeFile = releaseCompose(
        readFileSync('compose.dokploy.yaml', 'utf8'),
        env,
    );
    mkdirSync('release-evidence', { recursive: true });
    writeFileSync('release-evidence/compose.yaml', composeFile);
    writeFileSync(
        'release-evidence/deployment.json',
        JSON.stringify(
            {
                revision: env.RELEASE_SHA,
                repository: env.IMAGE_REPO,
                app: env.APP_DIGEST,
                web: env.WEB_DIGEST,
                backup: env.BACKUP_DIGEST,
            },
            null,
            2,
        ),
    );
    async function api(method, body) {
        const response = await fetcher(
            `${env.DOKPLOY_URL.replace(/\/$/, '')}/api/${method}`,
            {
                method: 'POST',
                signal: AbortSignal.timeout(30_000),
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': env.DOKPLOY_API_KEY,
                },
                body: JSON.stringify({
                    composeId: env.DOKPLOY_COMPOSE_ID,
                    ...body,
                }),
            },
        );
        // Do not print response bodies: the management API can echo secrets.
        if (!response.ok)
            throw new Error(`${method} failed: HTTP ${response.status}`);
    }
    // Raw compose prevents Dokploy fetching a moving branch. Existing environment and volumes are retained.
    await api('compose.update', {
        sourceType: 'raw',
        composeFile,
        autoDeploy: false,
        createEnvFile: true,
    });
    await api('compose.deploy', {
        title: `Qualified ${env.RELEASE_SHA}`,
        freshVolumes: false,
    });
    const base = env.APP_URL.replace(/\/$/, '');
    for (let attempt = 0; attempt < 36; attempt++) {
        try {
            const [app, web] = await Promise.all([
                fetcher(`${base}/up/revision?release=${env.RELEASE_SHA}`, {
                    signal: AbortSignal.timeout(5_000),
                    cache: 'no-store',
                }),
                fetcher(`${base}/revision.txt?release=${env.RELEASE_SHA}`, {
                    signal: AbortSignal.timeout(5_000),
                    cache: 'no-store',
                }),
            ]);
            if (
                app.ok &&
                web.ok &&
                (await app.json()).revision === env.RELEASE_SHA &&
                (await web.text()).trim() === env.RELEASE_SHA
            ) {
                writeFileSync(
                    'release-evidence/deployed.txt',
                    `${env.RELEASE_SHA}\n`,
                );
                console.log(
                    `Verified PHP, database and web release ${env.RELEASE_SHA}`,
                );
                return;
            }
        } catch {
            /* Retry during replacement/startup, never accept the previous release's health. */
        }
        await setTimeout(5_000);
    }
    throw new Error(
        'Deployment did not serve the exact qualified PHP and web revision',
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await deploy();
}
