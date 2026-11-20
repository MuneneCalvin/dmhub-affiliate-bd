import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { FormField } from './form-field';

/**
 * Value-based form fields (label + control + error) for dialogs that keep
 * their state in plain objects instead of `<form>` submissions. Each field
 * renders through `FormField`, so the error is announced with the control.
 */

export type FieldOption<V extends string | number = string> = {
    value: V;
    label: string;
};

type BaseFieldProps = {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    hint?: React.ReactNode;
    className?: string;
};

function FieldLabel({
    label,
    required,
}: {
    label: string;
    required?: boolean;
}) {
    return (
        <>
            {label}
            {required && (
                <span aria-hidden="true" className="ml-0.5 text-danger-ink">
                    *
                </span>
            )}
        </>
    );
}

type TextFieldProps = BaseFieldProps & {
    value?: string | number;
    placeholder?: string;
    type?: React.HTMLInputTypeAttribute;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    autoComplete?: string;
    onChange: (value: string) => void;
};

export function TextField({
    id,
    label,
    required,
    error,
    hint,
    className,
    value,
    onChange,
    type = 'text',
    ...inputProps
}: TextFieldProps) {
    return (
        <FormField
            id={id}
            label={<FieldLabel label={label} required={required} />}
            error={error}
            hint={hint}
            className={className}
        >
            <Input
                id={id}
                type={type}
                value={value ?? ''}
                aria-required={required || undefined}
                onChange={(e) => onChange(e.target.value)}
                {...inputProps}
            />
        </FormField>
    );
}

export function EmailField(props: Omit<TextFieldProps, 'type'>) {
    return (
        <TextField
            placeholder="name@example.com"
            autoComplete="email"
            {...props}
            type="email"
        />
    );
}

export function NumberField(props: Omit<TextFieldProps, 'type'>) {
    return <TextField {...props} type="number" />;
}

type TextareaFieldProps = BaseFieldProps & {
    value?: string;
    placeholder?: string;
    rows?: number;
    onChange: (value: string) => void;
};

export function TextareaField({
    id,
    label,
    required,
    error,
    hint,
    className,
    value,
    placeholder,
    rows = 3,
    onChange,
}: TextareaFieldProps) {
    return (
        <FormField
            id={id}
            label={<FieldLabel label={label} required={required} />}
            error={error}
            hint={hint}
            className={className}
        >
            <Textarea
                id={id}
                value={value ?? ''}
                placeholder={placeholder}
                rows={rows}
                aria-required={required || undefined}
                onChange={(e) => onChange(e.target.value)}
            />
        </FormField>
    );
}

export function CheckboxField({
    id,
    label,
    checked,
    onChange,
    className,
}: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    className?: string;
}) {
    return (
        <div className={cn('flex min-h-11 items-center gap-3', className)}>
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => onChange(v === true)}
            />
            <Label htmlFor={id}>{label}</Label>
        </div>
    );
}

type SelectFieldProps = BaseFieldProps & {
    value?: string | number;
    options: FieldOption<string | number>[];
    placeholder?: string;
    onChange: (value: string) => void;
};

/** Plain select with a short, fixed list of options. */
export function SelectField({
    id,
    label,
    required,
    error,
    hint,
    className,
    value,
    options,
    placeholder,
    onChange,
}: SelectFieldProps) {
    const { t } = useTranslation();
    return (
        <FormField
            id={id}
            label={<FieldLabel label={label} required={required} />}
            error={error}
            hint={hint}
            className={className}
        >
            <Select
                value={
                    value === undefined || value === null
                        ? undefined
                        : String(value)
                }
                onValueChange={onChange}
            >
                <SelectTrigger id={id} aria-required={required || undefined}>
                    <SelectValue placeholder={placeholder ?? t('Select')} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={String(option.value)}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    );
}

function matches(label: string, query: string) {
    return label.toLowerCase().includes(query.trim().toLowerCase());
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
    const q = query.trim();
    const index = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (index === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, index)}
            <mark className="rounded-[3px] bg-brand-soft px-0.5 font-bold text-brand-ink">
                {text.slice(index, index + q.length)}
            </mark>
            {text.slice(index + q.length)}
        </span>
    );
}

type SearchSelectProps = BaseFieldProps & {
    options: FieldOption[];
    value?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    onChange?: (value: string) => void;
};

