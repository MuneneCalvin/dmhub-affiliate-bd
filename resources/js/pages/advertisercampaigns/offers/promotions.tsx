import { PageHeader } from '@/components/app';
import { PromotionEditor } from '@/components/promotion-editor';
import { PromotionStores } from '@/components/promotion-stores';
import AppLayout from '@/layouts/app-layout';
import advertiser from '@/routes/advertiser';
import type { PromotionStore, WorkspaceOffer } from '@/types/campaign-offers';
import { Head } from '@inertiajs/react';
import { Store, TicketPercent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../../../css/customer-promotions.css';

export default function Promotions({
    campaign,
    offer,
    stores,
}: {
    campaign: { id: number; name: string; currency: string };
    offer: Pick<WorkspaceOffer, 'id' | 'name' | 'customer_promotion'> | null;
    stores: PromotionStore[];
}) {
    const { t } = useTranslation();
    const title = t(offer ? 'Customer promotion' : 'Store connections');
    const offersUrl = `${advertiser.campaign.show.url(campaign.id)}?tab=offers`;
    return (
        <AppLayout>
            <Head title={`${title} · ${campaign.name}`} />
            <div className="workspace-page promotion-workspace flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={
                        offer
                            ? `${campaign.name} · ${offer.name}`
                            : campaign.name
                    }
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        { title: campaign.name, href: offersUrl },
                        { title, href: '' },
                    ]}
                    icon={offer ? <TicketPercent /> : <Store />}
                    tone={offer ? 'admin' : 'partners'}
                />
                {offer && (
                    <PromotionEditor
                        key={offer.id}
                        offer={offer}
                        currency={campaign.currency}
                        stores={stores}
                    />
                )}
                <PromotionStores campaign={campaign} stores={stores} />
            </div>
        </AppLayout>
    );
}
