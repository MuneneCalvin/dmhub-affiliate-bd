import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './checkbox';
import { Switch } from './switch';

describe('Switch', () => {
    it('is a switch that toggles on click and keyboard', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(
            <Switch aria-label="Deep linking" onCheckedChange={onChange} />,
        );
        const toggle = screen.getByRole('switch', { name: 'Deep linking' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        await user.click(toggle);
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        expect(onChange).toHaveBeenLastCalledWith(true);
        await user.keyboard(' ');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('respects the controlled value and disabled state', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(
            <Switch
                aria-label="Auto"
                checked
                disabled
                onCheckedChange={onChange}
            />,
        );
        const toggle = screen.getByRole('switch', { name: 'Auto' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        await user.click(toggle);
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('Checkbox', () => {
    it('checks with a brand fill', async () => {
        const { user } = renderWithApp(<Checkbox aria-label="Auto-approve" />);
        const box = screen.getByRole('checkbox', { name: 'Auto-approve' });
        await user.click(box);
        expect(box).toBeChecked();
        expect(box).toHaveClass('data-[state=checked]:bg-brand', 'size-[22px]');
    });
});
