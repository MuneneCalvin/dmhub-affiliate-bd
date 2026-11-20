import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import en from './locales/en.json';
import nl from './locales/nl.json';

/**
 * Every literal key passed to `t('…')`, `__('…')` or `i18n.t('…')` in
 * resources/js must exist in both bundles. A key also counts as present when
 * only its plural forms (`key_one` / `key_other`) exist. Dynamic keys
 * (variables, template literals) are not checked.
 */

// Vitest runs from the repository root.
const root = join(process.cwd(), 'resources', 'js');
const callPattern =
    /(?<![\w.$])(?:t|__|i18n\.t)\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) {
            return [];
        }
        // The dev gallery's sample copy is deliberately untranslated.
        if (relative(root, path).startsWith(join('pages', 'dev'))) return [];
        return [path];
    });
}

function usedKeys(): Map<string, string> {
    const keys = new Map<string, string>();
    for (const file of sourceFiles(root)) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(callPattern)) {
            const key = match[2].replace(/\\(.)/g, '$1');
            if (!keys.has(key)) keys.set(key, relative(root, file));
        }
    }
    return keys;
}

function missingFrom(
    bundle: Record<string, string>,
    keys: Map<string, string>,
) {
    return [...keys]
        .filter(
            ([key]) =>
                !(key in bundle) &&
                !(`${key}_one` in bundle) &&
                !(`${key}_other` in bundle),
        )
        .map(([key, file]) => `${key}  (${file})`);
}

describe('translation bundles', () => {
    const keys = usedKeys();

    it('finds the translation calls in the source', () => {
        expect(keys.size).toBeGreaterThan(1000);
    });

    it('has an English entry for every key used in the code', () => {
        expect(missingFrom(en, keys)).toEqual([]);
    });

    it('has a Dutch entry for every key used in the code', () => {
        expect(missingFrom(nl, keys)).toEqual([]);
    });

    it('translates the validation messages of the shared zod schemas', () => {
        // Shown through t(message), so the call scan above cannot see them.
        const schema = readFileSync(
            join(root, 'utils', 'form-schema.ts'),
            'utf8',
        );
        const messages = [
            ...schema.matchAll(/(?:message:\s*|,\s*)'([A-Z][^']{3,})'/g),
        ].map((m) => m[1]);
        expect(messages.length).toBeGreaterThan(10);
        expect(messages.filter((m) => !(m in en) || !(m in nl))).toEqual([]);
    });

    it('keeps the same keys in both bundles', () => {
        const enKeys = new Set(Object.keys(en));
        const nlKeys = new Set(Object.keys(nl));
        expect([...enKeys].filter((k) => !nlKeys.has(k))).toEqual([]);
        expect([...nlKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    });

    it('keeps interpolation placeholders in Dutch translations', () => {
        const placeholders = (value: string) =>
            [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();
        const mismatched = Object.entries(en as Record<string, string>)
            .filter(([key]) => key in nl)
            .filter(
                ([key, value]) =>
                    placeholders(value).join() !==
                    placeholders((nl as Record<string, string>)[key]).join(),
            )
            .map(([key]) => key);
        expect(mismatched).toEqual([]);
    });
});
