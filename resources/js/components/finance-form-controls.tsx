import { cn } from '@/lib/utils';

export function OptionCards<T extends string>({
    name,
    value,
    onChange,
    options,
}: {
    name: string;
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string; description: string }[];
}) {
    return (
        <div role="radiogroup" className="grid gap-2">
            {options.map((option) => {
                const checked = option.value === value;
                return (
                    <label
                        key={option.value}
                        className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                            checked
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={checked}
                            onChange={() => onChange(option.value)}
                            className="mt-0.5 size-4 accent-primary"
                        />
                        <span>
                            <span className="block text-sm font-medium first-letter:uppercase">
                                {option.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {option.description}
                            </span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export function FormErrors({ errors }: { errors: Record<string, string> }) {
    const entries = Object.entries(errors);
    if (!entries.length) return null;
    return (
        <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
            {entries.map(([key, error]) => (
                <p key={key}>{error}</p>
            ))}
        </div>
    );
}
