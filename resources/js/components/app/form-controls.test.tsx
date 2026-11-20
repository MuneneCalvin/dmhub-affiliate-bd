import { renderWithApp } from '@/test/render';
import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog, useConfirmationDialog } from './confirm-dialog';
import {
    CheckboxField,
    MultiSelect,
    NumberField,
    TextField,
} from './form-controls';
import { FormDialog } from './form-dialog';

const fruit = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
];

describe('form controls', () => {
    it('labels a text field, marks it required and announces the error', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(
            <TextField
                id="name"
                label="Name"
                required
                error="Name is required"
                onChange={onChange}
            />,
        );
        const input = screen.getByLabelText(/Name/);
        expect(input).toHaveAttribute('aria-required', 'true');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(input).toHaveAccessibleDescription('Name is required');
        await user.type(input, 'A');
        expect(onChange).toHaveBeenCalledWith('A');
    });

    it('renders number fields as number inputs', () => {
        renderWithApp(
            <NumberField
                id="limit"
                label="Limit"
                value={3}
                onChange={vi.fn()}
            />,
        );
        expect(screen.getByLabelText('Limit')).toHaveAttribute(
            'type',
            'number',
        );
    });

    it('toggles a checkbox field by its label', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(
            <CheckboxField
                id="terms"
                label="Accept terms"
                checked={false}
                onChange={onChange}
            />,
        );
        await user.click(screen.getByText('Accept terms'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('selects, searches and removes options in a multi select', async () => {
        function Harness() {
            const [value, setValue] = useState<string[]>([]);
            return (
                <MultiSelect
                    id="fruit"
                    label="Fruit"
                    multiple
                    options={fruit}
                    value={value}
                    onChange={(v) => setValue(v as string[])}
                />
            );
        }
        const { user } = renderWithApp(<Harness />);
        await user.click(screen.getByRole('combobox', { name: 'Fruit' }));
        await user.click(screen.getByRole('checkbox', { name: 'Apple' }));
        await user.type(screen.getByLabelText('Search options'), 'ban');
        expect(
            screen.queryByRole('checkbox', { name: 'Cherry' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: 'Banana' }));
        await user.keyboard('{Escape}');

        const chips = screen.getByRole('list', { name: 'Selected' });
        expect(chips).toHaveTextContent('Apple');
        expect(chips).toHaveTextContent('Banana');
        await user.click(screen.getByRole('button', { name: 'Remove Apple' }));
        expect(chips).not.toHaveTextContent('Apple');
    });

    it('closes a single multi select after picking', async () => {
        const onChange = vi.fn();
        const { user } = renderWithApp(
            <MultiSelect
                id="one"
                label="One fruit"
                options={fruit}
                onChange={onChange}
            />,
        );
        await user.click(screen.getByRole('combobox', { name: 'One fruit' }));
        await user.click(screen.getByRole('checkbox', { name: 'Cherry' }));
        expect(onChange).toHaveBeenCalledWith('cherry');
        await waitFor(() =>
            expect(
                screen.queryByRole('checkbox', { name: 'Cherry' }),
            ).not.toBeInTheDocument(),
        );
    });
});

describe('ConfirmDialog', () => {
    it('confirms through the hook and closes', async () => {
        const onConfirm = vi.fn();
        function Harness() {
            const { confirm, ConfirmDialog: Dialog } = useConfirmationDialog();
            return (
                <>
                    <button
                        type="button"
                        onClick={() =>
                            confirm({
                                title: 'Delete offer',
                                description: 'This cannot be undone.',
                                confirmLabel: 'Delete',
                                variant: 'destructive',
                                onConfirm,
                            })
                        }
                    >
                        Open
                    </button>
                    <Dialog />
                </>
            );
        }
        const { user } = renderWithApp(<Harness />);
        await user.click(screen.getByRole('button', { name: 'Open' }));
        const dialog = screen.getByRole('alertdialog', {
            name: 'Delete offer',
        });
        expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
        await user.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledOnce();
        await waitFor(() =>
            expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
        );
    });

    it('cancels without confirming', async () => {
        const onConfirm = vi.fn();
        const onOpenChange = vi.fn();
        const { user } = renderWithApp(
            <ConfirmDialog
                open
                onOpenChange={onOpenChange}
                title="Pause campaign"
                description="Publishers stop earning."
                onConfirm={onConfirm}
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});

describe('FormDialog', () => {
    it('moves focus into the dialog and closes on Escape', async () => {
        const onSwitch = vi.fn();
        const { user } = renderWithApp(
            <FormDialog dialogOpen handleDialogContextSwitch={onSwitch}>
                <h2>Edit user</h2>
                <input aria-label="Email" />
            </FormDialog>,
        );
        const dialog = screen.getByRole('dialog');
        await waitFor(() =>
            expect(dialog).toContainElement(
                document.activeElement as HTMLElement,
            ),
        );
        await user.keyboard('{Escape}');
        expect(onSwitch).toHaveBeenCalledWith({});
    });
});
