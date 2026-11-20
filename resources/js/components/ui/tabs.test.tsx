import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './segmented-control';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
    function Example() {
        return (
            <Tabs defaultValue="overview">
                <TabsList aria-label="Campaign sections">
                    <TabsTrigger value="overview" icon={<LayoutGrid />}>
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="offers" count={6}>
                        Offers
                    </TabsTrigger>
                    <TabsTrigger value="publishers" disabled>
                        Publishers
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview">Overview body</TabsContent>
                <TabsContent value="offers">Offers body</TabsContent>
            </Tabs>
        );
    }

    it('renders underline tabs with a count pill', () => {
        renderWithApp(<Example />);
        expect(
            screen.getByRole('tablist', { name: 'Campaign sections' }),
        ).toHaveAttribute('data-variant', 'underline');
        const offers = screen.getByRole('tab', { name: 'Offers 6' });
        expect(offers).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    it('moves between tabs with the arrow keys', async () => {
        const { user } = renderWithApp(<Example />);
        await user.click(screen.getByRole('tab', { name: 'Overview' }));
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('tab', { name: 'Offers 6' })).toHaveFocus();
        expect(screen.getByText('Offers body')).toBeVisible();
        await user.keyboard('{ArrowRight}');
        // Disabled tab is skipped; focus wraps to the first tab.
        expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();
    });
});

describe('SegmentedControl', () => {
    function Example({ onChange }: { onChange?: (v: string) => void }) {
        const [value, setValue] = useState('all');
        return (
            <SegmentedControl
                label="Status filter"
                value={value}
                onValueChange={(v) => {
                    setValue(v);
                    onChange?.(v);
                }}
                options={[
                    { value: 'all', label: 'All', count: 48 },
                    { value: 'active', label: 'Active', count: 39 },
                ]}
            />
        );
    }

    it('marks the selected option with aria-pressed', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(<Example onChange={onChange} />);
        expect(
            screen.getByRole('group', { name: 'Status filter' }),
        ).toBeInTheDocument();
        const all = screen.getByRole('button', { name: 'All · 48' });
        const active = screen.getByRole('button', { name: 'Active · 39' });
        expect(all).toHaveAttribute('aria-pressed', 'true');
        await user.click(active);
        expect(active).toHaveAttribute('aria-pressed', 'true');
        expect(all).toHaveAttribute('aria-pressed', 'false');
        expect(onChange).toHaveBeenCalledWith('active');
    });

    it('uses the solid tone in the filled variant', () => {
        renderWithApp(
            <SegmentedControl
                label="Currency"
                variant="filled"
                tone="finance"
                value="EUR"
                onValueChange={() => {}}
                options={[
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                ]}
            />,
        );
        expect(screen.getByRole('button', { name: 'EUR' })).toHaveClass(
            'aria-pressed:bg-finance-strong',
        );
    });
});
