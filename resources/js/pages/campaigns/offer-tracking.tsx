import { PageHeader } from '@/components/app';
import { OfferTracking } from '@/components/campaign-tracking';
import AppLayout from '@/layouts/app-layout';
import type { TrackingWorkspace } from '@/types/campaign-tracking';
import { Head } from '@inertiajs/react';
import { Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function OfferTrackingPage({
    trackingWorkspace: data,
}: {
    trackingWorkspace: TrackingWorkspace;
}) {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head
                title={`${data.offer.name} · ${t('Tracking & integration')}`}
            />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={data.offer.name}
                    description={t('Tracking & integration · {{campaign}}', {
                        campaign: data.campaign_name,
                    })}
                    breadcrumbs={[
                        { title: data.campaign_name, href: data.hub_url },
                        { title: t('Tracking'), href: data.hub_url },
                        { title: data.offer.name, href: '' },
                    ]}
                    icon={<Link2 />}
                    tone="analytics"
                />
                <OfferTracking />
            </div>
        </AppLayout>
    );
}
