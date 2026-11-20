import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Button } from '../ui/button';
import { StatePanel } from './state-panel';
import { StepProgress } from './step-progress';

describe('StatePanel', () => {
    it('is a section named by its heading with tile, badge and actions', () => {
        renderWithApp(
            <StatePanel
                icon={<Mail />}
                tone="analytics"
                badge={<span>Badge</span>}
                title="Check your inbox"
                description="We sent a link."
                actions={<Button>Resend</Button>}
            />,
        );
        const region = screen.getByRole('region', { name: 'Check your inbox' });
        expect(region).toHaveAttribute('data-variant', 'default');
        expect(
            screen.getByRole('heading', { level: 1, name: 'Check your inbox' }),
        ).toBeInTheDocument();
        expect(screen.getByText('We sent a link.')).toBeInTheDocument();
        expect(screen.getByText('Badge')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Resend' }),
        ).toBeInTheDocument();
        const tile = region.querySelector('[data-slot=icon-tile]');
        expect(tile).toHaveAttribute('data-tone', 'analytics');
        expect(tile).toHaveClass('size-24');
    });

    it('supports the navy inverse card and h2', () => {
        renderWithApp(
            <StatePanel
                icon="403"
                tone="danger"
                tileVariant="solid"
                variant="inverse"
                headingLevel={2}
                title="No access"
            />,
        );
        expect(screen.getByRole('region', { name: 'No access' })).toHaveClass(
            'bg-sidebar',
        );
        expect(
            screen.getByRole('heading', { level: 2, name: 'No access' }),
        ).toBeInTheDocument();
    });
});

describe('StepProgress', () => {
    it('exposes the step as a progressbar and fills completed segments', () => {
        const { container } = renderWithApp(
            <StepProgress current={2} total={3} stepLabel="Your website" />,
        );
        const bar = screen.getByRole('progressbar', { name: 'Progress' });
        expect(bar).toHaveAttribute('aria-valuenow', '2');
        expect(bar).toHaveAttribute('aria-valuemax', '3');
        expect(bar).toHaveAttribute(
            'aria-valuetext',
            'Step 2 of 3 · Your website',
        );
        expect(container.querySelectorAll('[data-complete]')).toHaveLength(2);
        expect(screen.getByText('Step 2 of 3 · Your website')).toBeVisible();
    });
});
