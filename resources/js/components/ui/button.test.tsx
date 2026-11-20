import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
    it('renders a primary 44px button by default', () => {
        renderWithApp(<Button>Save</Button>);
        const button = screen.getByRole('button', { name: 'Save' });
        expect(button).toHaveAttribute('data-variant', 'primary');
        expect(button).toHaveClass('h-11', 'bg-primary', 'shadow-primary');
    });

    it.each([
        ['secondary', 'border-border-strong'],
        ['outline', 'border-border-strong'],
        ['ghost', 'text-brand-ink'],
        ['destructive', 'bg-danger-strong'],
        ['success', 'bg-success-strong'],
    ] as const)('%s variant uses %s', (variant, cls) => {
        renderWithApp(<Button variant={variant}>Go</Button>);
        expect(screen.getByRole('button', { name: 'Go' })).toHaveClass(cls);
    });

    it('applies the soft tone', () => {
        renderWithApp(
            <Button variant="soft" tone="finance">
                Pay
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Pay' })).toHaveClass(
            'bg-finance-soft',
            'text-finance-ink',
        );
    });

    it.each([
        ['sm', 'h-10'],
        ['icon', 'size-11'],
        ['icon-sm', 'size-10'],
    ] as const)('size %s is %s', (size, cls) => {
        renderWithApp(
            <Button size={size} aria-label="Add">
                <Plus />
            </Button>,
        );
        expect(screen.getByRole('button', { name: 'Add' })).toHaveClass(cls);
    });

    it('does not fire when disabled', async () => {
        const onClick = vi.fn();
        const { user } = renderWithApp(
            <Button disabled onClick={onClick}>
                Nope
            </Button>,
        );
        const button = screen.getByRole('button', { name: 'Nope' });
        expect(button).toBeDisabled();
        await user.click(button);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('renders as its child with asChild', () => {
        renderWithApp(
            <Button asChild variant="secondary">
                <a href="/x">Open</a>
            </Button>,
        );
        expect(screen.getByRole('link', { name: 'Open' })).toHaveClass(
            'h-11',
        );
    });
});
