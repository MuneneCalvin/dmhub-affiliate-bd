import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { RadioCard, RadioCardGroup } from './radio-card';

function Example() {
    const [value, setValue] = useState('cpa');
    return (
        <RadioCardGroup
            name="commission"
            label="Commission type"
            value={value}
            onValueChange={setValue}
        >
            <RadioCard value="cpa" title="CPA" hint="Per sale" tone="finance" />
            <RadioCard value="cpl" title="CPL" hint="Per lead" tone="finance" />
            <RadioCard value="flat" title="Flat" disabled />
        </RadioCardGroup>
    );
}

describe('RadioCard', () => {
    it('is a real radio inside a named radiogroup', () => {
        renderWithApp(<Example />);
        expect(
            screen.getByRole('radiogroup', { name: 'Commission type' }),
        ).toBeInTheDocument();
        const cpa = screen.getByRole('radio', { name: 'CPA' });
        expect(cpa).toBeChecked();
        expect(cpa).toHaveAccessibleDescription('Per sale');
    });

    it('selects on click and moves with arrow keys', async () => {
        const { user } = renderWithApp(<Example />);
        await user.click(screen.getByText('CPL'));
        expect(screen.getByRole('radio', { name: 'CPL' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'CPA' })).not.toBeChecked();
        await user.keyboard('{ArrowUp}');
        expect(screen.getByRole('radio', { name: 'CPA' })).toBeChecked();
    });

    it('applies the tone to the selected card and supports disabled', () => {
        renderWithApp(<Example />);
        const card = screen.getByText('CPA').closest('label');
        expect(card).toHaveClass('has-[:checked]:border-finance');
        expect(screen.getByRole('radio', { name: 'Flat' })).toBeDisabled();
    });

    it('shows decorative media above the title', () => {
        renderWithApp(
            <RadioCardGroup name="theme" label="Theme">
                <RadioCard value="dark" title="Dark" media={<span>preview</span>} />
            </RadioCardGroup>,
        );
        const radio = screen.getByRole('radio', { name: 'Dark' });
        const media = radio.closest('label')!.querySelector('[data-slot="radio-card-media"]');
        expect(media).toHaveAttribute('aria-hidden', 'true');
        expect(media).toHaveTextContent('preview');
    });
});