/** Select with a search box above the options, for long lists. */
export function SearchSelect({
    id,
    label,
    required,
    error,
    hint,
    className,
    options,
    value: controlledValue,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    onChange,
}: SearchSelectProps) {
    const { t } = useTranslation();
    const [value, setValue] = React.useState(controlledValue ?? '');
    const [query, setQuery] = React.useState('');

    React.useEffect(() => {
        if (controlledValue !== undefined) setValue(controlledValue);
    }, [controlledValue]);

    const visible = query.trim()
        ? options.filter((option) => matches(option.label, query))
        : options;

    return (
        <FormField
            id={id}
            label={<FieldLabel label={label} required={required} />}
            error={error}
            hint={hint}
            className={className}
        >
            <Select
                value={value}
                onValueChange={(next) => {
                    setValue(next);
                    onChange?.(next);
                }}
                onOpenChange={(open) => {
                    if (!open) setQuery('');
                }}
            >
                <SelectTrigger
                    id={id}
                    aria-required={required || undefined}
                    className={cn(!value && 'text-ink-muted')}
                >
                    <SelectValue
                        placeholder={placeholder ?? t('Select an option')}
                    />
                </SelectTrigger>
                <SelectContent>
                    <div
                        className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3"
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <Search
                            aria-hidden="true"
                            className="size-4 shrink-0 text-ink-muted"
                        />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder ?? t('Search')}
                            aria-label={t('Search options')}
                            className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                        />
                    </div>
                    {visible.length === 0 ? (
                        <p className="p-6 text-center text-sm text-ink-muted">
                            {emptyMessage ?? t('No results found.')}
                        </p>
                    ) : (
                        visible.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                <HighlightMatch
                                    text={option.label}
                                    query={query}
                                />
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
        </FormField>
    );
}

type MultiSelectProps = BaseFieldProps & {
    options: FieldOption[];
    value?: string | string[];
    multiple?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    onChange?: (value: string | string[]) => void;
};

function toArray(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
}

/**
 * Searchable list of checkable options in a popover. With `multiple` the
 * value is an array and selected options show as removable chips below the
 * trigger; otherwise it behaves like a searchable single select.
 */
export function MultiSelect({
    id,
    label,
    required,
    error,
    hint,
    className,
    options,
    value: controlledValue,
    multiple = false,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    onChange,
}: MultiSelectProps) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [value, setValue] = React.useState<string[]>(() =>
        toArray(controlledValue),
    );

    React.useEffect(() => {
        if (controlledValue !== undefined) setValue(toArray(controlledValue));
    }, [controlledValue]);

    const emit = (next: string[]) => {
        setValue(next);
        onChange?.(multiple ? next : (next[0] ?? ''));
    };

    const toggle = (option: string) => {
        if (multiple) {
            emit(
                value.includes(option)
                    ? value.filter((v) => v !== option)
                    : [...value, option],
            );
        } else {
            emit(value.includes(option) ? [] : [option]);
            setOpen(false);
        }
    };

    const visible = query.trim()
        ? options.filter((option) => matches(option.label, query))
        : options;
    const selected = options.filter((option) => value.includes(option.value));
    const allSelected =
        options.length > 0 && options.every((o) => value.includes(o.value));
    const listId = `${id}-options`;

    const summary =
        selected.length === 0
            ? (placeholder ?? t('Select an option'))
            : selected.length === 1
              ? selected[0].label
              : t('{{count}} selected', { count: selected.length });

    return (
        <FormField
            id={id}
            label={<FieldLabel label={label} required={required} />}
            error={error}
            hint={hint}
            className={className}
            after={
                multiple && selected.length > 0 ? (
                    <ul
                        aria-label={t('Selected')}
                        className="flex flex-wrap gap-1.5"
                    >
                        {selected.map((option) => (
                            <li key={option.value}>
                                <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-soft py-0.5 pr-1 pl-3 text-xs font-bold text-brand-ink">
                                    <span className="max-w-40 truncate">
                                        {option.label}
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={t('Remove {{name}}', {
                                            name: option.label,
                                        })}
                                        onClick={() => toggle(option.value)}
                                        className="inline-flex size-6 items-center justify-center rounded-full hover:bg-brand-base/15"
                                    >
                                        <X
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : undefined
            }
        >
            <Popover
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    if (!next) setQuery('');
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="secondary"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-required={required || undefined}
                        className={cn(
                            'w-full justify-between font-medium',
                            selected.length === 0 && 'text-ink-muted',
                        )}
                    >
                        <span className="truncate">{summary}</span>
                        <ChevronsUpDown
                            aria-hidden="true"
                            className="size-4 shrink-0 text-ink-muted"
                        />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
                >
                    <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3">
                        <Search
                            aria-hidden="true"
                            className="size-4 shrink-0 text-ink-muted"
                        />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={searchPlaceholder ?? t('Search')}
                            aria-label={t('Search options')}
                            className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
                        />
                    </div>
                    <div
                        id={listId}
                        role="group"
                        aria-label={label}
                        className="max-h-64 overflow-y-auto p-1.5"
                    >
                        {visible.length === 0 ? (
                            <p className="py-8 text-center text-sm text-ink-muted">
                                {emptyMessage ?? t('No results found.')}
                            </p>
                        ) : (
                            <>
                                {multiple && !query && (
                                    <OptionRow
                                        checked={allSelected}
                                        onToggle={() =>
                                            emit(
                                                allSelected
                                                    ? []
                                                    : options.map(
                                                          (o) => o.value,
                                                      ),
                                            )
                                        }
                                    >
                                        <span className="font-bold">
                                            {t('Select all')}
                                        </span>
                                        <span className="ml-auto text-xs text-ink-muted">
                                            {options.length}
                                        </span>
                                    </OptionRow>
                                )}
                                {visible.map((option) => (
                                    <OptionRow
                                        key={option.value}
                                        label={option.label}
                                        checked={value.includes(option.value)}
                                        onToggle={() => toggle(option.value)}
                                    >
                                        <HighlightMatch
                                            text={option.label}
                                            query={query}
                                        />
                                    </OptionRow>
                                ))}
                            </>
                        )}
                    </div>
                    {multiple && value.length > 0 && (
                        <div className="flex items-center justify-between border-t border-border bg-surface-muted px-3 py-1.5">
                            <span className="text-xs text-ink-muted">
                                {t('{{selected}} of {{total}} selected', {
                                    selected: value.length,
                                    total: options.length,
                                })}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => emit([])}
                            >
                                {t('Clear all')}
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </FormField>
    );
}

function OptionRow({
    label,
    checked,
    onToggle,
    children,
}: {
    label?: string;
    checked: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={label}
            onClick={onToggle}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm font-medium text-ink hover:bg-surface-muted focus-visible:bg-surface-muted"
        >
            <span
                aria-hidden="true"
                className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border',
                    checked
                        ? 'border-brand-base bg-brand-base text-white'
                        : 'border-border-strong bg-surface',
                )}
            >
                {checked && <Check className="size-3" />}
            </span>
            {children}
        </button>
    );
}
