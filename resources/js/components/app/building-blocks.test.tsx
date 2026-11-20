import { toneFromName } from '@/lib/tones';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { Megaphone, Wallet } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';
import { FilterChips } from './filter-chips';
import { IconTile } from './icon-tile';
import { IdentityCell } from './identity-cell';
import { MetricTile } from './metric-tile';
import { ProgressBar, ProgressRing } from './progress';
import { SectionCard } from './section-card';
import { Sparkline } from './sparkline';
import { StatCard } from './stat-card';
import { TrendChip } from './trend-chip';

describe('IconTile', () => {
    it.each([
        [32, 'size-8'],
        [44, 'size-11'],
        [56, 'size-14'],
    ] as const)('size %s → %s', (size, cls) => {
        renderWithApp(
            <IconTile size={size} data-testid="tile">
                <Wallet />
            </IconTile>,
        );
        expect(screen.getByTestId('tile')).toHaveClass(cls);
    });

    it('uses soft and solid tone classes and hides decoration', () => {
        renderWithApp(
            <>
                <IconTile tone="finance" data-testid="soft" />
                <IconTile tone="finance" variant="solid" data-testid="solid" />
            </>,
        );
        expect(screen.getByTestId('soft')).toHaveClass('bg-finance-soft');
        expect(screen.getByTestId('soft')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        expect(screen.getByTestId('solid')).toHaveClass(
            'bg-finance',
            'text-white',
        );
    });
});

describe('TrendChip', () => {
    it.each([
        [12.4, 'up', 'bg-success-soft', 'Increase 12.4%'],
        [-2.3, 'down', 'bg-danger-soft', 'Decrease 2.3%'],
        [0, 'neutral', 'bg-neutral-soft', 'No change 0%'],
    ] as const)('%s → %s', (value, direction, cls, text) => {
        renderWithApp(<TrendChip value={value} />);
        const chip = document.querySelector('[data-slot="trend-chip"]')!;
        expect(chip).toHaveAttribute('data-direction', direction);
        expect(chip).toHaveClass(cls);
        expect(chip).toHaveTextContent(text);
    });

    it('inverse makes a decrease good', () => {
        renderWithApp(<TrendChip value={-5} inverse />);
        expect(document.querySelector('[data-slot="trend-chip"]')).toHaveClass(
            'bg-success-soft',
        );
    });
});

describe('StatCard', () => {
    it('shows label, tabular value, trend, sparkline and progress', () => {
        renderWithApp(
            <StatCard
                label="Revenue"
                value="€48,210.00"
                icon={<Wallet />}
                tone="finance"
                trend={12}
                sparkline={[1, 3, 2, 5]}
                progress={{ value: 62, label: 'Budget spent' }}
            />,
        );
        expect(screen.getByText('Revenue')).toBeInTheDocument();
        expect(screen.getByText('€48,210.00')).toHaveClass('tabular-nums');
        expect(
            document.querySelector('[data-slot="sparkline"]'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', { name: 'Budget spent' }),
        ).toHaveAttribute('aria-valuenow', '62');
    });

    it('solid variant fills the card with the tone', () => {
        renderWithApp(
            <StatCard label="Users" value="12" tone="admin" variant="solid" />,
        );
        expect(document.querySelector('[data-slot="stat-card"]')).toHaveClass(
            'bg-admin-strong',
            'text-white',
        );
    });
});

describe('SectionCard', () => {
    it('is a region named by its heading with an action slot and footer', () => {
        renderWithApp(
            <SectionCard
                title="Pending applications"
                description="Publishers waiting"
                icon={<Megaphone />}
                action={<button type="button">View all</button>}
                footer={<span>Footer</span>}
            >
                Rows
            </SectionCard>,
        );
        expect(
            screen.getByRole('region', { name: 'Pending applications' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            'Pending applications',
        );
        expect(
            screen.getByRole('button', { name: 'View all' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Footer').parentElement).toHaveClass(
            'bg-surface-muted',
        );
    });
});

describe('MetricTile', () => {
    it('renders a tinted label and value', () => {
        renderWithApp(
            <MetricTile label="Clicks" value="1,204" tone="analytics" />,
        );
        expect(screen.getByText('1,204').parentElement).toHaveClass(
            'bg-analytics-soft',
        );
    });
});

describe('Progress', () => {
    it('bar clamps its value', () => {
        renderWithApp(<ProgressBar label="Budget" value={140} />);
        expect(
            screen.getByRole('progressbar', { name: 'Budget' }),
        ).toHaveAttribute('aria-valuenow', '100');
    });

    it('ring shows the centred value and label', () => {
        renderWithApp(<ProgressRing label="Approval rate" value={75} />);
        expect(
            screen.getByRole('progressbar', { name: 'Approval rate' }),
        ).toHaveTextContent('75%Approval rate');
    });
});

describe('Sparkline', () => {
    it('is decorative and skips single points', () => {
        const { container, rerender } = renderWithApp(
            <Sparkline values={[1, 2, 3]} />,
        );
        expect(container.querySelector('svg')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        rerender(<Sparkline values={[1]} />);
        expect(container.querySelector('svg')).toBeNull();
    });
});

describe('EmptyState', () => {
    it('has a 56px tile, title, sentence and one action', () => {
        renderWithApp(
            <EmptyState
                icon={<Megaphone />}
                title="No campaigns yet"
                description="Create your first campaign."
                action={<button type="button">Create campaign</button>}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'No campaigns yet' }),
        ).toBeInTheDocument();
        expect(document.querySelector('[data-slot="icon-tile"]')).toHaveClass(
            'size-14',
        );
        expect(
            screen.getByRole('button', { name: 'Create campaign' }),
        ).toBeInTheDocument();
    });
});

describe('IdentityCell', () => {
    it('shows initials in a tone derived from the name', () => {
        renderWithApp(
            <IdentityCell name="Coupon Lab" subtitle="hello@couponlab.test" />,
        );
        const tile = screen.getByText('CL');
        expect(tile).toHaveAttribute('aria-hidden', 'true');
        expect(tile).toHaveClass(`bg-${toneFromName('Coupon Lab')}-soft`);
        expect(screen.getByText('Coupon Lab')).toBeInTheDocument();
        expect(screen.getByText('hello@couponlab.test')).toBeInTheDocument();
    });

    it('splits camelCase names into initials', () => {
        renderWithApp(<IdentityCell name="CouponLab" />);
        expect(screen.getByText('CL')).toBeInTheDocument();
    });

    it('derives the same tone for the same name', () => {
        expect(toneFromName('Voltix')).toBe(toneFromName(' voltix '));
    });

    it('uses a logo when given', () => {
        const { container } = renderWithApp(
            <IdentityCell name="Voltix" logoUrl="/logo.png" />,
        );
        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            '/logo.png',
        );
    });
});

describe('FilterChips', () => {
    function Example({ multiple = true }: { multiple?: boolean }) {
        const [value, setValue] = useState<string[]>(['active']);
        return (
            <FilterChips
                label="Status"
                multiple={multiple}
                value={value}
                onValueChange={setValue}
                options={[
                    { value: 'active', label: 'Active', tone: 'success' },
                    { value: 'paused', label: 'Paused', tone: 'warning' },
                ]}
            />
        );
    }

    it('toggles pressed chips', async () => {
        const { user } = renderWithApp(<Example />);
        const active = screen.getByRole('button', { name: 'Active' });
        const paused = screen.getByRole('button', { name: 'Paused' });
        expect(active).toHaveAttribute('aria-pressed', 'true');
        await user.click(paused);
        expect(paused).toHaveAttribute('aria-pressed', 'true');
        expect(active).toHaveAttribute('aria-pressed', 'true');
        await user.click(active);
        expect(active).toHaveAttribute('aria-pressed', 'false');
    });

    it('single mode keeps one chip', async () => {
        const { user } = renderWithApp(<Example multiple={false} />);
        await user.click(screen.getByRole('button', { name: 'Paused' }));
        expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });
});
