import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import en from './locales/en.json';
import nl from './locales/nl.json';

/**
 * What advertisers pay publishers is "compensation" (Dutch: "vergoeding"), never "commission"/"commissie".
 * Translation keys are English source strings and may still say "commission"; only what people read is checked.
 * Code names, API fields and URLs are not in these bundles.
 */

// Values that may keep the old word, each with the reason.
const allowed: Record<string, string> = {};

function offenders(bundle: Record<string, string>, word: RegExp) {
    return Object.entries(bundle)
        .filter(([key, value]) => word.test(value) && !(key in allowed))
        .map(([key, value]) => `${key} → ${value}`);
}

describe('terminology', () => {
    it('never shows "commission" in English', () => {
        expect(offenders(en as Record<string, string>, /commission/i)).toEqual(
            [],
        );
    });

    it('never shows "commissie" in Dutch', () => {
        expect(offenders(nl as Record<string, string>, /commissie/i)).toEqual(
            [],
        );
    });

    it('says "vergoeding" where English says "compensation"', () => {
        const pairs = Object.entries(en as Record<string, string>).filter(
            ([, value]) => /compensation/i.test(value),
        );
        expect(pairs.length).toBeGreaterThan(50);
        const untranslated = pairs
            .filter(
                ([key]) =>
                    !/vergoeding/i.test(
                        (nl as Record<string, string>)[key] ?? '',
                    ),
            )
            .map(([key]) => key);
        expect(untranslated).toEqual([]);
    });

    // Text that reaches a screen through a variable or a conditional is invisible to translations.test.ts.
    // Any sentence that still says "commission" in the source must be a translation key, or it shows untranslated.
    it('has every source string that mentions commission as a translation key', () => {
        const root = join(process.cwd(), 'resources', 'js');
        const files = (dir: string): string[] =>
            readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) {
                    return ['routes', 'actions', 'wayfinder', 'dev'].includes(
                        entry.name,
                    )
                        ? []
                        : files(path);
                }
                return /\.tsx?$/.test(entry.name) &&
                    !/\.test\./.test(entry.name)
                    ? [path]
                    : [];
            });
        const missing: string[] = [];
        for (const file of files(root)) {
            readFileSync(file, 'utf8')
                .split('\n')
                .forEach((line, index) => {
                    for (const match of line.matchAll(
                        /'([^'\n]*commission[^'\n]*)'/gi,
                    )) {
                        const text = match[1];
                        const identifier =
                            /^[\w./$:{}-]*$/.test(text) && !text.includes(' ');
                        // A plural key exists as `key_one` / `key_other`.
                        if (
                            !identifier &&
                            !(text in en) &&
                            !(`${text}_other` in en)
                        ) {
                            missing.push(
                                `${relative(root, file)}:${index + 1} ${text}`,
                            );
                        }
                    }
                });
        }
        expect(missing).toEqual([]);
    });
});
