import { X } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { toneClasses, toneFromName } from '@/lib/tones';
import { cn } from '@/lib/utils';

type TagOption = { value: string; label: string };

type TagInputProps = {
    id: string;
    value: string[];
    onChange: (value: string[]) => void;
    /** Suggestions offered while typing (native datalist). */
    suggestions?: TagOption[];
    placeholder?: string;
    maxTags?: number;
    maxLength?: number;
    invalid?: boolean;
    describedBy?: string;
    disabled?: boolean;
};

/**
 * Chips input: type a tag and press Enter or comma to add it; each chip has a
 * remove button; Backspace in the empty field removes the last chip.
 * Picking a suggestion stores its value and shows its label.
 */
function TagInput({
    id,
    value,
    onChange,
    suggestions = [],
    placeholder,
    maxTags = 30,
    maxLength = 60,
    invalid,
    describedBy,
    disabled,
}: TagInputProps) {
    const { t } = useTranslation();
    const [draft, setDraft] = React.useState('');
    const listId = `${id}-suggestions`;
    const labelFor = (tag: string) =>
        suggestions.find((option) => option.value === tag)?.label ?? tag;

    const add = (raw: string) => {
        const text = raw.trim().slice(0, maxLength);
        if (!text) return;
        const match = suggestions.find(
            (option) =>
                option.value === text ||
                option.label.toLowerCase() === text.toLowerCase(),
        );
        const tag = match?.value ?? text;
        if (!value.includes(tag) && value.length < maxTags) {
            onChange([...value, tag]);
        }
        setDraft('');
    };

    return (
        <div
            data-slot="tag-input"
            aria-invalid={invalid || undefined}
            className={cn(
                'flex min-h-11 flex-wrap items-center gap-2 rounded-control border border-border-strong bg-surface-muted px-2.5 py-1.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-focus-halo',
                invalid && 'border-danger-dot',
                disabled && 'opacity-60',
            )}
        >
            {value.map((tag) => {
                const label = labelFor(tag);
                return (
                    <span
                        key={tag}
                        className={cn(
                            'inline-flex h-[30px] items-center gap-1 rounded-full pr-1 pl-2.5 text-xs font-bold',
                            toneClasses[toneFromName(tag)].soft,
                        )}
                    >
                        {label}
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                                onChange(value.filter((item) => item !== tag))
                            }
                            aria-label={t('Remove tag {{tag}}', { tag: label })}
                            className="inline-flex size-6 items-center justify-center rounded-full hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                        >
                            <X className="size-3.5" aria-hidden="true" />
                        </button>
                    </span>
                );
            })}
            <input
                id={id}
                list={suggestions.length ? listId : undefined}
                value={draft}
                disabled={disabled || value.length >= maxTags}
                maxLength={maxLength}
                placeholder={placeholder ?? t('Add a tag')}
                aria-describedby={describedBy}
                onChange={(event) => {
                    const next = event.target.value;
                    // A picked datalist suggestion arrives as the full label.
                    if (
                        suggestions.some(
                            (option) =>
                                option.label === next || option.value === next,
                        ) &&
                        next.length - draft.length > 1
                    ) {
                        add(next);
                        return;
                    }
                    setDraft(next);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        add(draft);
                    } else if (
                        event.key === 'Backspace' &&
                        !draft &&
                        value.length
                    ) {
                        onChange(value.slice(0, -1));
                    }
                }}
                onBlur={() => add(draft)}
                className="h-8 min-w-[120px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
            {suggestions.length > 0 && (
                <datalist id={listId}>
                    {suggestions
                        .filter((option) => !value.includes(option.value))
                        .map((option) => (
                            <option key={option.value} value={option.label} />
                        ))}
                </datalist>
            )}
        </div>
    );
}

export { TagInput, type TagOption };
