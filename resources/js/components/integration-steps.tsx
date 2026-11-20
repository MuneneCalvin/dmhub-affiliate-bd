import { SectionCard } from '@/components/app';
import { Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const linkClass =
    'inline-flex min-h-11 items-center font-semibold text-brand-ink underline underline-offset-4 hover:text-brand-hover';

/** How the embed tag turns into conversions, plus the developer hand-off. */
export function IntegrationSteps() {
    const { t } = useTranslation();
    return (
        <SectionCard
            title={t('Conversion setup')}
            description={t(
                'The embed tag loads the SDK. It does not submit forms or create commissions by itself.',
            )}
            icon={<Route />}
            tone="partners"
            bodyClassName="flex flex-col gap-4 text-sm"
        >
            <ol className="grid gap-2.5">
                {[
                    t(
                        'Send visitors through the approved publisher tracking link to record a click and preserve the referral.',
                    ),
                    t(
                        'Use getReferral() to attach attribution to your existing form request. Keep customer data on your website.',
                    ),
                    t(
                        'After a successful form save, send a submission event with spam checks from your backend. Accepted events automatically create conversions and pending commission.',
                    ),
                ].map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-partners-soft text-xs font-extrabold text-partners-ink"
                        >
                            {index + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                    </li>
                ))}
            </ol>
            <p className="rounded-[14px] bg-surface-muted p-4 text-ink-muted">
                {t(
                    'Developer handoff: send the campaign and offer IDs, tracking link, embed tag, currency and agreed rate. Ask your network operator to issue an advertiser-scoped credential directly to your server administrator. Keep that credential out of browser code.',
                )}
            </p>
            <div className="flex flex-wrap gap-x-5">
                <a className={linkClass} href="/docs/form-campaigns">
                    {t('Connect an accepted form')}
                </a>
                <a className={linkClass} href="/docs/checkout-campaigns">
                    {t('Connect a paid order')}
                </a>
                <a className={linkClass} href="/docs/api-reference">
                    {t('Credential setup and troubleshooting')}
                </a>
            </div>
        </SectionCard>
    );
}
