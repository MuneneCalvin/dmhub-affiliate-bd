import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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
                className="grid h-auto w-full grid-cols-2 gap-1 rounded-none border-b bg-muted/30 p-3 @min-[640px]:grid-cols-4"
            >
                {labels.map((label, index) => (
                    <TabsTrigger
                        key={label}
                        disabled={disabled}
                        value={String(index + 1)}
                        className="h-auto min-h-14 gap-2 px-2 py-3 whitespace-normal data-[state=active]:shadow-none"
                    >
                        <span
                            aria-hidden="true"
                            className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs"
                        >
                            {step > index + 1 ? (
                                <Check className="size-3.5" />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <span className="text-sm">{label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value={String(step)} className="p-5 sm:p-8">
                {children}
            </TabsContent>
        </Tabs>
    );
}
