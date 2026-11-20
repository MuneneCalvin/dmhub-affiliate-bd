import { type DomainTone } from '@/lib/tones';
import type { FraudConfiguration, RuleMode } from '@/types/fraud';
import type { TFunction } from 'i18next';
import {
    Bot,
    Clock3,
    Coins,
    Eye,
    Fingerprint,
    Gauge,
    Hand,
    MailX,
    Repeat,
    ShieldCheck,
    Timer,
    UserSearch,
    type LucideIcon,
} from 'lucide-react';

/* Copy is English source strings, translated at render. */

export type RuleDefinition = {
    label: string;
    description: string;
    events: string[];
    settings: Record<string, [number, number, number]>;
};

export type FraudPreview = {
    sample_size: number;
    current_eligible: number;
    proposed_eligible: number;
    changed: number;
    note: string;
    rows: {
        earning_id: number;
        current: string;
        proposed: string;
        missing_evidence: string[];
    }[];
};

export type PolicyVersion = {
    id: number;
    version: number;
    reason: string;
    actor_id: number;
    actor_name?: string | null;
    created_at: string;
};

export const EVENTS: Record<string, { label: string; description: string }> = {
    submission: {
        label: 'Leads',
        description: 'Form submissions such as sign-ups and quote requests.',
    },
    purchase: {
        label: 'Purchases',
        description: 'Orders reported by the merchant’s shop.',
    },
    action: {
        label: 'Other actions',
        description: 'Any other tracked outcome, e.g. app installs.',
    },
};
export const eventLabel = (event: string) => EVENTS[event]?.label ?? event;

export const AUTOMATION_MODES: {
    value: FraudConfiguration['mode'];
    label: string;
    hint: string;
    description: string;
    icon: LucideIcon;
}[] = [
    {
        value: 'disabled',
        label: 'Manual only',
        hint: 'Every commission waits for a person',
        description:
            'Rules are not run. Every commission waits for a person to approve it.',
        icon: Hand,
    },
    {
        value: 'shadow',
        label: 'Shadow (test run)',
        hint: 'Rules record, nothing auto-approves',
        description:
            'Rules run and record what they would recommend, but nothing is approved automatically. Use this to tune rules safely.',
        icon: Eye,
    },
    {
        value: 'automatic',
        label: 'Automatic',
        hint: 'Clean commissions approve after the hold',
        description:
            'Commissions that pass every enforced rule, stay within limits and finish their hold period are approved automatically.',
        icon: ShieldCheck,
    },
];
export const automationLabel = (mode: string) =>
    AUTOMATION_MODES.find((m) => m.value === mode)?.label ?? mode;
/** Status tone for the active automation badge. */
export const automationStatus: Record<string, string> = {
    disabled: 'inactive',
    shadow: 'scheduled',
    automatic: 'active',
};

export const RULE_MODES: {
    value: RuleMode;
    label: string;
    description: string;
}[] = [
    { value: 'off', label: 'Off', description: 'Not evaluated.' },
    {
        value: 'monitor',
        label: 'Monitor',
        description: 'Recorded as evidence only. Never blocks approval.',
    },
    {
        value: 'enforce',
        label: 'Enforce',
        description:
            'Adds its risk points when it flags. Can send a commission to manual review.',
    },
];

export const RULE_ICONS: Record<
    string,
    { icon: LucideIcon; tone: DomainTone }
> = {
    honeypot: { icon: Bot, tone: 'admin' },
    merchant_spam: { icon: MailX, tone: 'admin' },
    submission_timing: { icon: Timer, tone: 'finance' },
    conversion_timing: { icon: Clock3, tone: 'finance' },
    velocity: { icon: Gauge, tone: 'analytics' },
    repetition: { icon: Repeat, tone: 'brand' },
    commission_amount: { icon: Coins, tone: 'finance' },
    publisher_history: { icon: UserSearch, tone: 'partners' },
    traffic_evidence: { icon: Fingerprint, tone: 'analytics' },
};
export const ruleIcon = (id: string) =>
    RULE_ICONS[id] ?? { icon: ShieldCheck, tone: 'brand' as DomainTone };

export type SettingMeta = {
    label: string;
    help?: string;
    unit: string;
    /** Stored value = displayed value × scale. */
    scale?: number;
    step?: number;
};
export const SETTINGS: Record<string, SettingMeta> = {
    minimum_ms: {
        label: 'Minimum time to fill the form',
        unit: 'seconds',
        scale: 1000,
        step: 0.1,
    },
    minimum_seconds: {
        label: 'Minimum time from click to conversion',
        unit: 'seconds',
    },
    window_minutes: {
        label: 'Counting window',
        help: 'How far back conversions are counted.',
        unit: 'minutes',
    },
    publisher_limit: { label: 'Max per publisher', unit: 'conversions' },
    assignment_limit: {
        label: 'Max per campaign assignment',
        unit: 'conversions',
    },
    referral_limit: {
        label: 'Max per referral link click',
        unit: 'conversions',
    },
    ip_limit: { label: 'Max per visitor IP', unit: 'conversions' },
    maximum_minor: {
        label: 'Maximum commission',
        help: 'Applied in the conversion’s own currency.',
        unit: 'amount',
        scale: 100,
        step: 0.01,
    },
    maturity_days: { label: 'Only count outcomes older than', unit: 'days' },
    minimum_outcomes: {
        label: 'Minimum classified outcomes',
        help: 'Below this the rule has too little history and cannot decide.',
        unit: 'outcomes',
    },
    maximum_fraud_percent: {
        label: 'Maximum confirmed fraud rate',
        unit: '%',
    },
};
export const settingMeta = (key: string): SettingMeta =>
    SETTINGS[key] ?? { label: key.replaceAll('_', ' '), unit: '' };

