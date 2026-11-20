import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ActionTile } from './action-tile';
import { ActivityTimeline } from './activity-timeline';
import { StackedBar } from './stacked-bar';
import { StatCard } from './stat-card';

describe('dashboard building blocks', () => {
    it('StatCard shows a badge and skips the sparkline without data', () => {
        const { container } = renderWithApp(
            <StatCard
                label="Networks"
                value="24"
                badge="2 pending"
                icon={<Wallet />}
                sparkline={[]}
            />,
        );
        expect(screen.getByText('2 pending')).toBeInTheDocument();
        expect(
            container.querySelector('[data-slot="sparkline"]'),
        ).not.toBeInTheDocument();
    });

    it('StackedBar names every part and omits empty segments from the bar', () => {
        const { container } = renderWithApp(
            <StackedBar
                label="Campaigns"
                segments={[
                    { key: 'a', label: 'Active', value: 2, tone: 'success' },
                    { key: 'p', label: 'Paused', value: 0, tone: 'warning' },
                ]}
            />,
        );
        expect(
            screen.getByRole('img', { name: 'Campaigns: 2 Active, 0 Paused' }),
        ).toBeInTheDocument();
        expect(container.querySelectorAll('[role="img"] > div')).toHaveLength(
            1,
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('ActionTile is a link with an accessible count', () => {
        renderWithApp(
            <ActionTile
                href="/applications/index"
                title="Review applications"
                icon={<Wallet />}
                count={12}
                countLabel="12 waiting"
            />,
        );
        const link = screen.getByRole('link', { name: /Review applications/ });
        expect(link).toHaveAttribute('href', '/applications/index');
        expect(link).toHaveTextContent('12 waiting');
    });

    it('ActivityTimeline renders an ordered list', () => {
        renderWithApp(
            <ActivityTimeline
                items={[
                    { id: 1, message: 'Invoice paid', icon: <Wallet /> },
                    { id: 2, message: 'Publisher joined', icon: <Wallet /> },
                ]}
            />,
        );
        expect(screen.getByRole('list').tagName).toBe('OL');
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
});
