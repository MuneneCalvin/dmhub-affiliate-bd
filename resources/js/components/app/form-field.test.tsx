import { Input } from '@/components/ui/input';
import { renderWithApp } from '@/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './form-field';

describe('FormField', () => {
    it('labels the control and wires hint and error to it', () => {
        renderWithApp(
            <FormField
                id="email"
                label="Email"
                hint="We never share it"
                error="Required"
            >
                <Input id="email" />
            </FormField>,
        );
        const input = screen.getByLabelText('Email');
        expect(input).toHaveAccessibleDescription('We never share it Required');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('leaves a valid control unmarked', () => {
        renderWithApp(
            <FormField id="name" label="Name">
                <Input id="name" />
            </FormField>,
        );
        expect(screen.getByLabelText('Name')).not.toHaveAttribute(
            'aria-invalid',
        );
    });
});
