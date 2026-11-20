import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Check, FileText, Globe2, Link2, Wallet } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const stepIcons = [FileText, Wallet, Link2, Globe2];

/**
 * The four offer setup steps as tabs (create page, create dialog, edit page).
 * Each tab shows an icon tile: solid brand when current, green check when
 * done, tinted when upcoming.
 */
export function OfferStepTabs({
    step,
    onStepChange,
    disabled,
    children,
}: {
    step: number;
    onStepChange: (step: number) => void;
    disabled: boolean;
    children: ReactNode;
}) {
    const { t } = useTranslation();
    const labels = [
        t('Offer details'),
        t('Commissions'),
        t('Tracking & media'),
        t('Traffic & terms'),
    ];
    return (
        <Tabs
            value={String(step)}
            onValueChange={(value) => onStepChange(Number(value))}
            activationMode="manual"
            className="gap-0"
        >
            <TabsList
                aria-label={t('Offer setup steps')}
                className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-none border-0 border-b border-border bg-surface-muted p-3 @min-[640px]:grid-cols-4"
            >
                {labels.map((label, index) => {
                    const Icon = stepIcons[index];
                    const state =
                        step > index + 1
                            ? 'complete'
                            : step === index + 1
                              ? 'current'
                              : 'upcoming';
                    return (
                        <TabsTrigger
                            key={label}
                            disabled={disabled}
                            value={String(index + 1)}
                            className="h-auto min-h-14 justify-start gap-3 rounded-[14px] px-2.5 py-2 text-left whitespace-normal shadow-none after:hidden data-[state=active]:bg-brand-soft data-[state=active]:text-brand-ink data-[state=active]:shadow-none"
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'flex size-9 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-4',
                                    state === 'current' &&
                                        'bg-brand text-white shadow-primary',
                                    state === 'complete' &&
                                        'bg-success-soft text-success-dot',
                                    state === 'upcoming' &&
                                        'bg-surface-tint text-ink-muted',
                                )}
                            >
                                {state === 'complete' ? (
                                    <Check strokeWidth={2.6} />
                                ) : (
                                    <Icon />
                                )}
                            </span>
                            <span className="flex flex-col leading-tight">
                                <span className="text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">
                                    {t('Step {{current}} of {{total}}', {
                                        current: index + 1,
                                        total: labels.length,
                                    })}
                                </span>
                                <span className="text-sm font-bold">
                                    {label}
                                </span>
                            </span>
                        </TabsTrigger>
                    );
                })}
            </TabsList>
            <TabsContent value={String(step)} className="p-5 sm:p-8">
                {children}
            </TabsContent>
        </Tabs>
    );
}
