import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input, InputGroup } from './input';
import { Label } from './label';
import { Textarea } from './textarea';

describe('Input', () => {
    it('is labelled and uses the 44px tinted control', () => {
        renderWithApp(
            <>
                <Label htmlFor="name">Campaign name</Label>
                <Input id="name" />
            </>,
        );
        const input = screen.getByRole('textbox', { name: 'Campaign name' });
        expect(input).toHaveClass('h-11', 'bg-surface-muted', 'rounded-control');
    });

    it('shows the invalid state through aria-invalid', () => {
        renderWithApp(<Input aria-label="Website" aria-invalid />);
        expect(screen.getByRole('textbox', { name: 'Website' })).toHaveClass(
            'aria-invalid:bg-invalid-fill',
        );
    });

    it('can be disabled', () => {
        renderWithApp(<Input aria-label="Locked" disabled />);
        expect(screen.getByRole('textbox', { name: 'Locked' })).toBeDisabled();
    });

    it('renders a leading adornment in an input group', () => {
        renderWithApp(
            <InputGroup leading="€">
                <Input aria-label="Payout amount" />
            </InputGroup>,
        );
        expect(screen.getByText('€')).toBeInTheDocument();
        expect(
            screen.getByRole('textbox', { name: 'Payout amount' }),
        ).toBeInTheDocument();
    });

    it('textarea shares the control styling', () => {
        renderWithApp(<Textarea aria-label="Notes" />);
        expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveClass(
            'bg-surface-muted',
        );
    });
});
