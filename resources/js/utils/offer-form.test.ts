import { describe, expect, it } from 'vitest';
import { commissionFieldValue } from './offer-form';

describe('commissionFieldValue', () => {
    it('gives the form a string even when the server sends the stored value as a number', () => {
        expect(commissionFieldValue({ commission_value: 18 })).toBe('18');
        expect(commissionFieldValue({ commission_value: 18.5 })).toBe('18.5');
    });

    it('keeps a value that already is a string', () => {
        expect(commissionFieldValue({ commission_value: '25.00' })).toBe(
            '25.00',
        );
    });

    it('falls back to zero when there is no rule', () => {
        expect(commissionFieldValue(undefined)).toBe('0.00');
        expect(commissionFieldValue({ commission_value: null })).toBe('0.00');
    });
});
