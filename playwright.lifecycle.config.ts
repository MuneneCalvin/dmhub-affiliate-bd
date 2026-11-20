import { defineConfig } from '@playwright/test';

if (!process.env.LIFECYCLE_RUN_DIR || !process.env.LIFECYCLE_OUTPUT) {
    throw new Error('Use npm run test:lifecycle so setup and cleanup cannot be skipped.');
}
const output = process.env.LIFECYCLE_OUTPUT;
export default defineConfig({
    testDir: './tests/browser/lifecycle',
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 180_000,
    expect: { timeout: 8000 },
    outputDir: `${output}/results`,
    reporter: [
        ['list'], ['html', { outputFolder: `${output}/html`, open: 'never' }],
        ['junit', { outputFile: `${output}/junit.xml` }],
        ['json', { outputFile: `${output}/results.json` }],
    ],
    use: {
        baseURL: process.env.APP_URL,
        locale: 'en-US', timezoneId: 'Africa/Nairobi',
        viewport: { width: 1440, height: 1000 },
        actionTimeout: 10_000,
        headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
    },
    webServer: [
        {
            command: `php -S 127.0.0.1:${process.env.LIFECYCLE_APP_PORT} -t public tests/Support/lifecycle-server.php`,
            url: `${process.env.APP_URL}/up`, reuseExistingServer: false,
            stderr: 'ignore',
        },
        {
            command: 'node tests/browser/lifecycle-merchant.mjs',
            url: `${process.env.LIFECYCLE_MERCHANT_URL}/health`, reuseExistingServer: false,
        },
    ],
});
