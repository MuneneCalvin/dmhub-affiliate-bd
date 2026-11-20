import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import type { DomainTone } from '@/lib/tones';
import { AlertTriangle } from 'lucide-react';

/** Stacked radio cards for finance decisions (review, funding operation). */
export function OptionCards<T extends string>({
    name,
    value,
    onChange,
    options,
    label,
    tone = 'finance',
}: {
    name: string;
    value: T;
    onChange: (value: T) => void;
    options: { value: T; label: string; description: string }[];
    label?: string;
    tone?: DomainTone;
}) {
    return (
        <RadioCardGroup
            name={name}
            value={value}
            onValueChange={(next) => onChange(next as T)}
            label={label}
            className="grid gap-2.5 sm:grid-cols-1"
        >
            {options.map((option) => (
                <RadioCard
                    key={option.value}
                    value={option.value}
                    tone={tone}
                    title={
                        <span className="inline-block first-letter:uppercase">
                            {option.label}
                        </span>
                    }
                    hint={option.description}
                />
            ))}
        </RadioCardGroup>
    );
}

/** Every validation or finance error of a form, in one danger alert. */
export function FormErrors({ errors }: { errors: Record<string, string> }) {
    const entries = Object.entries(errors);
    if (!entries.length) return null;
    return (
        <Alert variant="danger">
            <AlertTriangle />
            <AlertDescription>
                {entries.map(([key, error]) => (
                    <p key={key}>{error}</p>
                ))}
            </AlertDescription>
        </Alert>
    );
}
