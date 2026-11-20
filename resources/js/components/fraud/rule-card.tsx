import { FilterChips, IconTile } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { FraudRule, RuleMode } from '@/types/fraud';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UnitInput } from './fields';
import {
    RULE_MODES,
    eventLabel,
    ruleIcon,
    ruleSummary,
    ruleThreshold,
    settingMeta,
    type RuleDefinition,
} from './meta';

/**
 * One fraud rule: icon, plain-language summary, current threshold and an
 * on/off Switch. When on, it is either monitored (evidence only) or enforced
 * (adds risk points); its thresholds open in a panel below.
 */
export function RuleCard({
    id,
    definition,
    rule,
    campaignScoped,
    own,
    onOverride,
    onChange,
}: {
    id: string;
    definition: RuleDefinition;
    rule: FraudRule;
    /** Campaign scope: the rule is inherited unless overridden. */
    campaignScoped: boolean;
    /** This scope sets the rule itself (always true for network defaults). */
    own: boolean;
    onOverride: (on: boolean) => void;
    onChange: (rule: FraudRule) => void;
}) {
    const { t, i18n } = useTranslation();
    const panelId = useId();
    const [open, setOpen] = useState(false);
    const active = rule.mode !== 'off';
    const label = t(definition.label);
    const settings = Object.entries(definition.settings);
    const threshold = ruleThreshold(t, i18n.language, id, rule.settings);
    const { icon: Icon, tone } = ruleIcon(id);
    const tunable =
        active &&
        (settings.length > 0 ||
            definition.events.length > 1 ||
            rule.mode === 'enforce');

    return (
        <article
            aria-label={label}
            data-rule={id}
            className={cn(
                'rounded-2xl border border-border bg-surface shadow-card transition-colors',
                rule.mode === 'enforce' && 'border-brand/40',
            )}
        >
            <div className="flex flex-wrap items-center gap-3.5 px-[18px] py-4">
                <IconTile size={44} tone={active ? tone : 'neutral'}>
                    <Icon />
                </IconTile>
                <div className="flex min-w-[200px] flex-1 flex-col">
                    <h3 className="font-bold">{label}</h3>
                    <p className="text-xs text-ink-muted">
                        {ruleSummary(t, i18n.language, id, rule.settings) ||
                            t(definition.description)}
                    </p>
                </div>
                {threshold && (
                    <span
                        className={cn(
                            'flex h-10 items-center rounded-[11px] bg-canvas px-3 font-bold tabular-nums',
                            !active && 'text-ink-muted',
                        )}
                    >
                        <span className="sr-only">{t('Threshold')}: </span>
                        {threshold}
                    </span>
                )}
                <Switch
                    aria-label={label}
                    checked={active}
                    disabled={!own}
                    tone="brand"
                    onCheckedChange={(on) =>
                        onChange({ ...rule, mode: on ? 'monitor' : 'off' })
                    }
                />
            </div>

            {(active || campaignScoped) && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border px-[18px] py-3">
                    {campaignScoped && (
                        <label className="mr-auto flex min-h-11 items-center gap-2 text-[13px] font-semibold">
                            <Checkbox
                                checked={own}
                                onCheckedChange={(checked) =>
                                    onOverride(checked === true)
                                }
                            />
                            {t('Override network rule')}
                        </label>
                    )}
                    {active && (
                        <>
                            <SegmentedControl
                                size="sm"
                                label={t('{{rule}} mode', { rule: label })}
                                value={rule.mode}
                                onValueChange={(mode) =>
                                    own &&
                                    onChange({
                                        ...rule,
                                        mode: mode as RuleMode,
                                    })
                                }
                                options={RULE_MODES.filter(
                                    (mode) => mode.value !== 'off',
                                ).map((mode) => ({
                                    value: mode.value,
                                    label: t(mode.label),
                                    disabled: !own,
                                }))}
                            />
                            {tunable && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(!campaignScoped && 'ml-auto')}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    onClick={() => setOpen((v) => !v)}
                                >
                                    {open ? t('Hide settings') : t('Adjust')}
                                    <span className="sr-only"> {label}</span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={cn(
                                            'transition-transform',
                                            open && 'rotate-180',
                                        )}
                                    />
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}

            {active && open && (
                <fieldset
                    id={panelId}
                    disabled={!own}
                    className="flex flex-col gap-4 border-t border-border bg-surface-muted px-[18px] py-4 disabled:opacity-60"
                >
                    <legend className="sr-only">
                        {t('{{rule}} settings', { rule: label })}
                    </legend>
                    <div
                        className={cn(
                            'grid gap-4',
                            rule.mode === 'enforce' &&
                                'md:grid-cols-[1fr_12rem]',
                        )}
                    >
                        <div className="flex flex-col gap-1.5">
                            <p className="text-xs font-bold">
                                {t('Applies to')}
                            </p>
                            {definition.events.length === 1 ? (
                                <p className="text-sm text-ink-muted">
                                    {t('{{type}} only', {
                                        type: t(
                                            eventLabel(definition.events[0]),
                                        ),
                                    })}
                                </p>
                            ) : (
                                <FilterChips
                                    label={t('{{rule}} applies to', {
                                        rule: label,
                                    })}
                                    value={rule.event_types}
                                    onValueChange={(event_types) =>
                                        onChange({ ...rule, event_types })
                                    }
                                    options={definition.events.map((event) => ({
                                        value: event,
                                        label: t(eventLabel(event)),
                                    }))}
                                />
                            )}
                            {!rule.event_types.length && (
                                <p className="text-xs font-semibold text-warning-ink">
                                    {t(
                                        'Select at least one type, or the rule never runs.',
                                    )}
                                </p>
                            )}
                        </div>
                        {rule.mode === 'enforce' && (
                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor={`weight-${id}`}
                                    className="text-xs"
                                >
                                    {t('Risk points when flagged')}
                                </Label>
                                <UnitInput
                                    id={`weight-${id}`}
                                    unit={t('points')}
                                    min={1}
                                    max={100}
                                    value={rule.weight}
                                    onChange={(weight) =>
                                        onChange({ ...rule, weight })
                                    }
                                />
                            </div>
                        )}
                    </div>
                    {settings.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {settings.map(([key, [, min, max]]) => {
                                const meta = settingMeta(key);
                                const scale = meta.scale ?? 1;
                                const inputId = `${id}-${key}`;
                                return (
                                    <div
                                        key={key}
                                        className="flex flex-col gap-1.5"
                                    >
                                        <Label
                                            htmlFor={inputId}
                                            className="text-xs"
                                        >
                                            {t(meta.label)}
                                        </Label>
                                        <UnitInput
                                            id={inputId}
                                            unit={t(meta.unit)}
                                            min={min / scale}
                                            max={max / scale}
                                            step={meta.step ?? 1}
                                            value={rule.settings[key] / scale}
                                            aria-describedby={
                                                meta.help
                                                    ? `${inputId}-help`
                                                    : undefined
                                            }
                                            onChange={(value) =>
                                                onChange({
                                                    ...rule,
                                                    settings: {
                                                        ...rule.settings,
                                                        [key]: Math.round(
                                                            value * scale,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                        {meta.help && (
                                            <p
                                                id={`${inputId}-help`}
                                                className="text-xs text-ink-muted"
                                            >
                                                {t(meta.help)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </fieldset>
            )}
        </article>
    );
}
