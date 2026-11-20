import { renderWithApp } from '@/test/render';
import type { FraudRule } from '@/types/fraud';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { previewBreakdown, ruleThreshold, type RuleDefinition } from './meta';
import { RuleCard } from './rule-card';

const definition: RuleDefinition = {
    label: 'Click-to-conversion timing',
    description: 'The outcome followed the referral unusually quickly.',
    events: ['submission', 'purchase', 'action'],
    settings: { minimum_seconds: [2, 0, 86400] },
};

function Example({ own = true }: { own?: boolean }) {
    const [rule, setRule] = useState<FraudRule>({
        mode: 'monitor',
        weight: 20,
        event_types: ['submission', 'purchase', 'action'],
        settings: { minimum_seconds: 8 },
    });
    return (
        <>
            <RuleCard
                id="conversion_timing"
                definition={definition}
                rule={rule}
                campaignScoped={false}
                own={own}
                onOverride={() => {}}
                onChange={setRule}
            />
            <output data-testid="mode">{rule.mode}</output>
            <output data-testid="seconds">
                {rule.settings.minimum_seconds}
            </output>
        </>
    );
}

describe('RuleCard', () => {
    it('is a named switch that turns the rule off and back on', async () => {
        const { user } = renderWithApp(<Example />);
        const toggle = screen.getByRole('switch', {
            name: 'Click-to-conversion timing',
        });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('8 s')).toBeInTheDocument();

        await user.click(toggle);
        expect(screen.getByTestId('mode')).toHaveTextContent('off');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(
            screen.queryByRole('group', {
                name: 'Click-to-conversion timing mode',
            }),
        ).not.toBeInTheDocument();

        await user.click(toggle);
        expect(screen.getByTestId('mode')).toHaveTextContent('monitor');
    });

    it('switches to enforce and edits the threshold', async () => {
        const { user } = renderWithApp(<Example />);
        await user.click(screen.getByRole('button', { name: 'Enforce' }));
        expect(screen.getByTestId('mode')).toHaveTextContent('enforce');

        await user.click(
            screen.getByRole('button', {
                name: /Adjust Click-to-conversion timing/,
            }),
        );
        const field = screen.getByLabelText(
            'Minimum time from click to conversion',
        );
        await user.clear(field);
        await user.type(field, '3');
        expect(screen.getByTestId('seconds')).toHaveTextContent('3');
        expect(screen.getByLabelText('Risk points when flagged')).toHaveValue(
            20,
        );
    });

    it('cannot be switched when the scope inherits the rule', () => {
        renderWithApp(<Example own={false} />);
        expect(
            screen.getByRole('switch', { name: 'Click-to-conversion timing' }),
        ).toBeDisabled();
    });
});

describe('fraud preview helpers', () => {
    it('splits proposed outcomes into pass, flagged and missing evidence', () => {
        expect(
            previewBreakdown({
                sample_size: 4,
                current_eligible: 1,
                proposed_eligible: 1,
                changed: 0,
                note: '',
                rows: [
                    {
                        earning_id: 1,
                        current: 'approve',
                        proposed: 'approve',
                        missing_evidence: [],
                    },
                    {
                        earning_id: 2,
                        current: 'approve',
                        proposed: 'manual_review',
                        missing_evidence: [],
                    },
                    {
                        earning_id: 3,
                        current: 'manual_review',
                        proposed: 'manual_review',
                        missing_evidence: ['Traffic evidence'],
                    },
                    {
                        earning_id: 4,
                        current: 'manual_review',
                        proposed: 'manual_review',
                        missing_evidence: [],
                    },
                ],
            }),
        ).toEqual({ pass: 1, review: 2, missing: 1 });
    });

    it('formats thresholds and skips rules without one', () => {
        const t = ((key: string, values?: Record<string, string>) =>
            key.replace(
                /{{(\w+)}}/g,
                (_, name) => values?.[name] ?? '',
            )) as never;
        expect(
            ruleThreshold(t, 'en', 'velocity', {
                publisher_limit: 100,
                window_minutes: 60,
            }),
        ).toBe('100 / 60 min');
        expect(
            ruleThreshold(t, 'en', 'commission_amount', {
                maximum_minor: 10000,
            }),
        ).toBe('Max 100');
        expect(ruleThreshold(t, 'en', 'honeypot', {})).toBeNull();
    });
});
