import { MutedCell, PageHeader, ResourceDirectory } from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCustomDialogContextFactory } from '@/hooks';
import {
    useDirectoryQuery,
    type LaravelPage,
} from '@/hooks/use-directory-query';
import AppLayout from '@/layouts/app-layout';
import { useDate } from '@/lib/format';
import advertiser from '@/routes/advertiser';
import type { SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CreateTerms from './create';

type TermsRow = {
    id: number;
    description: string;
    advertiser_id: number | null;
    created_at: string;
};

type Props = SharedData & { terms: LaravelPage<TermsRow> };

export default function TermsIndexPage() {
    const { t } = useTranslation();
    const { terms, auth } = usePage<Props>().props;
    const query = useDirectoryQuery();
    const formatDate = useDate();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<Record<string, never>>();
    const isSuperAdmin = Boolean(auth.user?.is_super_admin);
    const canDelete = (row: TermsRow) =>
        isSuperAdmin || row.advertiser_id !== null;
    const openCreate = () =>
        handleDialogContextSwitch({ Component: CreateTerms });

    return (
        <AppLayout>
            <Head title={t('Campaign terms')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Campaign terms')}
                    description={t(
                        'Agreements you can attach to campaigns. Publishers accept them when they apply.',
                    )}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: advertiser.campaign.index.url(),
                        },
                        {
                            title: t('Campaign terms'),
                            href: advertiser.terms.url(),
                        },
                    ]}
                    icon={<FileText />}
                    tone="brand"
                    actions={
                        <Button onClick={openCreate}>
                            <Plus />
                            {t('Create terms')}
                        </Button>
                    }
                />
                <ResourceDirectory<TermsRow>
                    label={t('Campaign terms list')}
                    tone="brand"
                    rows={terms?.data ?? []}
                    rowKey={(row) => row.id}
                    nameHeader={t('Terms')}
                    name={(row) => row.description}
                    columns={[
                        {
                            id: 'scope',
                            header: t('Available to'),
                            cell: (row) =>
                                row.advertiser_id === null ? (
                                    <Badge variant="info">
                                        {t('All advertisers')}
                                    </Badge>
                                ) : (
                                    <Badge variant="brand">
                                        {t('Your campaigns')}
                                    </Badge>
                                ),
                        },
                        {
                            id: 'created',
                            header: t('Created'),
                            cell: (row) => (
                                <MutedCell>
                                    {formatDate(row.created_at)}
                                </MutedCell>
                            ),
                        },
                    ]}
                    actions={() => [
                        {
                            label: t('Delete'),
                            icon: <Trash2 />,
                            destructive: true,
                            hidden: (row) => !canDelete(row),
                            onSelect: (row) =>
                                confirm({
                                    title: t('Delete terms'),
                                    description: t(
                                        'Campaigns that already use these terms keep their copy. Delete them for new campaigns?',
                                    ),
                                    confirmLabel: t('Delete'),
                                    cancelLabel: t('Cancel'),
                                    variant: 'destructive',
                                    onConfirm: () =>
                                        router.delete(
                                            advertiser.terms.delete.url(row.id),
                                            { preserveScroll: true },
                                        ),
                                }),
                        },
                    ]}
                    pagination={query.pagination(terms)}
                    emptyTitle={t('No terms yet')}
                    emptyDescription={t(
                        'Create terms such as “No brand bidding” to attach them to campaigns.',
                    )}
                    emptyAction={
                        <Button onClick={openCreate}>
                            <Plus />
                            {t('Create terms')}
                        </Button>
                    }
                />
            </div>
            <FormDialog
                {...{ handleDialogContextSwitch, dialogOpen }}
                className="sm:max-w-[640px]"
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
        </AppLayout>
    );
}
