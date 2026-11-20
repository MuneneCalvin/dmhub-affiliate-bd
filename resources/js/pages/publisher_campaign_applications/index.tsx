import { DetailList, PageHeader, SectionCard } from '@/components/app';
import { EnrollmentRate } from '@/components/campaign-publishers';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { termsText } from '@/utils/partner-terms';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    CalendarRange,
    CheckCircle2,
    Clock3,
    Megaphone,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../css/campaign-publishers.css';

type ApplicationOffer = {
    id: number;
    name: string;
    description: string | null;
    terms_version: string;
    enrollment_contract: {
        campaign_terms: unknown;
        offer_terms: unknown;
        commissions: { type: string; value: string }[];
    };
};
type ApplicationCampaign = {
    id: number;
    name: string;
    description: string | null;
    currency: string;
    start_date: string;
    end_date: string | null;
    max_publishers: number | null;
    geo_targeting: unknown;
    device_targeting: unknown;
    offers: ApplicationOffer[];
};
type ExistingEnrollment = {
    id: number;
    status: string;
    requested_offer_id: number | null;
    applied_notes: string | null;
    terms_version: string | null;
    rejection_reason: string | null;
};
export default function CampaignApplication() {
    const {
        props: { campaign, enrollment },
    } = usePage<
        SharedData & {
            campaign: ApplicationCampaign;
            enrollment: ExistingEnrollment | null;
        }
    >();
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        offer_id: String(enrollment?.requested_offer_id || ''),
        applied_notes: enrollment?.applied_notes || '',
        terms_accepted: false,
        terms_version: '',
    });
    const selected = campaign.offers.find(
        (offer) => String(offer.id) === form.data.offer_id,
    );
    const assigned = enrollment && ['A', 'I'].includes(enrollment.status);
    const changed =
        enrollment?.status === 'P' &&
        (!campaign.offers.find(
            (offer) => offer.id === enrollment.requested_offer_id,
        ) ||
            campaign.offers.find(
                (offer) => offer.id === enrollment.requested_offer_id,
            )?.terms_version !== enrollment.terms_version);
    const choose = (offer: ApplicationOffer) => {
        form.setData({
            ...form.data,
            offer_id: String(offer.id),
            terms_version: offer.terms_version,
            terms_accepted: false,
        });
        form.clearErrors();
        setOpen(true);
    };
    const date = (value: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(new Date(value));
    return (
        <AppLayout>
            <Head title={`${campaign.name} · ${t('Apply to be a partner')}`} />
            <div className="workspace-page campaign-publishers">
                <PageHeader
                    title={campaign.name}
                    description={t('Apply to be a partner')}
                    breadcrumbs={[
                        {
                            title: t('Campaigns'),
                            href: '/publisher_dashboard/dashboard',
                        },
                        {
                            title: campaign.name,
                            href: `/publishers/${campaign.id}/campaign/application`,
                        },
                    ]}
                    icon={<Megaphone />}
                    tone="brand"
                    className="mb-6"
                />
                {enrollment && (
                    <div
                        className={`publisher-notice ${changed || enrollment.status === 'R' ? 'warning' : 'info'} mb-6`}
                        role="status"
                    >
                        {changed || enrollment.status === 'R' ? (
                            <TriangleAlert size={22} />
                        ) : (
                            <Clock3 size={22} />
                        )}
                        <div>
                            <strong>
                                {t(
                                    assigned
                                        ? 'You already have an assignment in this campaign.'
                                        : enrollment.status === 'R'
                                          ? 'Your application was rejected.'
                                          : changed
                                            ? 'Updated terms need acceptance'
                                            : 'Your application is awaiting review.',
                                )}
                            </strong>
                            <p>
                                {enrollment.status === 'R'
                                    ? enrollment.rejection_reason
                                    : changed
                                      ? t(
                                            'Review the offer and accept the current terms to continue.',
                                        )
                                      : ''}
                            </p>
                        </div>
                        <Link
                            className="publisher-link-button"
                            href={`/publishers/my/campaigns/show/${enrollment.id}?tab=assignment`}
                        >
                            {t('View my assignment')}
                        </Link>
                    </div>
                )}
                <div className="publisher-apply-grid">
                    <section>
                        <p className="publisher-prewrap publisher-muted">
                            {campaign.description}
                        </p>
                        <h3 className="mt-6 text-lg font-semibold">
                            {t('Available offers')}
                        </h3>
                        <p className="publisher-muted">
                            {t(
                                'Choose an offer, tell us how you will promote it, and accept its terms.',
                            )}
                        </p>
                        <div className="mt-4 grid gap-3">
                            {campaign.offers.map((offer) => (
                                <article
                                    className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card"
                                    key={offer.id}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-base font-bold">
                                            {offer.name}
                                        </h3>
                                        <StatusBadge status="active" />
                                    </div>
                                    {offer.description && (
                                        <p className="text-sm whitespace-pre-wrap text-ink-muted">
                                            {offer.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <strong className="text-brand-ink">
                                            <EnrollmentRate
                                                rates={
                                                    offer.enrollment_contract
                                                        .commissions
                                                }
                                                currency={campaign.currency}
                                            />
                                        </strong>
                                        <Button
                                            disabled={!!assigned}
                                            onClick={() => choose(offer)}
                                        >
                                            {t(
                                                enrollment?.status === 'P'
                                                    ? 'Review terms'
                                                    : enrollment?.status === 'R'
                                                      ? 'Reapply'
                                                      : 'Apply to be a partner',
                                            )}
                                        </Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                        {!campaign.offers.length && (
                            <div className="publisher-empty">
                                <Clock3 size={26} />
                                <h3>{t('No offers available')}</h3>
                                <p>
                                    {t(
                                        'Applications will open when an active offer becomes available.',
                                    )}
                                </p>
                            </div>
                        )}
                    </section>
                    <SectionCard
                        title={t('Campaign details')}
                        icon={<CalendarRange />}
                        tone="brand"
                        className="self-start"
                    >
                        <DetailList
                            labelWidth={120}
                            rows={[
                                {
                                    label: t('Dates'),
                                    value: `${date(campaign.start_date)} – ${
                                        !campaign.end_date ||
                                        campaign.end_date.startsWith(
                                            '2100-12-31',
                                        )
                                            ? t('No end date')
                                            : date(campaign.end_date)
                                    }`,
                                },
                                {
                                    label: t('Currency'),
                                    value: campaign.currency,
                                },
                                {
                                    label: t('Geography'),
                                    value:
                                        termsText(campaign.geo_targeting) ||
                                        t('Global'),
                                },
                                {
                                    label: t('Devices'),
                                    value:
                                        termsText(campaign.device_targeting) ||
                                        t('All devices'),
                                },
                                {
                                    label: t('Publisher places'),
                                    value:
                                        campaign.max_publishers ||
                                        t('Unlimited'),
                                },
                            ]}
                        />
                        <p className="mt-5 text-[13px] text-ink-muted">
                            {t(
                                'After approval, your assignment and tracking materials will be available in My campaigns.',
                            )}
                        </p>
                    </SectionCard>
                </div>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent className="publisher-drawer">
                        <SheetHeader>
                            <SheetTitle>
                                {t(
                                    enrollment?.status === 'P'
                                        ? 'Review application terms'
                                        : 'Apply to be a partner',
                                )}
                            </SheetTitle>
                            <SheetDescription>{campaign.name}</SheetDescription>
                        </SheetHeader>
                        <div className="publisher-drawer-body">
                            <form
                                id="publisher-application"
                                className="publisher-application-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (!selected) {
                                        document
                                            .getElementById('application-offer')
                                            ?.focus();
                                        return;
                                    }
                                    form.post(
                                        `/publishers/${campaign.id}/campaign/submit/application`,
                                        { preserveScroll: true },
                                    );
                                }}
                            >
                                <label htmlFor="application-offer">
                                    {t('Requested offer')}
                                    <Select
                                        required
                                        value={form.data.offer_id}
                                        onValueChange={(value) => {
                                            const offer = campaign.offers.find(
                                                (item) =>
                                                    String(item.id) === value,
                                            );
                                            form.setData({
                                                ...form.data,
                                                offer_id: value,
                                                terms_version:
                                                    offer?.terms_version || '',
                                                terms_accepted: false,
                                            });
                                        }}
                                    >
                                        <SelectTrigger id="application-offer">
                                            <SelectValue
                                                placeholder={t(
                                                    'Select an offer...',
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campaign.offers.map((offer) => (
                                                <SelectItem
                                                    key={offer.id}
                                                    value={String(offer.id)}
                                                >
                                                    {offer.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </label>
                                {selected && (
                                    <>
                                        <div>
                                            <p className="publisher-muted">
                                                {t('Agreed rate')}
                                            </p>
                                            <strong>
                                                <EnrollmentRate
                                                    rates={
                                                        selected
                                                            .enrollment_contract
                                                            .commissions
                                                    }
                                                    currency={campaign.currency}
                                                />
                                            </strong>
                                        </div>
                                        <div className="publisher-terms">
                                            <h3 className="font-semibold">
                                                {t('Terms & conditions')}
                                            </h3>
                                            <p>
                                                {termsText(
                                                    selected.enrollment_contract
                                                        .campaign_terms,
                                                ) ||
                                                    t(
                                                        'No additional campaign terms.',
                                                    )}
                                            </p>
                                            <p>
                                                {termsText(
                                                    selected.enrollment_contract
                                                        .offer_terms,
                                                ) ||
                                                    t(
                                                        'No additional offer terms.',
                                                    )}
                                            </p>
                                            <small>
                                                {t('Terms version')}:{' '}
                                                <code>
                                                    {selected.terms_version.slice(
                                                        0,
                                                        12,
                                                    )}
                                                </code>
                                            </small>
                                        </div>
                                    </>
                                )}
                                <label htmlFor="application-note">
                                    {t('How will you promote this campaign?')}
                                    <Textarea
                                        id="application-note"
                                        required
                                        maxLength={5000}
                                        rows={5}
                                        value={form.data.applied_notes}
                                        onChange={(event) =>
                                            form.setData(
                                                'applied_notes',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={t(
                                            'Describe your audience, traffic sources, and promotional plan.',
                                        )}
                                    />
                                </label>
                                <label className="publisher-consent">
                                    <input
                                        type="checkbox"
                                        required
                                        checked={form.data.terms_accepted}
                                        onChange={(event) =>
                                            form.setData(
                                                'terms_accepted',
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    <span>
                                        {t(
                                            'I accept the current campaign terms, offer terms, and commission shown above.',
                                        )}
                                    </span>
                                </label>
                                {Object.keys(form.errors).length > 0 && (
                                    <div
                                        className="publisher-form-errors"
                                        role="alert"
                                    >
                                        {Object.values(form.errors).map(
                                            (error) => (
                                                <p key={error}>{t(error)}</p>
                                            ),
                                        )}
                                        {form.errors.terms_accepted && (
                                            <Link
                                                href={`/publishers/${campaign.id}/campaign/application`}
                                                className="underline"
                                            >
                                                {t('Reload current terms')}
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="publisher-review-actions">
                            <Button
                                form="publisher-application"
                                type="submit"
                                className="w-full"
                                disabled={
                                    form.processing ||
                                    !form.data.terms_accepted ||
                                    !selected ||
                                    !form.data.applied_notes.trim()
                                }
                            >
                                <CheckCircle2 size={18} />
                                {t(
                                    form.processing
                                        ? 'Submitting…'
                                        : enrollment?.status === 'P'
                                          ? 'Accept terms and resubmit'
                                          : 'Submit application',
                                )}
                            </Button>
                            <p className="publisher-muted mt-3 text-center text-xs">
                                {t(
                                    'Your application will be reviewed before your assignment becomes active.',
                                )}
                            </p>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}
