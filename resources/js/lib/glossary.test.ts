import { describe, expect, it } from 'vitest';

import en from '../i18n/locales/en.json';
import nl from '../i18n/locales/nl.json';
import {
    GLOSSARY,
    GLOSSARY_LABELS,
    termForCommissionType,
    type GlossaryTerm,
} from './glossary';

const terms = Object.keys(GLOSSARY) as GlossaryTerm[];

describe('glossary', () => {
    it('explains every term the client found unclear', () => {
        expect(terms.sort()).toEqual(
            [
                'accountOpened',
                'campaign',
                'compensation',
                'cpa',
                'cpl',
                'cps',
                'creative',
                'flat',
                'lead',
                'offer',
                'partnerPool',
                'revshare',
            ].sort(),
        );
    });

    it.each(terms)('has "%s" in both languages, with a label', (term) => {
        for (const key of [GLOSSARY[term], GLOSSARY_LABELS[term]]) {
            expect((en as Record<string, string>)[key], key).toBeTruthy();
            expect((nl as Record<string, string>)[key], key).toBeTruthy();
        }
    });

    it('defines campaign, offer and creative the way the client does', () => {
        const text = (key: GlossaryTerm) =>
            (en as Record<string, string>)[GLOSSARY[key]];
        expect(text('campaign')).toMatch(
            /ongoing product or conversion category/i,
        );
        expect(text('offer')).toMatch(/temporary promotion or agreement/i);
        expect(text('creative')).toMatch(
            /links, banners, copy, conditions and (required )?disclaimers/i,
        );
    });

    it('keeps the old word out of the explanations', () => {
        for (const term of terms) {
            expect((en as Record<string, string>)[GLOSSARY[term]]).not.toMatch(
                /commission/i,
            );
            expect((nl as Record<string, string>)[GLOSSARY[term]]).not.toMatch(
                /commissie/i,
            );
        }
    });
});

describe('termForCommissionType', () => {
    it('finds the term for every compensation model by its stored name', () => {
        expect(termForCommissionType('CPL')).toBe('cpl');
        expect(termForCommissionType('CPA')).toBe('cpa');
        expect(termForCommissionType('CPS')).toBe('cps');
        expect(termForCommissionType('RevShare')).toBe('revshare');
        expect(termForCommissionType('Flat')).toBe('flat');
    });

    it('has nothing to say about an unknown or missing model', () => {
        expect(termForCommissionType('CPC')).toBeNull();
        expect(termForCommissionType(undefined)).toBeNull();
    });
});
