import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Component unit tests. Kept separate from vite.config.ts so the Laravel and
// Wayfinder plugins (which need artisan) do not run under Vitest.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        include: [
            'resources/js/**/*.test.{ts,tsx}',
            'resources/css/**/*.test.ts',
        ],
        setupFiles: ['resources/js/test/setup.ts'],
        css: false,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            include: [
                'resources/js/components/**',
                'resources/js/layouts/**',
                'resources/js/lib/**',
            ],
            reporter: ['text-summary', 'html'],
            reportsDirectory: 'test-results/coverage',
        },
    },
});
