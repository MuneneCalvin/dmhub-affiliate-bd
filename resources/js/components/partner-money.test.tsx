import { describe, expect, it } from 'vitest';
import { formatCommission } from './partner-money';

describe('formatCommission', () => {
    it('shows fixed amounts in euros unless another currency is given', () => {
        expect(formatCommission('25', 'CPL')).toContain('€');
        expect(formatCommission('25', 'CPL')).not.toContain('$');
        expect(formatCommission('25', 'CPL', 'USD')).toContain('$');
    });

    it('shows percentage models as percentages', () => {
        expect(formatCommission('10', 'CPS')).toBe('10%');
        expect(formatCommission('10', 'RevShare')).toBe('10%');
    });

    it('shows a dash when there is no value', () => {
        expect(formatCommission(null, 'CPL')).toBe('—');
    });
});
