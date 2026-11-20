import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StatusBadge, resolveStatus } from './status-badge';

// Every status listed in docs/redesign/tokens.md "Status tones".
const doc = readFileSync(
    resolve(process.cwd(), 'docs/redesign/tokens.md'),
    'utf8',
);
const rows = doc
    .split('## Status tones')[1]
    .split('\n## ')[0]
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) =>
        line
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim()),
    );
const cases = rows.flatMap(([tone, , , , statuses]) =>
    statuses.split(',').map((s) => [s.trim(), tone] as const),
);

describe('StatusBadge', () => {
    it('reads the status table', () => {
        expect(cases).toHaveLength(24);
    });

    it.each(cases)('maps "%s" to %s', (status, tone) => {
        expect(resolveStatus(status).tone).toBe(tone);
        renderWithApp(<StatusBadge status={status} />);
        const badge = document.querySelector('[data-slot="status-badge"]');
        expect(badge).toHaveAttribute('data-tone', tone);
    });

    it('accepts snake_case and capitalised statuses', () => {
        expect(resolveStatus('not_applied').tone).toBe('brand');
        expect(resolveStatus('Pending Approval').tone).toBe('warning');
    });

    it('falls back to neutral with the raw label for unknown statuses', () => {
        renderWithApp(<StatusBadge status="mystery_state" />);
        const badge = screen.getByText('mystery_state');
        expect(badge).toHaveAttribute('data-tone', 'neutral');
    });

    it('shows text, not only colour, and supports label/tone overrides', () => {
        renderWithApp(
            <StatusBadge status="paid" label="Settled" tone="info" />,
        );
        const badge = screen.getByText('Settled');
        expect(badge).toHaveAttribute('data-tone', 'info');
        expect(badge).toHaveClass('bg-info-soft');
    });
});
