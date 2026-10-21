/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    CustomDialogComponent,
    InfoRow,
    ReusablePageTitle,
    ReusableSearchSelect,
    useConfirmationDialog,
} from '@/dev/core';
import { useCustomDialogContextFactory } from '@/hooks';
import AppLayout from '@/layouts/app-layout';
import applications from '@/routes/applications';
import { ApplicationDetails, BreadcrumbItem, TOffers } from '@/types';
import { formatCurrency } from '@/utils/utils';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    DollarSign,
    FileText,
    Globe,
    Link2,
    Mail,
    Megaphone,
    Package,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RejectApplicationModal from './modals/reject';

const ApplicationShowPage = () => {
    const { t } = useTranslation();
    const { application, campaignOffers } = usePage<{
        application: ApplicationDetails;
        campaignOffers: TOffers[];
    }>().props;

    const [selectedOfferId, setSelectedOfferId] = useState<string>('');
    const [approving, setApproving] = useState(false);
    const { confirm, ConfirmDialog } = useConfirmationDialog();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Publisher Applications'),
            href: applications.index.url(),
        },
        {
            title: `${application.first_name} ${application.last_name}`,
            href: '',
        },
    ];

    const { handleDialogContextSwitch, dialogContent, dialogOpen } =
        useCustomDialogContextFactory<{
            application?: ApplicationDetails;
        }>();

    const getStatusBadge = (status: string) => {
        const statusMap: Record<
            string,
            {
                label: string;
                variant: 'default' | 'secondary' | 'destructive' | 'outline';
            }
        > = {
            P: { label: t('Pending'), variant: 'secondary' },
            A: { label: t('Approved'), variant: 'default' },
            R: { label: t('Rejected'), variant: 'destructive' },
        };
        const current = statusMap[status] ?? {
            label: t('Unknown'),
            variant: 'outline',
        };
        return <Badge variant={current.variant}>{current.label}</Badge>;
    };

    const formatDate = (date: string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleApprove = () => {
        if (!selectedOfferId) {
            confirm({
                title: t('Offer Required'),
                description: t(
                    'Please select an offer to assign to this publisher',
                ),
                confirmLabel: t('OK'),
                cancelLabel: t('Close'),
                onConfirm: () => {},
            });
            return;
        }

        const selectedOffer = campaignOffers?.find(
            (o) => o.id.toString() === selectedOfferId,
        );
        confirm({
            title: t('Approve Application'),
            description: `${t('Are you sure you want to approve this application and assign to')} "${selectedOffer?.name}"?`,
            confirmLabel: t('Approve'),
            cancelLabel: t('Cancel'),
            onConfirm: () => {
                setApproving(true);
                router.post(
                    applications.approve.url(application.id),
                    {
                        offer_id: selectedOfferId,
                    },
                    {
                        preserveScroll: true,
                        onFinish: () => setApproving(false),
                    },
                );
            },
        });
    };

    const offerOptions =
        campaignOffers?.map((offer: TOffers) => ({
            value: offer.id.toString(),
            label: `${offer.name} (${formatCurrency(offer.commission_value_1 ?? 0)})`,
        })) || [];

    return (
        <AppLayout>
            <Head
                title={`${t('Application')} - ${application.first_name} ${application.last_name}`}
            />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title={t('Application Details')}
                    breadcrumbs={breadcrumbs}
                >
                    {application.status === 'P' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                onClick={() =>
                                    handleDialogContextSwitch({
                                        Component: RejectApplicationModal,
                                        componentProps: {
                                            application,
                                        },
                                    })
                                }
                            >
                                {t('Reject')}
                            </Button>
                        </div>
                    )}
                </ReusablePageTitle>

                <div className="w-full">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    {t('Publisher Information')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Details about the applicant')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Name')}
                                    value={`${application.first_name} ${application.last_name}`}
                                    icon={User}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Email')}
                                    value={application.email}
                                    icon={Mail}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Website')}
                                    value={
                                        application.website_url ? (
                                            <a
                                                href={application.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {application.website_url}
                                            </a>
                                        ) : (
                                            'N/A'
                                        )
                                    }
                                    icon={Globe}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Traffic Sources')}
                                    value={application.traffic_sources || 'N/A'}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Promotional Methods')}
                                    value={
                                        application.promotional_methods || 'N/A'
                                    }
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5" />
                                    {t('Campaign & Offer')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Applied campaign details')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Campaign')}
                                    value={application.campaign_name}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Assigned Offer')}
                                    value={
                                        application.offer_name || (
                                            <Badge
                                                variant="outline"
                                                className="border-yellow-600 text-yellow-600"
                                            >
                                                {t('Pending Assignment')}
                                            </Badge>
                                        )
                                    }
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Network')}
                                    value={application.network_name}
                                />
                                {application.offer_id && (
                                    <>
                                        <Separator />
                                        <InfoRow
                                            label={t('Commission 1')}
                                            value={
                                                application.commission_value_1 ??
                                                'N/A'
                                            }
                                            icon={DollarSign}
                                        />
                                        <Separator />
                                        <InfoRow
                                            label={t('Commission 2')}
                                            value={
                                                application.commission_value_2 ??
                                                'N/A'
                                            }
                                            icon={DollarSign}
                                        />
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    {t('Application Status')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Current status and timeline')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <InfoRow
                                    label={t('Status')}
                                    value={getStatusBadge(application.status)}
                                />
                                <Separator />
                                <InfoRow
                                    label={t('Applied At')}
                                    value={formatDate(
                                        application.applied_at ||
                                            application.created_at,
                                    )}
                                    icon={Calendar}
                                />
                                {application.status === 'A' && (
                                    <>
                                        <Separator />
                                        <InfoRow
                                            label={t('Approved At')}
                                            value={formatDate(
                                                application.approved_at,
                                            )}
                                            icon={Calendar}
                                        />
                                    </>
                                )}
                                {application.status === 'R' &&
                                    application.rejection_reason && (
                                        <>
                                            <Separator />
                                            <InfoRow
                                                label={t('Rejection Reason')}
                                                value={
                                                    application.rejection_reason
                                                }
                                            />
                                        </>
                                    )}
                            </CardContent>
                        </Card>

                        {/* Offer Assignment Section - Only for pending applications */}
                        {application.status === 'P' &&
                            campaignOffers &&
                            campaignOffers.length > 0 && (
                                <Card className="border-green-200 bg-green-50/50 md:col-span-2 lg:col-span-3 dark:border-green-900 dark:bg-green-900/20">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                            <Package className="h-5 w-5" />
                                            {t('Assign Offer & Approve')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Select an offer to assign to this publisher before approving',
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label className="mb-2 block">
                                                    {t('Select Offer')} *
                                                </Label>
                                                <ReusableSearchSelect
                                                    id="offer_id"
                                                    label=""
                                                    data={offerOptions}
                                                    placeholder={t(
                                                        'Select an offer...',
                                                    )}
                                                    value={selectedOfferId}
                                                    onChange={
                                                        setSelectedOfferId
                                                    }
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    onClick={handleApprove}
                                                    className="w-full bg-green-600 hover:bg-green-700 md:w-auto"
                                                    disabled={
                                                        !selectedOfferId ||
                                                        approving
                                                    }
                                                >
                                                    {approving
                                                        ? t('Approving...')
                                                        : t(
                                                              'Approve & Assign Offer',
                                                          )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Show available offers preview */}
                                        <div className="mt-4">
                                            <Label className="mb-2 block text-sm text-muted-foreground">
                                                {t(
                                                    'Available Offers for this Campaign',
                                                )}
                                                :
                                            </Label>
                                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                                {campaignOffers.map(
                                                    (offer: TOffers) => (
                                                        <div
                                                            key={offer.id}
                                                            className={`cursor-pointer rounded-lg border p-3 transition-all ${
                                                                selectedOfferId ===
                                                                offer.id.toString()
                                                                    ? 'border-green-500 bg-green-100 dark:bg-green-900/40'
                                                                    : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'
                                                            }`}
                                                            onClick={() =>
                                                                setSelectedOfferId(
                                                                    offer.id.toString(),
                                                                )
                                                            }
                                                        >
                                                            <div className="font-semibold">
                                                                {offer.name}
                                                            </div>
                                                            {offer.description && (
                                                                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                                                    {
                                                                        offer.description
                                                                    }
                                                                </p>
                                                            )}
                                                            <div className="mt-2 flex gap-2 text-sm">
                                                                {offer.commission_value_1 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-green-600"
                                                                    >
                                                                        {formatCurrency(
                                                                            offer.commission_value_1,
                                                                        )}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                        {application.applied_notes && (
                            <Card className="md:col-span-2 lg:col-span-3">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        {t('Application Notes')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Notes submitted by the publisher')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                                        {application.applied_notes}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {application.status === 'A' &&
                            application.tracking_link && (
                                <Card className="md:col-span-2 lg:col-span-3">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Link2 className="h-5 w-5" />
                                            {t('Tracking Information')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Tracking link generated for this application',
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <InfoRow
                                            label={t('Tracking Link')}
                                            value={
                                                <code className="rounded bg-muted px-2 py-1 text-sm break-all">
                                                    {application.tracking_link}
                                                </code>
                                            }
                                        />
                                        {application.sub && (
                                            <>
                                                <Separator />
                                                <InfoRow
                                                    label={t('Sub ID')}
                                                    value={application.sub}
                                                />
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                    </div>
                </div>

                <CustomDialogComponent
                    {...{ handleDialogContextSwitch, dialogOpen }}
                    className="sm:max-w-[500px]"
                >
                    {dialogContent?.Component && (
                        <dialogContent.Component
                            {...{
                                componentProps: dialogContent.componentProps,
                                handleDialogContextSwitch,
                            }}
                        />
                    )}
                </CustomDialogComponent>

                <ConfirmDialog />
            </div>
        </AppLayout>
    );
};

export default ApplicationShowPage;
