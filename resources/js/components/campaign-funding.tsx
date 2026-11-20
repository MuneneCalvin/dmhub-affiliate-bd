import { formatCurrency } from '@/utils/utils';
import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function CampaignFunding({
    funding,
}: {
    funding?: { available_budget: string | number; currency: string } | null;
}) {
    const { t } = useTranslation();
    return (
        <section
            className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm"
            aria-label={t('Advertiser funding')}
        >
            <h2 className="flex items-center gap-2 font-semibold">
                <Wallet
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                />
                {t('Advertiser funding')}
                {funding
                    ? `: ${formatCurrency(Number(funding.available_budget), funding.currency)}`
                    : ''}
            </h2>
            <p className="text-muted-foreground">
                {t(
                    'No balance is required to create a campaign. Optional budgets are spending limits, separate from the advertiser balance shared across campaigns.',
                )}
            </p>
            {funding && Number(funding.available_budget) <= 0 && (
                <p className="text-muted-foreground">
                    {t(
                        'Prepayment is optional unless your network requires it. Commissions can accrue before funding; a negative balance shows the amount owed.',
                    )}
                </p>
            )}
            <a
                href="/docs/campaign-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-primary underline underline-offset-4"
            >
                {t('Launch checklist')}
            </a>
        </section>
    );
}
