import { MutedCell, PageHeader, ResourceDirectory } from '@/components/app';
import { FormDialog } from '@/components/app/form-dialog';
import {
    CommissionPill,
    formatRate,
    offerStatusKey,
} from '@/components/campaigns';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useCount, useDate } from '@/lib/format';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import type { SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, Code2, Megaphone, QrCode, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QrCodeModal from './modals/qrcode';

type AssignmentRow = {
    publisher_campaign_id: number;
    campaign_name: string;
    name: string;
    network_name: string;
    currency: string;
    commission_type_1: string | null;
    commission_value_1: string | number | null;
    offer_status: string;
    expires_at: string | null;
    total_clicks: number;
    total_conversions: number;
    earnings_per_click: number;
};

type Props = SharedData & { campaigns: LaravelPage<AssignmentRow> };

export default function MyCampaignsIndexPage() {
    const { t, i18n } = useTranslation();
    const { campaigns } = usePage<Props>().props;
    const query = useDirectoryQuery();
    const count = useCount();
    const formatDate = useDate();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            campaignId?: number;
            campaignName?: string;
        }>();
    const money = (value: number, currency: string) =>
        new Intl.NumberFormat(i18n.language, {
            style: 'currency',
            currency: currency || 'EUR',
        }).format(value);

    return (
        <AppLayout>
            <Head title={t('My campaigns')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('My campaigns')}
                    description={t(
                        'Campaigns you were approved for, with your tracking tools.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('My campaigns'),
                            href: publishers.my.campaign.url(),
                        },
                    ]}
                    icon={<Megaphone />}
                    tone="brand"
                    actions={
                        <Button variant="secondary" asChild>
                            <Link href="/dashboard">
                                <Store />
                                {t('Find more campaigns')}
                            </Link>
                        </Button>
                    }
                />
                <ResourceDirectory<AssignmentRow>
                    label={t('My campaign list')}
                    tone="brand"
                    rows={campaigns?.data ?? []}
                    rowKey={(row) => row.publisher_campaign_id}
                    nameHeader={t('Campaign')}
                    name={(row) => row.campaign_name}
                    subtitle={(row) => row.name}
                    status={(row) => offerStatusKey(row.offer_status)}
                    columns={[
                        {
                            id: 'commission',
                            header: t('Commission'),
                            cell: (row) =>
                                row.commission_type_1 ? (
                                    <span className="inline-flex items-center gap-2 font-bold tabular-nums">
                                        <CommissionPill
                                            type={row.commission_type_1}
                                        />
                                        {formatRate(
                                            row.commission_type_1,
                                            row.commission_value_1,
                                            (value) =>
                                                money(value, row.currency),
                                        )}
                                    </span>
                                ) : (
                                    '—'
                                ),
                        },
                        {
                            id: 'clicks',
                            header: t('Clicks'),
                            align: 'end',
                            cell: (row) => count(row.total_clicks),
                        },
                        {
                            id: 'conversions',
                            header: t('Conversions'),
                            align: 'end',
                            cell: (row) => count(row.total_conversions),
                        },
                        {
                            id: 'epc',
                            header: t('EPC'),
                            align: 'end',
                            cell: (row) =>
                                money(
                                    Number(row.earnings_per_click ?? 0),
                                    row.currency,
                                ),
                        },
                        {
                            id: 'expires',
                            header: t('Offer ends'),
                            cell: (row) => (
                                <MutedCell>
                                    {row.expires_at
                                        ? formatDate(row.expires_at)
                                        : t('No end date')}
                                </MutedCell>
                            ),
                        },
                    ]}
                    href={(row) =>
                        publishers.my.campaign.show.url(
                            row.publisher_campaign_id,
                        )
                    }
                    actions={() => [
                        {
                            label: t('QR code'),
                            icon: <QrCode />,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: QrCodeModal,
                                    componentProps: {
                                        campaignId: row.publisher_campaign_id,
                                        campaignName: row.campaign_name,
                                    },
                                }),
                        },
                        {
                            label: t('Embed script'),
                            icon: <Code2 />,
                            tone: 'analytics',
                            onSelect: (row) =>
                                router.visit(
                                    publisher.scripts.show.url(
                                        row.publisher_campaign_id,
                                    ),
                                ),
                        },
                        {
                            label: t('View docs'),
                            icon: <BookOpen />,
                            onSelect: (row) =>
                                router.visit(
                                    publisher.scripts.docs.url(
                                        row.publisher_campaign_id,
                                    ),
                                ),
                        },
                    ]}
                    pagination={query.pagination(campaigns)}
                    emptyTitle={t('No approved campaigns yet')}
                    emptyDescription={t(
                        'Apply to campaigns in the marketplace. Approved campaigns appear here with your links.',
                    )}
                    emptyAction={
                        <Button asChild>
                            <Link href="/dashboard">
                                <Store />
                                {t('Open the marketplace')}
                            </Link>
                        </Button>
                    }
                />
            </div>
            <FormDialog
                {...{ handleDialogContextSwitch, dialogOpen }}
                className="sm:max-w-md"
            >
                {dialogContent?.Component && (
                    <dialogContent.Component
                        {...{
                            componentProps: dialogContent.componentProps,
                            handleDialogContextSwitch,
                        }}
                    />
                )}
            </FormDialog>
        </AppLayout>
    );
}
