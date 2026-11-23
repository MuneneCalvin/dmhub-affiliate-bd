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
});
