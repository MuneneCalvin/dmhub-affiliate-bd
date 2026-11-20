import { Link } from '@inertiajs/react';
import { BookOpen, Code2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CopyField, MetricTile, SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { useDate } from '@/lib/format';
import publisher from '@/routes/publisher';
import type { CampaignScript } from '@/types';

import { InstallSteps, ScriptStatusBadge } from './script-blocks';

/** Selected script on the Embed scripts page: status, install steps, snippet, stats. */
function ScriptDetailPanel({ script }: { script: CampaignScript }) {
    const { t, i18n } = useTranslation();
    const formatDate = useDate();
    const number = (value: number | null | undefined) =>
        new Intl.NumberFormat(i18n.language).format(Number(value ?? 0));

    return (
        <SectionCard
            title={script.campaign_name}
            description={script.offer_name}
            icon={<Code2 />}
            tone="analytics"
            action={<ScriptStatusBadge script={script} withLoads />}
            bodyClassName="flex flex-col gap-5"
            aria-live="polite"
        >
            <InstallSteps />
            <CopyField
                label={t('Embed script')}
                value={script.embed_tag}
                copiedMessage={t('Embed script copied')}
                multiline
                variant="code"
            />
            {script.tracking_link && (
                <CopyField
                    label={t('Tracking link')}
                    value={script.tracking_link}
                    copiedMessage={t('Tracking link copied')}
                />
            )}
            <div className="grid gap-3 sm:grid-cols-3">
                <MetricTile
                    label={t('Script loads')}
                    value={number(script.script_loads)}
                    tone="analytics"
                />
                <MetricTile
                    label={t('Clicks')}
                    value={number(script.clicks)}
                    tone="brand"
                />
                <MetricTile
                    label={t('Last click')}
                    value={
                        script.last_click_at
                            ? formatDate(script.last_click_at)
                            : t('None yet')
                    }
                    tone="partners"
                />
            </div>
            <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                    <Link href={publisher.scripts.show.url(script.id)}>
                        <FileText className="text-analytics" />
                        {t('Script details')}
                    </Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href={publisher.scripts.docs.url(script.id)}>
                        <BookOpen className="text-finance" />
                        {t('Documentation')}
                    </Link>
                </Button>
            </div>
        </SectionCard>
    );
}

export { ScriptDetailPanel };
