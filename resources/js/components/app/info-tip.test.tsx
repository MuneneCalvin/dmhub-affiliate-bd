import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InfoTip } from './info-tip';

describe('InfoTip', () => {
    it('is a named button that keyboard users can reach', async () => {
        const { user } = renderWithApp(
            <>
                <button>Before</button>
                <InfoTip term="compensation" />
            </>,
        );

        await user.tab();
        await user.tab();

        expect(
            screen.getByRole('button', { name: 'What is Compensation?' }),
        ).toHaveFocus();
    });

    it('explains the term when it gets focus, and closes on Escape', async () => {
        const { user } = renderWithApp(<InfoTip term="offer" />);

        await user.tab();
        const tip = await screen.findByRole('tooltip');
        expect(tip).toHaveTextContent(/temporary promotion or agreement/i);

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('also opens on a tap, for touch screens', async () => {
        const { user } = renderWithApp(<InfoTip term="cpl" />);

        await user.click(screen.getByRole('button', { name: 'What is CPL?' }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            /cost per lead/i,
        );
    });

    it('does not trap focus', async () => {
        const { user } = renderWithApp(
            <>
                <InfoTip term="lead" />
                <button>After</button>
            </>,
        );

        await user.tab();
        await user.tab();

        expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('lets a screen use its own wording for the term', () => {
        renderWithApp(<InfoTip term="campaign" label="Campaigns" />);

        expect(
            screen.getByRole('button', { name: 'What is Campaigns?' }),
        ).toBeInTheDocument();
    });
});
