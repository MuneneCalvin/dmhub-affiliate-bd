import { Input, InputGroup } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Number input with its unit inside the right edge. */
export function UnitInput({
    id,
    unit,
    value,
    onChange,
    min,
    max,
    step = 1,
    disabled,
    ...rest
}: {
    id?: string;
    unit: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    'aria-label'?: string;
    'aria-describedby'?: string;
}) {
    return (
        <InputGroup
            trailing={
                <span className="text-xs font-semibold whitespace-nowrap text-ink-muted">
                    {unit}
                </span>
            }
        >
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                value={Number.isFinite(value) ? value : ''}
                onChange={(e) => onChange(Number(e.target.value))}
                className="tabular-nums"
                {...rest}
            />
        </InputGroup>
    );
}

const DURATION_UNITS = [
    { value: 'minutes', factor: 1 },
    { value: 'hours', factor: 60 },
    { value: 'days', factor: 1440 },
] as const;
type DurationUnit = (typeof DURATION_UNITS)[number]['value'];
const bestUnit = (minutes: number): DurationUnit =>
    minutes > 0 && minutes % 1440 === 0
        ? 'days'
        : minutes > 0 && minutes % 60 === 0
          ? 'hours'
          : 'minutes';

/** Number + unit picker; always stores minutes. */
export function DurationInput({
    id,
    minutes,
    onChange,
    disabled,
    label,
}: {
    id: string;
    minutes: number;
    onChange: (minutes: number) => void;
    disabled?: boolean;
    label: string;
}) {
    const { t } = useTranslation();
    const [unit, setUnit] = useState<DurationUnit>(() => bestUnit(minutes));
    const factor = DURATION_UNITS.find((u) => u.value === unit)!.factor;
    return (
        <div className="flex gap-2">
            <Input
                id={id}
                type="number"
                min={0}
                step="any"
                disabled={disabled}
                aria-label={label}
                className="tabular-nums"
                value={minutes / factor}
                onChange={(e) =>
                    onChange(Math.round(Number(e.target.value) * factor))
                }
            />
            <Select
                value={unit}
                disabled={disabled}
                onValueChange={(v) => setUnit(v as DurationUnit)}
            >
                <SelectTrigger
                    className="w-28 shrink-0"
                    aria-label={t('{{field}} unit', { field: label })}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {DURATION_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                            {t(u.value)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/** Info note on a muted background. */
export function Hint({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-xl bg-surface-muted p-3 text-xs text-ink-muted">
            {children}
        </p>
    );
}
