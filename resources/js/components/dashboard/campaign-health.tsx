import {
    EmptyState,
    ProgressBar,
    SectionCard,
    StackedBar,
} from '@/components/app';
import { resolveStatus } from '@/components/ui/status-badge';
import { useMoney } from '@/lib/format';
import { HeartPulse, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type BudgetRow = { currency: string; total: number; spent: number };

type CampaignHealthProps = {
    /** campaign_status code → count, straight from the controller. */
    statusCounts: Record<string, number>;
    budgets: BudgetRow[];
    activeOffers: number;
    totalOffers: number;
};

/** Campaigns by status, budget used per currency and active offers. */
export function CampaignHealth({
    statusCounts,
    budgets,
    activeOffers,
    totalOffers,
}: CampaignHealthProps) {
    const { t } = useTranslation();
    const segments = Object.entries(statusCounts)
        .map(([status, count]) => {
            const entry = resolveStatus(status);
            return {
                key: status,
                label: entry.known ? t(entry.label) : entry.label,
                value: Number(count),
                tone: entry.tone,
            };
        })
        .sort((a, b) => b.value - a.value);
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);

    return (
        <SectionCard
            title={t('Campaign health')}
            description={t('{{count}} campaigns in your network', {
                count: total,
            })}
            icon={<HeartPulse />}
            tone="brand"
        >
            {total === 0 ? (
                <EmptyState
                    icon={<Megaphone />}
                    title={t('No campaigns yet')}
                    description={t(
                        'Campaign status and budget use appear here once campaigns exist.',
                    )}
                />
            ) : (
                <div className="flex flex-col gap-5">
                    <StackedBar
                        segments={segments}
                        label={t('Campaigns by status')}
                    />
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-4">
                        {budgets.map((row) => (
                            <BudgetLine key={row.currency} row={row} />
                        ))}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between gap-3 text-[13px]">
                                <span className="font-semibold">
                                    {t('Active offers')}
                                </span>
                                <span className="text-ink-muted tabular-nums">
                                    {t('{{active}} of {{total}}', {
                                        active: activeOffers,
                                        total: totalOffers,
                                    })}
                                </span>
                            </div>
                            <ProgressBar
                                tone="partners"
                                value={activeOffers}
                                max={Math.max(1, totalOffers)}
                                label={t('Active offers')}
                            />
                        </div>
                    </div>
                </div>
            )}
        </SectionCard>
    );
}

function BudgetLine({ row }: { row: BudgetRow }) {
    const { t } = useTranslation();
    const money = useMoney(row.currency);
    const label = t('Advertiser budget used ({{currency}})', {
        currency: row.currency,
    });
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-3 text-[13px]">
                <span className="font-semibold">{label}</span>
                <span className="text-ink-muted tabular-nums">
                    {money(row.spent, true)} / {money(row.total, true)}
                </span>
            </div>
            <ProgressBar
                tone="brand"
                value={row.spent}
                max={Math.max(row.total, row.spent, 1)}
                label={label}
            />
        </div>
    );
}
