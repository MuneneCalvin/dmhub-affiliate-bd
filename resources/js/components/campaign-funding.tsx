import { IconTile } from '@/components/app/icon-tile';
import { useFormatMoney } from '@/components/finance/money';
import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Advertiser balance note in the campaign wizard (funding is optional). */
export function CampaignFunding({
    funding,
}: {
    funding?: { available_budget: string | number; currency: string } | null;
}) {
    const { t } = useTranslation();
    const money = useFormatMoney();
    return (
        <section
            className="flex gap-3.5 rounded-[14px] border border-border bg-surface-muted p-4 text-sm"
            aria-label={t('Advertiser funding')}
        >
            <IconTile size={40} tone="finance">
                <Wallet />
            </IconTile>
            <div className="flex min-w-0 flex-col gap-1.5">
                <h2 className="font-bold text-ink">
                    {t('Advertiser funding')}
                    {funding && (
                        <span className="tabular-nums">
                            {': '}
                            {money(funding.available_budget, funding.currency)}
                        </span>
                    )}
                </h2>
                <p className="text-ink-muted">
                    {t(
                        'No balance is required to create a campaign. Optional budgets are spending limits, separate from the advertiser balance shared across campaigns.',
                    )}
                </p>
                {funding && Number(funding.available_budget) <= 0 && (
                    <p className="text-ink-muted">
                        {t(
                            'Prepayment is optional unless your network requires it. Commissions can accrue before funding; a negative balance shows the amount owed.',
                        )}
                    </p>
                )}
                <a
                    href="/docs/campaign-setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start font-semibold text-brand-ink underline underline-offset-4"
                >
                    {t('Launch checklist')}
                </a>
            </div>
        </section>
    );
}
