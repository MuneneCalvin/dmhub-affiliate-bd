import {
    DetailList,
    ProfileBanner,
    SectionCard,
    type DetailRow,
    type ProfileChip,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { FormDialog } from '@/components/app/form-dialog';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import type { Tone } from '@/lib/tones';
import RejectModal from '@/pages/pool/modals/reject';
import networks from '@/routes/networks';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type PoolSection = {
    title: string;
    icon: ReactNode;
    tone: Tone;
    rows: (DetailRow | false | null | undefined | '' | 0)[];
};

/**
 * Detail page of an advertiser or publisher in the partner pool: banner with
 * Approve / Reject, and the details the partner registered with.
 */
export function PoolProfile({
    kind,
    entity,
    name,
    verified,
    chips,
    sections,
}: {
    kind: 'advertiser' | 'publisher';
    entity: { id: number };
    name: string;
    verified: boolean;
    chips: ProfileChip[];
    sections: PoolSection[];
}) {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<Record<string, unknown>>();
    const routes =
        networks.pool[kind === 'advertiser' ? 'advertisers' : 'publishers'];

    return (
        <AppLayout>
            <Head
                title={`${t(kind === 'advertiser' ? 'Advertiser' : 'Publisher')} · ${name}`}
            />
            <div className="workspace-page flex flex-col gap-[22px]">
                <Breadcrumbs
                    breadcrumbs={[
                        { title: t('Partner pool'), href: routes.url() },
                        {
                            title: t(
                                kind === 'advertiser'
                                    ? 'Advertisers'
                                    : 'Publishers',
                            ),
                            href: routes.url(),
                        },
                        { title: name, href: routes.show.url(entity.id) },
                    ]}
                />
                <ProfileBanner
                    name={name}
                    status={
                        <StatusBadge
                            status={verified ? 'verified' : 'pending'}
                            label={
                                verified ? undefined : t('Awaiting approval')
                            }
                        />
                    }
                    chips={chips}
                    actions={
                        !verified && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        handleDialogContextSwitch({
                                            Component: RejectModal,
                                            componentProps: {
                                                [kind]: entity,
                                                type: kind,
                                            },
                                        })
                                    }
                                >
                                    <X className="text-danger-ink" />
                                    {t('Reject')}
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={() =>
                                        confirm({
                                            title: t(
                                                kind === 'advertiser'
                                                    ? 'Approve advertiser'
                                                    : 'Approve publisher',
                                            ),
                                            description: t(
                                                'Add {{name}} to your network?',
                                                { name },
                                            ),
                                            confirmLabel: t('Approve'),
                                            cancelLabel: t('Cancel'),
                                            onConfirm: () =>
                                                router.post(
                                                    routes.approve.url(
                                                        entity.id,
                                                    ),
                                                ),
                                        })
                                    }
                                >
                                    <CheckCircle2 />
                                    {t('Approve & Add to Network')}
                                </Button>
                            </>
                        )
                    }
                />
                <div className="grid gap-[18px] lg:grid-cols-2">
                    {sections.map((section) => (
                        <SectionCard
                            key={section.title}
                            title={section.title}
                            icon={section.icon}
                            tone={section.tone}
                        >
                            <DetailList labelWidth={150} rows={section.rows} />
                        </SectionCard>
                    ))}
                </div>
            </div>
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
        </AppLayout>
    );
}
