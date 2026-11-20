import { Code2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/ui/status-badge';
import { toneClasses, type DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import type { CampaignScript } from '@/types';

/** "Installed" (the SDK has loaded) or "Not seen", with the load count. */
function ScriptStatusBadge({
    script,
    withLoads = false,
}: {
    script: Pick<CampaignScript, 'install_status' | 'script_loads'>;
    withLoads?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const installed = script.install_status === 'installed';
    const loads = new Intl.NumberFormat(i18n.language).format(
        Number(script.script_loads ?? 0),
    );
    const label = installed ? t('Installed') : t('Not seen');
    return (
        <StatusBadge
            status={installed ? 'installed' : 'not_seen'}
            label={
                withLoads && installed
                    ? `${label} · ${
                          Number(script.script_loads) === 1
                              ? t('{{value}} load', { value: loads })
                              : t('{{value}} loads', { value: loads })
                      }`
                    : label
            }
        />
    );
}

const STEP_TONES: DomainTone[] = ['brand', 'partners', 'finance'];

/** Copy → Paste → Publish strip shown above the snippet. */
function InstallSteps({ className }: { className?: string }) {
    const { t } = useTranslation();
    const steps = [
        [t('Copy'), t('the snippet below')],
        [t('Paste'), t('it just before the closing </body> tag')],
        [t('Publish'), t('We confirm the first load.')],
    ];
    return (
        <ol
            aria-label={t('Install steps')}
            className={cn(
                'grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]',
                className,
            )}
        >
            {steps.map(([verb, rest], index) => (
                <li
                    key={verb}
                    className={cn(
                        'flex items-start gap-2.5 rounded-[14px] p-3.5 text-[13px]',
                        toneClasses[STEP_TONES[index]].soft,
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-full font-extrabold',
                            toneClasses[STEP_TONES[index]].strong,
                        )}
                    >
                        {index + 1}
                    </span>
                    <span className="pt-1">
                        <strong>{verb}</strong> {rest}
                    </span>
                </li>
            ))}
        </ol>
    );
}

type ScriptListCardProps = Omit<React.ComponentProps<'button'>, 'children'> & {
    script: CampaignScript;
    selected: boolean;
};

/** Selectable card in the script list (`aria-pressed` marks the open one). */
function ScriptListCard({
    script,
    selected,
    className,
    ...props
}: ScriptListCardProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            data-slot="script-list-card"
            className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-3.5 text-left text-ink transition-colors',
                'hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none',
                'aria-pressed:border-2 aria-pressed:border-analytics aria-pressed:p-[13px] aria-pressed:shadow-[0_0_0_4px_var(--color-analytics-soft)]',
                className,
            )}
            {...props}
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-analytics-soft text-analytics">
                <Code2 className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate">{script.campaign_name}</strong>
                <span className="truncate text-xs text-ink-muted">
                    {script.offer_name}
                </span>
            </span>
            <ScriptStatusBadge script={script} />
        </button>
    );
}

export { InstallSteps, ScriptListCard, ScriptStatusBadge };
