// Runs the everyday-workflow browser suite (tests/e2e) against a disposable
// SQLite database in a private temp directory. Never touches the developer's DB.
//   npm run test:e2e                 build assets, seed, run all specs
//   npm run test:e2e -- auth.spec    extra args go to Playwright
//   E2E_SKIP_BUILD=1 npm run test:e2e  reuse public/build when it exists
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const privateDir = mkdtempSync(resolve(tmpdir(), 'dmhub-e2e-'));
const output = resolve('test-results/e2e');
const port = () =>
    new Promise((accept, reject) => {
        const server = createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const value = server.address().port;
            server.close(() => accept(value));
        });
    });
for (const dir of [
    'logs',
    'framework/views',
    'framework/cache/data',
    'framework/sessions',
    'app/public',
]) {
    mkdirSync(`${privateDir}/storage/${dir}`, { recursive: true });
}
mkdirSync(output, { recursive: true });
const database = `${privateDir}/e2e.sqlite`;
writeFileSync(database, '');
const appPort = await port();
const env = {
    ...process.env,
    APP_ENV: 'testing',
    APP_DEBUG: 'true',
    BCRYPT_ROUNDS: '4',
    APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
    APP_URL: `http://127.0.0.1:${appPort}`,
    APP_FORCE_HTTPS: 'false',
    APP_LOCALE: 'en',
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: database,
    DB_URL: '',
    SESSION_DRIVER: 'file',
    SESSION_DOMAIN: 'null',
    SESSION_SECURE_COOKIE: 'false',
    SESSION_COOKIE: `dmhub_e2e_${randomBytes(4).toString('hex')}`,
    CACHE_STORE: 'file',
    QUEUE_CONNECTION: 'sync',
    MAIL_MAILER: 'log',
    LOG_CHANNEL: 'single',
    MEDIA_DISK: 'public',
    PULSE_ENABLED: 'false',
    TELESCOPE_ENABLED: 'false',
    NIGHTWATCH_ENABLED: 'false',
    LARAVEL_STORAGE_PATH: `${privateDir}/storage`,
    VIEW_COMPILED_PATH: `${privateDir}/storage/framework/views`,
    APP_CONFIG_CACHE: `${privateDir}/config.php`,
    APP_ROUTES_CACHE: `${privateDir}/routes.php`,
    E2E_RUN_DIR: privateDir,
    E2E_APP_PORT: String(appPort),
};
const run = (command, args) =>
    new Promise((accept, reject) => {
        const child = spawn(command, args, { env, stdio: 'inherit' });
        child.on('error', reject);
        child.on('exit', (code, signal) =>
            code === 0
                ? accept()
                : reject(
                      new Error(
                          `${command} ${args[0]} exited ${code ?? signal}`,
                      ),
                  ),
        );
    });

try {
    await run('php', ['artisan', 'migrate', '--seed', '--force']);
    await run('php', ['tests/Support/e2e.php', 'seed']);
    if (
        !(
            process.env.E2E_SKIP_BUILD &&
            existsSync('public/build/manifest.json')
        )
    ) {
        await run('npm', ['run', 'build']);
    }
    await run('node', [
        'node_modules/@playwright/test/cli.js',
        'test',
        '--config=playwright.e2e.config.ts',
        ...process.argv.slice(2),
    ]);
    console.log('E2E workflows passed.');
} catch (error) {
    console.error(`E2E workflows FAILED: ${error.message}`);
    const log = `${privateDir}/storage/logs/laravel.log`;
    if (existsSync(log)) {
        execFileSync('cp', [log, `${output}/laravel.log`]);
        console.error(`Laravel log copied to ${output}/laravel.log`);
    }
    process.exitCode = 1;
} finally {
    rmSync(privateDir, { recursive: true, force: true });
}
