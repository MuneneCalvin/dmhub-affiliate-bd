import { PageHeader } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import { InfoTip } from '@/components/app/info-tip';
import {
    MutedCell,
    ResourceDirectory,
} from '@/components/app/resource-directory';
import { useCustomDialogContextFactory } from '@/hooks';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useCount, useDate } from '@/lib/format';
import RejectModal from '@/pages/pool/modals/reject';
import networks from '@/routes/networks';
import { Head, router } from '@inertiajs/react';
import { Building2, CheckCircle2, Newspaper, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type PoolPartner = {
    id: number;
    business_name?: string | null;
    industry?: string | null;
    website_name?: string | null;
    website_url?: string | null;
    monthly_visitors?: number | null;
    primary_verticals?: string | string[] | null;
    created_at?: string | null;
    user?: {
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        created_at?: string | null;
    } | null;
};

const contactName = (row: PoolPartner) =>
    [row.user?.first_name, row.user?.last_name].filter(Boolean).join(' ');

/** Unverified advertisers or publishers a network can claim (approve) or reject. */
export function PoolDirectory({
    kind,
    partners,
}: {
    kind: 'advertisers' | 'publishers';
    partners: LaravelPage<PoolPartner>;
}) {
    const { t } = useTranslation();
    const formatDate = useDate();
    const count = useCount();
    const query = useDirectoryQuery();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<Record<string, unknown>>();
    const advertisers = kind === 'advertisers';
    const routes = networks.pool[kind];
    const title = t(advertisers ? 'Advertiser pool' : 'Publisher pool');
    const name = (row: PoolPartner) =>
        row.business_name || contactName(row) || row.user?.email || '—';

    return (
        <AppLayout>
            <Head title={title} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={title}
                    description={
                        <>
                            {t(
                                advertisers
                                    ? 'Review and approve advertisers to add them to your network'
                                    : 'Review and approve publishers to add them to your network',
                            )}{' '}
                            <InfoTip term="partnerPool" />
                        </>
                    }
                    breadcrumbs={[
                        { title: t('Partner pool'), href: routes.url() },
                        {
                            title: t(
                                advertisers ? 'Advertisers' : 'Publishers',
                            ),
                            href: routes.url(),
                        },
                    ]}
                    icon={advertisers ? <Building2 /> : <Newspaper />}
                    tone="partners"
                />
                <ResourceDirectory<PoolPartner>
                    label={t(
                        advertisers
                            ? 'Advertisers awaiting approval'
                            : 'Publishers awaiting approval',
                    )}
                    tone="partners"
                    rows={partners?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t(advertisers ? 'Advertiser' : 'Publisher')}
                    name={name}
                    subtitle={(row) => row.user?.email}
                    status={() => 'pending'}
                    statusLabel={() => t('Awaiting approval')}
                    columns={[
                        {
                            id: 'contact',
                            header: t('Contact'),
                            cell: (row) => contactName(row) || '—',
                        },
                        advertisers
                            ? {
                                  id: 'industry',
                                  header: t('Industry'),
                                  cell: (row) => row.industry || '—',
                              }
                            : {
                                  id: 'visitors',
                                  header: t('Monthly visitors'),
                                  align: 'end',
                                  cell: (row) =>
                                      row.monthly_visitors
                                          ? count(row.monthly_visitors)
                                          : '—',
                              },
                        {
                            id: 'website',
                            header: t('Website'),
                            className: 'max-w-56 truncate',
                            cell: (row) => {
                                const url = advertisers
                                    ? row.website_name
                                    : row.website_url;
                                return url && /^https?:\/\//i.test(url) ? (
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-brand-ink hover:underline"
                                    >
                                        {url.replace(/^https?:\/\//i, '')}
                                    </a>
                                ) : (
                                    url || '—'
                                );
                            },
                        },
                        {
                            id: 'registered',
                            header: t('Registered'),
                            cell: (row) => {
                                const date =
                                    row.created_at ?? row.user?.created_at;
                                return (
                                    <MutedCell>
                                        {date ? formatDate(date) : '—'}
                                    </MutedCell>
                                );
                            },
                        },
                    ]}
                    href={(row) => routes.show.url(row.id)}
                    actions={() => [
                        {
                            label: t('Approve'),
                            icon: <CheckCircle2 />,
                            tone: 'success',
                            onSelect: (row) =>
                                confirm({
                                    title: t(
                                        advertisers
                                            ? 'Approve advertiser'
                                            : 'Approve publisher',
                                    ),
                                    description: t(
                                        'Add {{name}} to your network?',
                                        { name: name(row) },
                                    ),
                                    confirmLabel: t('Approve'),
                                    cancelLabel: t('Cancel'),
                                    onConfirm: () =>
                                        router.post(
                                            routes.approve.url(row.id),
                                            {},
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                        {
                            label: t('Reject'),
                            icon: <XCircle />,
                            destructive: true,
                            onSelect: (row) =>
                                handleDialogContextSwitch({
                                    Component: RejectModal,
                                    componentProps: {
                                        [advertisers
                                            ? 'advertiser'
                                            : 'publisher']: row,
                                        type: advertisers
                                            ? 'advertiser'
                                            : 'publisher',
                                    },
                                }),
                        },
                    ]}
                    pagination={query.pagination(partners)}
                    emptyTitle={t('The pool is empty')}
                    emptyDescription={t(
                        'New sign-ups that are not in a network yet appear here.',
                    )}
                />
                <FormDialog
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className="sm:max-w-[520px]"
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
                <ConfirmDialog />
            </div>
        </AppLayout>
    );
}
