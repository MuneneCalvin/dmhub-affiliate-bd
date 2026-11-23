import { defineConfig } from '@playwright/test';

if (!process.env.E2E_RUN_DIR || !process.env.E2E_APP_PORT) {
    throw new Error(
        'Use npm run test:e2e so the disposable database is created and removed.',
    );
}

export default defineConfig({
    testDir: './tests/e2e',
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 90_000,
    expect: { timeout: 8000 },
    outputDir: 'test-results/e2e/results',
    reporter: [
        ['list'],
        ['html', { outputFolder: 'test-results/e2e/html', open: 'never' }],
    ],
    use: {
        baseURL: process.env.APP_URL,
        locale: 'en-US',
        // The platform starts in Dutch. These workflows were written in English, so they begin as a visitor
        // who already chose English; zzz-dutch-euro.spec.ts opens contexts without it to prove the default.
        storageState: {
            cookies: [
                {
                    name: 'locale',
                    value: 'en',
                    domain: '127.0.0.1',
                    path: '/',
                    expires: -1,
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax',
                },
            ],
            origins: [],
        },
        viewport: { width: 1440, height: 1000 },
        actionTimeout: 10_000,
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
            : {},
    },
    projects: [
        // Everyday workflows, in file order (they share one database).
        { name: 'workflows', testIgnore: /a11y\.spec\.ts$/ },
        // Accessibility audit after the workflows, so pages that need data
        // created by them (invoices, applications) exist.
        {
            name: 'a11y',
            testMatch: /a11y\.spec\.ts$/,
            dependencies: ['workflows'],
        },
    ],
    webServer: {
        command: `php -S 127.0.0.1:${process.env.E2E_APP_PORT} -t public tests/Support/e2e-server.php`,
        url: `${process.env.APP_URL}/up`,
        reuseExistingServer: false,
        stderr: 'ignore',
    },
});
