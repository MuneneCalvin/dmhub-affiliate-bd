import { Button } from '@/components/ui/button';
import networks from '@/routes/networks';
import { Link } from '@inertiajs/react';
import { Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type PendingPartnerCounts = {
    advertisers: number;
    publishers: number;
    total: number;
};

/** Partners who signed up and wait for an approver; hidden when nobody is waiting. */
export function PendingPartnersCard({
    counts,
}: {
    counts?: PendingPartnerCounts;
}) {
    const { t } = useTranslation();
    if (!counts || counts.total <= 0) {
        return null;
    }
    const href =
        counts.publishers > 0
            ? networks.pool.publishers.url()
            : networks.pool.advertisers.url();

    return (
        <section
            aria-labelledby="pending-partners-title"
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning-dot/40 bg-warning-soft p-5"
        >
            <div className="flex items-start gap-3">
                <Hourglass
                    aria-hidden="true"
                    className="mt-0.5 text-warning-ink"
                />
                <div>
                    <h2 id="pending-partners-title" className="font-semibold">
                        {t('Pending approvals')}
                    </h2>
                    <p className="text-sm font-medium">
                        {t('{{count}} waiting for approval', {
                            count: counts.total,
                        })}
                    </p>
                    <p className="flex gap-2 text-sm text-ink-muted">
                        <span>
                            {t('Advertisers: {{count}}', {
                                count: counts.advertisers,
                            })}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                            {t('Publishers: {{count}}', {
                                count: counts.publishers,
                            })}
                        </span>
                    </p>
                </div>
            </div>
            <Button asChild>
                <Link href={href}>{t('Review in the partner pool')}</Link>
            </Button>
        </section>
    );
}
