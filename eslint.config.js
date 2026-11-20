import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import typescript from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    js.configs.recommended,
    reactHooks.configs.flat.recommended,
    ...typescript.configs.recommended,
    {
        ...react.configs.flat.recommended,
        ...react.configs.flat['jsx-runtime'], // Required for React 17+
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: [
            'scripts/**/*.{js,mjs}',
            'tests/**/*.{js,mjs,ts}',
            'playwright*.ts',
        ],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // Playwright fixtures call `use(...)`, which is not a React hook.
        files: ['tests/browser/**/*.ts'],
        rules: {
            'react-hooks/rules-of-hooks': 'off',
        },
    },
    {
        ignores: [
            'vendor',
            'node_modules',
            'public',
            'bootstrap/ssr',
            'tailwind.config.js',
            'playwright-report',
            'test-results',
            'release-evidence',
        ],
    },
    prettier, // Turn off all rules that might conflict with Prettier
];
