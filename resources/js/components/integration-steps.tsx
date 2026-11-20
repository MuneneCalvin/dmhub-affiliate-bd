import { useTranslation } from 'react-i18next';
export function IntegrationSteps() {
    const { t } = useTranslation();
    return (
        <section
            className="space-y-3 rounded-xl border bg-muted/30 p-5"
            aria-label={t('Conversion setup')}
        >
            <h2 className="font-semibold">{t('Conversion setup')}</h2>
            <p className="text-sm text-muted-foreground">
                {t(
                    'The embed tag loads the SDK. It does not submit forms or create commissions by itself.',
                )}
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
                <li>
                    {t(
                        'Send visitors through the approved publisher tracking link to record a click and preserve the referral.',
                    )}
                </li>
                <li>
                    {t(
                        'Use getReferral() to attach attribution to your existing form request. Keep customer data on your website.',
                    )}
                </li>
                <li>
                    {t(
                        'After a successful form save, send a submission event with spam checks from your backend. Accepted events automatically create conversions and pending commission.',
                    )}
                </li>
            </ol>
            <p className="text-sm">
                {t(
                    'Developer handoff: send the campaign and offer IDs, tracking link, embed tag, currency and agreed rate. Ask your network operator to issue an advertiser-scoped credential directly to your server administrator. Keep that credential out of browser code.',
                )}
            </p>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
                <a
                    className="text-primary underline"
                    href="/docs/form-campaigns"
                >
                    {t('Connect an accepted form')}
                </a>
                <a
                    className="text-primary underline"
                    href="/docs/checkout-campaigns"
                >
                    {t('Connect a paid order')}
                </a>
                <a
                    className="text-primary underline"
                    href="/docs/api-reference"
                >
                    {t('Credential setup and troubleshooting')}
                </a>
            </div>
        </section>
    );
}
