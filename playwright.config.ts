import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    testIgnore: '**/lifecycle/**',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        headless: true,
        trace: 'retain-on-failure',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
            : {},
    },
    webServer: [
        {
            command:
                'php artisan serve --host=127.0.0.1 --port=8765 --no-reload',
            url: 'http://127.0.0.1:8765/up',
            reuseExistingServer: false,
        },
        {
            command: 'node tests/browser/merchant.mjs',
            url: 'http://127.0.0.1:8766',
            reuseExistingServer: false,
        },
    ],
});
