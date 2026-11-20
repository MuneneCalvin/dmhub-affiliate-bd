import {
    CheckCircle2,
    CircleDollarSign,
    Clock,
    Plus,
    XCircle,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/app/section-card';
import { cn } from '@/lib/utils';

import { personName } from './invoice-document';
import type { Invoice } from './types';

type Step = {
    key: string;
    title: string;
    detail?: React.ReactNode;
    icon: React.ReactNode;
    /** done = filled tile, waiting = dashed outline. */
    state: 'done' | 'waiting';
    tone: 'brand' | 'success' | 'danger' | 'info';
};

const solid: Record<Step['tone'], string> = {
    brand: 'bg-brand',
    success: 'bg-success-dot',
    danger: 'bg-danger-dot',
    info: 'bg-info-dot',
};

function useDateTime() {
    const { i18n } = useTranslation();
    return (value: string) =>
        new Intl.DateTimeFormat(i18n.language, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
}

/** Steps an invoice went through, newest first, plus the next expected step. */
export function useInvoiceSteps(invoice: Invoice): Step[] {
    const { t } = useTranslation();
    const at = useDateTime();
    const steps: Step[] = [];
    const created = invoice.requested_at ?? invoice.created_at;

    steps.push({
        key: 'created',
        title: t('Requested'),
        detail: created ? at(created) : undefined,
        icon: <Plus />,
        state: 'done',
        tone: 'brand',
    });
    if (invoice.approved_at) {
        const by = personName(invoice.approved_by_user);
        steps.push({
            key: 'approved',
            title: t('Approved'),
            detail: by
                ? t('{{date}} by {{name}}', {
                      date: at(invoice.approved_at),
                      name: by,
                  })
                : at(invoice.approved_at),
            icon: <CheckCircle2 />,
            state: 'done',
            tone: 'info',
        });
    }
    if (invoice.paid_at) {
        steps.push({
            key: 'paid',
            title: t('Paid'),
            detail: (
                <>
                    {at(invoice.paid_at)}
                    {invoice.payment_reference && (
                        <>
                            <br />
                            {t('Ref')}: {invoice.payment_reference}
                        </>
                    )}
                </>
            ),
            icon: <CircleDollarSign />,
            state: 'done',
            tone: 'success',
        });
    }
    if (invoice.status === 'rejected') {
        steps.push({
            key: 'rejected',
            title: t('Rejected'),
            detail: invoice.rejection_reason ?? undefined,
            icon: <XCircle />,
            state: 'done',
            tone: 'danger',
        });
    }
    if (invoice.status === 'pending') {
        steps.push({
            key: 'approval',
            title: t('Approval'),
            detail: t('Waiting for review'),
            icon: <Clock />,
            state: 'waiting',
            tone: 'info',
        });
    }
    if (invoice.status === 'pending' || invoice.status === 'approved') {
        steps.push({
            key: 'payment',
            title: t('Paid'),
            detail: t('Waiting for payment'),
            icon: <CircleDollarSign />,
            state: 'waiting',
            tone: 'success',
        });
    }
    return steps.reverse();
}

/** "Status history" card for an invoice. */
export function InvoiceTimeline({
    invoice,
    children,
    className,
}: {
    invoice: Invoice;
    /** Notes under the list (e.g. what happens next). */
    children?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();
    const steps = useInvoiceSteps(invoice);
    return (
        <SectionCard
            title={t('Status history')}
            icon={<Clock />}
            tone="analytics"
            className={className}
        >
            <ol className="flex flex-col">
                {steps.map((step, index) => (
                    <li
                        key={step.key}
                        data-state={step.state}
                        className={cn(
                            'relative flex gap-3 pb-[18px] last:pb-0',
                            index < steps.length - 1 &&
                                'before:absolute before:top-8 before:bottom-1 before:left-[13px] before:w-0.5 before:bg-border',
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'flex size-7 shrink-0 items-center justify-center rounded-full [&>svg]:size-3.5',
                                step.state === 'done'
                                    ? cn(solid[step.tone], 'text-white')
                                    : 'border-2 border-dashed border-border-strong bg-surface-tint text-ink-muted',
                            )}
                        >
                            {step.state === 'done' && step.icon}
                        </span>
                        <span className="min-w-0">
                            <strong className="block">
                                {step.title}
                                {step.state === 'waiting' && (
                                    <span className="sr-only">
                                        {' '}
                                        ({t('Upcoming')})
                                    </span>
                                )}
                            </strong>
                            {step.detail && (
                                <span className="block text-xs [overflow-wrap:anywhere] text-ink-muted">
                                    {step.detail}
                                </span>
                            )}
                        </span>
                    </li>
                ))}
            </ol>
            {children && (
                <div className="mt-4 flex flex-col gap-3">{children}</div>
            )}
        </SectionCard>
    );
}
