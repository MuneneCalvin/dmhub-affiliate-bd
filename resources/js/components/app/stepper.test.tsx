import { renderWithApp } from '@/test/render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stepper } from './stepper';

const steps = [
    { id: 'basics', title: 'Basics' },
    { id: 'budget', title: 'Budget' },
    { id: 'review', title: 'Review' },
];

describe('Stepper', () => {
    it('marks the current step with aria-current="step"', () => {
        renderWithApp(
            <Stepper label="Campaign steps" steps={steps} current={1} />,
        );
        const nav = screen.getByRole('navigation', { name: 'Campaign steps' });
        const items = within(nav).getAllByRole('listitem');
        expect(items[1]).toHaveAttribute('aria-current', 'step');
        expect(items[0]).toHaveAttribute('data-state', 'complete');
        expect(items[2]).toHaveAttribute('data-state', 'upcoming');
        expect(items[0]).not.toHaveAttribute('aria-current');
    });

    it('reports progress', () => {
        renderWithApp(<Stepper label="Steps" steps={steps} current={1} />);
        const bar = screen.getByRole('progressbar', { name: 'Progress' });
        expect(bar).toHaveAttribute('aria-valuenow', '1');
        expect(bar).toHaveAttribute('aria-valuemax', '3');
        expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('lets users go back to completed steps only', async () => {
        const onSelect = vi.fn();
        const { user } = renderWithApp(
            <Stepper
                label="Steps"
                steps={steps}
                current={1}
                onStepSelect={onSelect}
            />,
        );
        await user.click(screen.getByRole('button', { name: /Basics/ }));
        expect(onSelect).toHaveBeenCalledWith(0);
        expect(screen.queryByRole('button', { name: /Review/ })).toBeNull();
    });
});
