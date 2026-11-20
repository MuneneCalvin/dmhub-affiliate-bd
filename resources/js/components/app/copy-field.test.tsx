import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyField } from './copy-field';

vi.mock('sonner', () => {
    const toast = Object.assign(vi.fn(), { error: vi.fn() });
    return { toast };
});

describe('CopyField', () => {
    afterEach(() => vi.clearAllMocks());

    it('copies the value to the clipboard and shows a toast', async () => {
        const { user } = renderWithApp(
            <CopyField
                label="Tracking link"
                value="https://t.example/abc"
                copiedMessage="Tracking link copied"
            />,
        );
        const writeText = vi
            .spyOn(navigator.clipboard, 'writeText')
            .mockResolvedValue(undefined);
        expect(screen.getByText('https://t.example/abc')).toHaveClass(
            'font-mono',
        );
        await user.click(
            screen.getByRole('button', { name: 'Copy: Tracking link' }),
        );
        expect(writeText).toHaveBeenCalledWith('https://t.example/abc');
        expect(toast).toHaveBeenCalledWith(
            'Tracking link copied',
            expect.anything(),
        );
        expect(
            screen.getByRole('button', { name: 'Copy: Tracking link' }),
        ).toHaveTextContent('Copied');
    });

    it('shows an error toast when copying fails', async () => {
        const { user } = renderWithApp(<CopyField value="abc" />);
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
            new Error('denied'),
        );
        await user.click(screen.getByRole('button', { name: /Copy/ }));
        expect(toast.error).toHaveBeenCalledWith('Could not copy');
    });
});
