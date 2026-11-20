import { renderWithApp } from '@/test/render';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RevenueChart, type RevenueSeries } from './revenue-chart';

const days = (commission: number[], start = 1) =>
    commission.map((value, index) => ({
        date: `2026-11-${String(start + index).padStart(2, '0')}`,
        revenue: value * 10,
        commission: value,
        conversions: value > 0 ? 1 : 0,
    }));

const series: RevenueSeries[] = [
    { currency: 'EUR', days: days([0, 25, 0, 50]) },
    { currency: 'USD', days: days([0, 0, 7, 0]) },
];

describe('RevenueChart', () => {
    it('shows an empty state instead of a chart when nothing was approved', () => {
        renderWithApp(
            <RevenueChart
                series={[{ currency: 'EUR', days: days([0, 0, 0]) }]}
                defaultCurrency="EUR"
            />,
        );
        expect(
            screen.getByRole('heading', {
                name: 'No approved revenue in this period',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('shows an empty state when the server sends no series at all', () => {
        renderWithApp(<RevenueChart series={[]} defaultCurrency="USD" />);
        expect(
            screen.getByRole('heading', {
                name: 'No approved revenue in this period',
            }),
        ).toBeInTheDocument();
    });

    it('sums the selected currency only and switches series on demand', async () => {
        const { user } = renderWithApp(
            <RevenueChart series={series} defaultCurrency="EUR" />,
        );
        const region = screen.getByRole('region', { name: 'Revenue' });
        expect(within(region).getByText('€75.00')).toBeInTheDocument();
        expect(within(region).queryByText('$7.00')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'USD' }));
        expect(screen.getByRole('button', { name: 'USD' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(within(region).getAllByText('$7.00').length).toBeGreaterThan(0);
        expect(within(region).queryByText('€75.00')).not.toBeInTheDocument();
    });

    it('lists every day in a hidden table and supports arrow-key inspection', () => {
        renderWithApp(<RevenueChart series={series} defaultCurrency="EUR" />);
        expect(screen.getAllByRole('row')).toHaveLength(5);
        const slider = screen.getByRole('slider', { name: 'Inspect a day' });
        expect(slider).toHaveAttribute('aria-valuenow', '4');
        fireEvent.keyDown(slider, { key: 'ArrowLeft' });
        expect(slider).toHaveAttribute('aria-valuenow', '3');
        fireEvent.keyDown(slider, { key: 'Home' });
        expect(slider).toHaveAttribute('aria-valuenow', '1');
        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        expect(slider.getAttribute('aria-valuetext')).toContain('€25.00');
    });

    it('trims to the controlled period', () => {
        renderWithApp(
            <RevenueChart series={series} defaultCurrency="EUR" period={7} />,
        );
        expect(
            screen.queryByRole('group', { name: 'Revenue period' }),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/last 7 days/)).toBeInTheDocument();
    });
});
