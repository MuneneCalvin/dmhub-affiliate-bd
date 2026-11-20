import {
    CopyField,
    DetailList,
    PageHeader,
    SectionCard,
} from '@/components/app';
import { useConfirmationDialog } from '@/components/app/confirm-dialog';
import { RejectApplicationsDialog } from '@/components/applications/reject-applications-dialog';
import { APPLICATION_STATUS } from '@/components/applications/types';
import { formatCommission } from '@/components/partner-money';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { StatusBadge } from '@/components/ui/status-badge';
import AppLayout from '@/layouts/app-layout';
import applications from '@/routes/applications';
import type { ApplicationDetails, TOffers } from '@/types';
import { trafficSourceLabels } from '@/utils/campaign-display';
import { termsText } from '@/utils/partner-terms';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    FileCheck2,
    FileText,
    Link2,
    Megaphone,
    MessageSquareText,
    Package,
    ScrollText,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ApplicationShowPage() {
    const { t, i18n } = useTranslation();
    const {
        application: a,
        campaignOffers,
        errors,
    } = usePage<{
        application: ApplicationDetails;
        campaignOffers: TOffers[];
        errors: Record<string, string>;
    }>().props;
    const [offerId, setOfferId] = useState(
        a.requested_offer_id?.toString() ?? '',
    );
    const [approving, setApproving] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const { confirm, ConfirmDialog } = useConfirmationDialog();
    const name =
        [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
    const pending = a.status === 'P';
    const dateTime = (value: string | null | undefined) =>
        value
            ? new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
              }).format(new Date(value))
            : null;

    const approve = () => {
        const offer = campaignOffers?.find((o) => String(o.id) === offerId);
        if (!offer) return;
        confirm({
            title: t('Approve application'),
            description: t(
                'Approve this application and assign the publisher to "{{offer}}"?',
                { offer: offer.name },
            ),
            confirmLabel: t('Approve'),
            cancelLabel: t('Cancel'),
            onConfirm: () => {
                setApproving(true);
                router.post(
                    applications.approve.url(a.id),
                    { offer_id: offerId },
                    {
                        preserveScroll: true,
                        onFinish: () => setApproving(false),
                    },
                );
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`${t('Application')} · ${name}`} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={name}
                    description={t('Application for {{campaign}}', {
                        campaign: a.campaign_name,
                    })}
                    breadcrumbs={[
                        {
                            title: t('Applications'),
                            href: applications.index.url(),
                        },
                        { title: name, href: applications.show.url(a.id) },
                    ]}
                    icon={<FileCheck2 />}
                    tone="admin"
                    actions={
                        pending && (
                            <Button
                                variant="secondary"
                                onClick={() => setRejectOpen(true)}
                            >
                                <X className="text-danger-ink" />
                                {t('Reject')}
                            </Button>
                        )
                    }
                >
                    <div className="mt-1">
                        <StatusBadge
                            status={APPLICATION_STATUS[a.status] ?? a.status}
                        />
                    </div>
                </PageHeader>

                {Object.keys(errors ?? {}).length > 0 && (
                    <Alert variant="danger">
                        <AlertDescription>
                            {Object.values(errors).map((error) => (
                                <p key={error}>{error}</p>
                            ))}
                        </AlertDescription>
                    </Alert>
                )}

                {pending && campaignOffers?.length > 0 && (
                    <SectionCard
                        title={t('Assign offer & approve')}
                        description={t(
                            'Approval requires the offer and current terms accepted by the publisher.',
                        )}
                        icon={<Package />}
                        tone="success"
                        footer={
                            <div className="flex justify-end">
                                <Button
                                    variant="success"
                                    onClick={approve}
                                    disabled={!offerId || approving}
                                >
                                    <CheckCircle2 />
                                    {approving
                                        ? t('Approving...')
                                        : t('Approve & Assign Offer')}
                                </Button>
                            </div>
                        }
                    >
                        <RadioCardGroup
                            name="offer_id"
                            label={t('Select offer')}
                            value={offerId}
                            onValueChange={setOfferId}
                            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
                        >
                            {campaignOffers.map((offer) => (
                                <RadioCard
                                    key={offer.id}
                                    value={String(offer.id)}
                                    title={offer.name}
                                    hint={[
                                        offer.commission_value_1 != null
                                            ? formatCommission(
                                                  offer.commission_value_1,
                                                  offer.commission_type_1,
                                                  a.currency,
                                              )
                                            : null,
                                        Number(offer.id) ===
                                        a.requested_offer_id
                                            ? t('Requested by the publisher')
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    icon={<Megaphone />}
                                    tone="brand"
                                />
                            ))}
                        </RadioCardGroup>
                    </SectionCard>
                )}

                <div className="grid gap-[18px] lg:grid-cols-3">
                    <SectionCard
                        title={t('Publisher')}
                        icon={<UserRound />}
                        tone="partners"
                    >
                        <DetailList
                            labelWidth={120}
                            rows={[
                                { label: t('Name'), value: name },
                                { label: t('Email'), value: a.email },
                                {
                                    label: t('Website'),
                                    value:
                                        a.website_url &&
                                        /^https?:\/\//i.test(a.website_url) ? (
                                            <a
                                                href={a.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-brand-ink hover:underline"
                                            >
                                                {a.website_url}
                                            </a>
                                        ) : (
                                            a.website_url
                                        ),
                                },
                                {
                                    label: t('Traffic sources'),
                                    value: (
                                        <span className="capitalize">
                                            {trafficSourceLabels(
                                                a.traffic_sources,
                                                t('Not set'),
                                            )}
                                        </span>
                                    ),
                                },
                                {
                                    label: t('Promotional methods'),
                                    value: a.promotional_methods,
                                },
                            ]}
                        />
                    </SectionCard>
                    <SectionCard
                        title={t('Campaign & offer')}
                        icon={<Megaphone />}
                        tone="brand"
                    >
                        <DetailList
                            labelWidth={120}
                            rows={[
                                {
                                    label: t('Campaign'),
                                    value: a.campaign_name,
                                },
                                {
                                    label: t(
                                        a.offer_id
                                            ? 'Assigned offer'
                                            : 'Requested offer',
                                    ),
                                    value:
                                        a.offer_name ||
                                        a.requested_offer_name ||
                                        t('Pending assignment'),
                                },
                                { label: t('Network'), value: a.network_name },
                                Boolean(a.offer_id) && {
                                    label: t('Commission'),
                                    value: formatCommission(
                                        a.commission_value_1,
                                        a.commission_type_1,
                                        a.currency,
                                    ),
                                },
                            ]}
                        />
                    </SectionCard>
                    <SectionCard
                        title={t('Status & timeline')}
                        icon={<FileText />}
                        tone="admin"
                    >
                        <DetailList
                            labelWidth={120}
                            rows={[
                                {
                                    label: t('Status'),
                                    value: (
                                        <StatusBadge
                                            status={
                                                APPLICATION_STATUS[a.status] ??
                                                a.status
                                            }
                                        />
                                    ),
                                },
                                {
                                    label: t('Applied'),
                                    value: dateTime(
                                        a.applied_at || a.created_at,
                                    ),
                                },
                                a.status === 'A' && {
                                    label: t('Approved'),
                                    value: dateTime(a.approved_at),
                                },
                                a.status === 'R' && {
                                    label: t('Rejection reason'),
                                    value: a.rejection_reason,
                                },
                            ]}
                        />
                    </SectionCard>
                </div>

                {a.applied_notes && (
                    <SectionCard
                        title={t('Message from publisher')}
                        icon={<MessageSquareText />}
                        tone="analytics"
                    >
                        <p className="rounded-[14px] bg-canvas p-3.5 text-sm break-words whitespace-pre-wrap">
                            {a.applied_notes}
                        </p>
                    </SectionCard>
                )}

                {a.terms_snapshot && (
                    <SectionCard
                        title={t('Accepted terms')}
                        description={t('Accepted at {{date}}', {
                            date: dateTime(a.terms_accepted_at) ?? '—',
                        })}
                        icon={<ScrollText />}
                        tone="neutral"
                    >
                        <div className="grid gap-3 text-sm">
                            <p className="whitespace-pre-wrap">
                                {termsText(a.terms_snapshot.campaign_terms)}
                            </p>
                            <p className="whitespace-pre-wrap">
                                {termsText(a.terms_snapshot.offer_terms)}
                            </p>
                            {a.terms_snapshot.commissions.map((rule, index) => (
                                <p key={index} className="font-semibold">
                                    {rule.type}:{' '}
                                    {formatCommission(
                                        rule.value,
                                        rule.type,
                                        a.terms_snapshot?.currency,
                                    )}
                                </p>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {a.status === 'A' && a.tracking_link && (
                    <SectionCard
                        title={t('Tracking information')}
                        icon={<Link2 />}
                        tone="analytics"
                    >
                        <div className="grid gap-3">
                            <CopyField
                                label={t('Tracking link')}
                                value={a.tracking_link}
                            />
                            {a.sub && (
                                <DetailList
                                    rows={[
                                        { label: t('Sub ID'), value: a.sub },
                                    ]}
                                />
                            )}
                        </div>
                    </SectionCard>
                )}
            </div>
            <RejectApplicationsDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                ids={[a.id]}
                applicantName={name}
            />
            <ConfirmDialog />
        </AppLayout>
    );
}
