import { PageHeader } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import {
    MutedCell,
    ResourceDirectory,
} from '@/components/app/resource-directory';
import { Button } from '@/components/ui/button';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import advertiser from '@/routes/advertiser';
import leadRoutes from '@/routes/leads';
import type { SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    CheckCircle2,
    Download,
    Inbox,
    PhoneCall,
    Sparkles,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type LeadRow = {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    campaign?: { id: number; name: string } | null;
    offer?: { id: number; name: string } | null;
};

type StatusCounts = Record<
    'all' | 'new' | 'contacted' | 'qualified' | 'converted' | 'lost',
    number
>;

type Props = SharedData & {
    leads: LaravelPage<LeadRow>;
    status: string;
    statusCounts: StatusCounts;
};

export default function LeadsIndex() {
    const { t } = useTranslation();
    const { leads, status, statusCounts } = usePage<Props>().props;
    const formatDate = useDate();
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const setStatus = (row: LeadRow, next: string) =>
        router.patch(
            leadRoutes.update.url(row.id),
            { status: next },
            { preserveScroll: true },
        );

    const fullName = (row: LeadRow) =>
        [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email;

    const exportUrl = leadRoutes.export.url({
        query: status && status !== 'all' ? { status } : undefined,
    });

    return (
        <AppLayout>
            <Head title={t('Leads')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Leads')}
                    description={t(
                        'Contact details reported with confirmed submissions.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        { title: t('Leads'), href: leadRoutes.index.url() },
                    ]}
                    icon={<Inbox />}
                    tone="brand"
                    actions={
                        <Button asChild variant="secondary">
                            <a href={exportUrl}>
                                <Download />
                                {t('Export')}
                            </a>
                        </Button>
                    }
                />
                <ResourceDirectory<LeadRow>
                    label={t('Lead list')}
                    tone="brand"
                    rows={leads?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Contact')}
                    name={fullName}
                    subtitle={(row) =>
                        row.phone ? `${row.email} · ${row.phone}` : row.email
                    }
                    status={(row) => row.status}
                    statusTiles={[
                        {
                            value: 'all',
                            label: t('All leads'),
                            count: statusCounts?.all,
                            tone: 'brand',
                            icon: <Inbox />,
                        },
                        {
                            value: 'new',
                            label: t('New'),
                            count: statusCounts?.new,
                            tone: 'brand',
                            icon: <Sparkles />,
                        },
                        {
                            value: 'contacted',
                            label: t('Contacted'),
                            count: statusCounts?.contacted,
                            tone: 'info',
                            icon: <PhoneCall />,
                        },
                        {
                            value: 'qualified',
                            label: t('Qualified'),
                            count: statusCounts?.qualified,
                            tone: 'warning',
                            icon: <BadgeCheck />,
                        },
                        {
                            value: 'converted',
                            label: t('Converted'),
                            count: statusCounts?.converted,
                            tone: 'success',
                            icon: <CheckCircle2 />,
                        },
                        {
                            value: 'lost',
                            label: t('Lost'),
                            count: statusCounts?.lost,
                            tone: 'neutral',
                            icon: <XCircle />,
                        },
                    ]}
                    statusValue={status ?? 'all'}
                    onStatusChange={query.setStatus}
                    columns={[
                        {
                            id: 'company',
                            header: t('Company'),
                            cell: (row) => row.company || '—',
                        },
                        {
                            id: 'campaign',
                            header: t('Campaign'),
                            cell: (row) => row.campaign?.name || '—',
                        },
                        {
                            id: 'received',
                            header: t('Received'),
                            cell: (row) => (
                                <MutedCell>
                                    {formatDate(row.created_at)}
                                </MutedCell>
                            ),
                        },
                    ]}
                    actions={() => [
                        {
                            label: t('Mark as new'),
                            icon: <Sparkles />,
                            hidden: (row) => row.status === 'new',
                            onSelect: (row) => setStatus(row, 'new'),
                        },
                        {
                            label: t('Mark as contacted'),
                            icon: <PhoneCall />,
                            tone: 'info',
                            hidden: (row) => row.status === 'contacted',
                            onSelect: (row) => setStatus(row, 'contacted'),
                        },
                        {
                            label: t('Mark as qualified'),
                            icon: <BadgeCheck />,
                            tone: 'warning',
                            hidden: (row) => row.status === 'qualified',
                            onSelect: (row) => setStatus(row, 'qualified'),
                        },
                        {
                            label: t('Mark as converted'),
                            icon: <CheckCircle2 />,
                            tone: 'success',
                            hidden: (row) => row.status === 'converted',
                            onSelect: (row) => setStatus(row, 'converted'),
                        },
                        {
                            label: t('Mark as lost'),
                            icon: <XCircle />,
                            hidden: (row) => row.status === 'lost',
                            onSelect: (row) => setStatus(row, 'lost'),
                        },
                        {
                            label: t('Delete'),
                            icon: <Trash2 />,
                            destructive: true,
                            onSelect: (row) =>
                                confirm({
                                    title: t('Delete lead'),
                                    description: t(
                                        'Delete {{name}}? The submission and its commission stay on record.',
                                        { name: fullName(row) },
                                    ),
                                    confirmLabel: t('Delete'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.delete(
                                            leadRoutes.destroy.url(row.id),
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                    ]}
                    pagination={query.pagination(leads)}
                    emptyTitle={t('No leads yet')}
                    emptyDescription={t(
                        'Leads appear here when an advertiser reports a submission with its contact details.',
                    )}
                />
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
