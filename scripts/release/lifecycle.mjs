import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

// A new database every time: never migrate:fresh an ambient database.
const id = randomBytes(8).toString('hex');
const output = resolve(`release-evidence/lifecycle/${id}`);
const privateDir = mkdtempSync(resolve(tmpdir(), 'dmhub-e2e-'));
const port = () =>
    new Promise((accept, reject) => {
        const server = createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const value = server.address().port;
            server.close(() => accept(value));
        });
    });
mkdirSync(output, { recursive: true });
for (const dir of [
    'logs',
    'framework/views',
    'framework/cache/data',
    'framework/sessions',
]) {
    mkdirSync(`${privateDir}/storage/${dir}`, { recursive: true });
}
const appPort = await port();
let merchantPort = await port();
while (merchantPort === appPort) merchantPort = await port();
const env = {
    ...process.env,
    APP_ENV: 'testing',
    APP_DEBUG: 'false',
    // Match phpunit.xml so password hashing does not dominate browser timeouts.
    BCRYPT_ROUNDS: '4',
    APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
    APP_URL: `http://127.0.0.1:${appPort}`,
    APP_FORCE_HTTPS: 'false',
    DB_CONNECTION: 'pgsql',
    DB_DATABASE: `dmhub_e2e_${id}`,
    DB_URL: '',
    SESSION_DRIVER: 'database',
    SESSION_DOMAIN: 'null',
    SESSION_SECURE_COOKIE: 'false',
    SESSION_COOKIE: `dmhub_e2e_${id}`,
    CACHE_STORE: 'database',
    QUEUE_CONNECTION: 'sync',
    MAIL_MAILER: 'log',
    MAIL_LOG_CHANNEL: 'single',
    LOG_CHANNEL: 'single',
    LARAVEL_STORAGE_PATH: `${privateDir}/storage`,
    VIEW_COMPILED_PATH: `${privateDir}/storage/framework/views`,
    APP_CONFIG_CACHE: `${privateDir}/config.php`,
    APP_ROUTES_CACHE: `${privateDir}/routes.php`,
    LIFECYCLE_RUN_DIR: privateDir,
    LIFECYCLE_OUTPUT: output,
    LIFECYCLE_APP_PORT: String(appPort),
    LIFECYCLE_MERCHANT_PORT: String(merchantPort),
    LIFECYCLE_MERCHANT_URL: `http://127.0.0.1:${merchantPort}`,
};
let child;
let created = false;
let dropped = false;
let interrupted = false;
const run = (command, args) =>
    new Promise((accept, reject) => {
        if (interrupted) return reject(new Error('Interrupted'));
        child = spawn(command, args, {
            env,
            stdio: 'inherit',
            detached: process.platform !== 'win32',
        });
        child.on('error', reject);
        child.on('exit', (code, signal) => {
            child = undefined;
            if (code === 0) {
                accept();
            } else {
                reject(new Error(`${command} exited ${code ?? signal}`));
            }
        });
    });
for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
        interrupted = true;
        if (child?.pid) {
            try {
                process.kill(
                    process.platform === 'win32' ? child.pid : -child.pid,
                    'SIGTERM',
                );
            } catch {
                /* already exited */
            }
        }
    });
console.log(`Lifecycle evidence: ${output}`);
try {
    writeFileSync(
        `${output}/revision.txt`,
        execFileSync('git', ['rev-parse', 'HEAD']),
    );
    writeFileSync(
        `${output}/working-tree.txt`,
        execFileSync('git', ['status', '--porcelain']),
    );
    await run('php', ['tests/Support/lifecycle.php', 'create']);
    created = true;
    await run('php', ['artisan', 'migrate', '--seed', '--force']);
    await run('php', ['tests/Support/lifecycle.php', 'baseline']);
    await run('npm', ['run', 'types']);
    await run('npm', ['run', 'build']);
    await run('node', [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config=playwright.lifecycle.config.ts',
    ]);
    console.log('Lifecycle release gate passed.');
} catch (error) {
    console.error(`Lifecycle release gate FAILED: ${error.message}`);
    process.exitCode = 1;
} finally {
    if (created) {
        try {
            writeFileSync(
                `${output}/database-state.json`,
                execFileSync('php', ['tests/Support/lifecycle.php', 'state'], {
                    env,
                    timeout: 15000,
                }),
            );
        } catch (error) {
            console.error(`Could not capture final state: ${error.message}`);
            process.exitCode = 1;
        }
        try {
            execFileSync('php', ['tests/Support/lifecycle.php', 'drop'], {
                env,
                stdio: 'inherit',
                timeout: 15000,
            });
            dropped = true;
        } catch (error) {
            console.error(
                `Cleanup failed for ${env.DB_DATABASE}: ${error.message}`,
            );
            process.exitCode = 1;
        }
    }
    const log = `${privateDir}/storage/logs/laravel.log`;
    if (existsSync(log)) copyFileSync(log, `${output}/laravel.log`);
    rmSync(privateDir, { recursive: true, force: true });
    writeFileSync(
        `${output}/run.json`,
        JSON.stringify(
            {
                database: env.DB_DATABASE,
                created,
                dropped,
                passed: !process.exitCode,
                interrupted,
            },
            null,
            2,
        ),
    );
    console.log(`Evidence: ${output}`);
}