/** One plain-language sentence explaining exactly when the rule flags. */
export function ruleSummary(
    t: TFunction,
    locale: string,
    id: string,
    s: Record<string, number>,
): string {
    const n = (value: number) => new Intl.NumberFormat(locale).format(value);
    switch (id) {
        case 'honeypot':
            return t(
                'Flags a lead when the merchant reports that the hidden trap field was filled in — a strong sign of a bot.',
            );
        case 'merchant_spam':
            return t(
                'Flags a lead that the merchant’s own spam filter marked as spam.',
            );
        case 'submission_timing':
            return t(
                'Flags a lead whose form was completed in under {{count}} seconds.',
                {
                    count: s.minimum_ms / 1000,
                    seconds: n(s.minimum_ms / 1000),
                },
            );
        case 'conversion_timing':
            return t(
                'Flags a conversion that happens less than {{count}} seconds after the referral click.',
                {
                    count: s.minimum_seconds,
                    seconds: n(s.minimum_seconds),
                },
            );
        case 'velocity':
            return t(
                'Flags when one publisher has more than {{publisher}} conversions, or one campaign assignment more than {{assignment}}, within {{minutes}} minutes.',
                {
                    publisher: n(s.publisher_limit),
                    assignment: n(s.assignment_limit),
                    minutes: n(s.window_minutes),
                },
            );
        case 'repetition':
            return t(
                'Flags when one referral click leads to more than {{referral}} conversions, or one visitor IP to more than {{ip}}, within {{minutes}} minutes.',
                {
                    referral: n(s.referral_limit),
                    ip: n(s.ip_limit),
                    minutes: n(s.window_minutes),
                },
            );
        case 'commission_amount':
            return t(
                'Flags any commission above {{amount}} (in the conversion’s currency).',
                { amount: n(s.maximum_minor / 100) },
            );
        case 'publisher_history':
            return t(
                'Flags publishers whose confirmed fraud rate is above {{percent}}%, based on at least {{outcomes}} classified outcomes older than {{days}} days.',
                {
                    percent: n(s.maximum_fraud_percent),
                    outcomes: n(s.minimum_outcomes),
                    days: n(s.maturity_days),
                },
            );
        case 'traffic_evidence':
            return t(
                'Flags a conversion that has no identified device or no reported traffic source.',
            );
        default:
            return '';
    }
}

/**
 * Short threshold shown on the rule card ("8 s", "100 / 60 min"), or null for
 * rules without a number to tune.
 */
export function ruleThreshold(
    t: TFunction,
    locale: string,
    id: string,
    s: Record<string, number>,
): string | null {
    const n = (value: number) => new Intl.NumberFormat(locale).format(value);
    switch (id) {
        case 'submission_timing':
            return t('{{value}} s', { value: n(s.minimum_ms / 1000) });
        case 'conversion_timing':
            return t('{{value}} s', { value: n(s.minimum_seconds) });
        case 'velocity':
            return t('{{value}} / {{minutes}} min', {
                value: n(s.publisher_limit),
                minutes: n(s.window_minutes),
            });
        case 'repetition':
            return t('{{value}} / {{minutes}} min', {
                value: n(s.ip_limit),
                minutes: n(s.window_minutes),
            });
        case 'commission_amount':
            return t('Max {{value}}', { value: n(s.maximum_minor / 100) });
        case 'publisher_history':
            return t('{{value}}%', { value: n(s.maximum_fraud_percent) });
        default:
            return null;
    }
}

export type PreviewBreakdown = {
    pass: number;
    review: number;
    missing: number;
};

/**
 * Proposed outcomes of a preview, for the stacked bar: auto-approved, sent to
 * review by a flag, and sent to review because evidence was missing.
 */
export function previewBreakdown(preview: FraudPreview): PreviewBreakdown {
    return preview.rows.reduce<PreviewBreakdown>(
        (totals, row) => {
            if (row.proposed === 'approve') totals.pass += 1;
            else if (row.missing_evidence.length) totals.missing += 1;
            else totals.review += 1;
            return totals;
        },
        { pass: 0, review: 0, missing: 0 },
    );
}

export const OUTCOME_LABELS: Record<string, string> = {
    approve: 'Auto-approve',
    manual_review: 'Manual review',
};
export const outcomeLabel = (value: string) =>
    OUTCOME_LABELS[value] ?? value.replaceAll('_', ' ');
