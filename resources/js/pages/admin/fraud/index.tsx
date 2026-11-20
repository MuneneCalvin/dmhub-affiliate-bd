import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { FraudConfiguration, FraudRule, RuleMode } from '@/types/fraud';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import type { TFunction } from 'i18next';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Eye,
    FlaskConical,
    History,
    Info,
    Loader2,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';

type Definition = {
    label: string;
    description: string;
    events: string[];
    settings: Record<string, [number, number, number]>;
};
type Props = {
    networks: { id: number; network_name: string }[];
    networkId: number | null;
    campaignId: number | null;
    campaigns: { id: number; name: string }[];
    assignments: { id: number; label: string }[];
    definitions: Record<string, Definition>;
    currencies: string[];
    effective: { configuration: FraudConfiguration };
    inherited: FraudConfiguration;
    configuration: Partial<FraudConfiguration>;
    activeVersionId: number | null;
    history: {
        id: number;
        version: number;
        reason: string;
        actor_id: number;
        created_at: string;
    }[];
    statistics: {
        sample_size: number;
        rules: {
            id: string;
            label: string;
            evaluated: number;
            flagged: number;
            sole_enforced_trigger: number;
            reviewer_disagreements: number;
            confirmed_legitimate: number;
            confirmed_fraud: number;
        }[];
    };
    health: { queued: number; waiting: number; errors: number };
};
type Preview = {
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

/* ------------------------------------------------------------------ */
/* Copy & metadata (English source strings; translated at render)      */
/* ------------------------------------------------------------------ */

const EVENTS: Record<string, { label: string; description: string }> = {
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
const eventLabel = (event: string) => EVENTS[event]?.label ?? event;

const AUTOMATION_MODES: {
    value: FraudConfiguration['mode'];
    label: string;
    description: string;
    icon: typeof ShieldCheck;
}[] = [
    {
        value: 'disabled',
        label: 'Manual only',
        description:
            'Rules are not run. Every commission waits for a person to approve it.',
        icon: XCircle,
    },
    {
        value: 'shadow',
        label: 'Shadow (test run)',
        description:
            'Rules run and record what they would recommend, but nothing is approved automatically. Use this to tune rules safely.',
        icon: Eye,
    },
    {
        value: 'automatic',
        label: 'Automatic',
        description:
            'Commissions that pass every enforced rule, stay within limits and finish their hold period are approved automatically.',
        icon: ShieldCheck,
    },
];
const automationLabel = (mode: string) =>
    AUTOMATION_MODES.find((m) => m.value === mode)?.label ?? mode;

const RULE_MODES: { value: RuleMode; label: string; description: string }[] = [
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

type SettingMeta = {
    label: string;
    help?: string;
    unit: string;
    /** Stored value = displayed value × scale. */
    scale?: number;
    step?: number;
};
const SETTINGS: Record<string, SettingMeta> = {
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
const settingMeta = (key: string): SettingMeta =>
    SETTINGS[key] ?? { label: key.replaceAll('_', ' '), unit: '' };

/** One plain-language sentence explaining exactly when the rule flags. */
function ruleSummary(
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

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Section({
    step,
    title,
    description,
    action,
    children,
}: {
    step?: number;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border bg-card">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                <div className="flex gap-3">
                    {step && (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {step}
                        </span>
                    )}
                    <div>
                        <h2 className="font-semibold">{title}</h2>
                        {description && (
                            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action}
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

/** Input with a unit shown inside the right edge. */
function UnitInput({
    id,
    unit,
    value,
    onChange,
    min,
    max,
    step = 1,
    ...rest
}: {
    id?: string;
    unit: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    'aria-label'?: string;
}) {
    return (
        <div className="relative">
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step={step}
                value={Number.isFinite(value) ? value : ''}
                onChange={(e) => onChange(Number(e.target.value))}
                className="pr-24 tabular-nums"
                {...rest}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                {unit}
            </span>
        </div>
    );
}

const DURATION_UNITS = [
    { value: 'minutes', factor: 1 },
    { value: 'hours', factor: 60 },
    { value: 'days', factor: 1440 },
] as const;
type DurationUnit = (typeof DURATION_UNITS)[number]['value'];
const bestUnit = (minutes: number): DurationUnit =>
    minutes > 0 && minutes % 1440 === 0
        ? 'days'
        : minutes > 0 && minutes % 60 === 0
          ? 'hours'
          : 'minutes';

/** Number + unit picker; always stores minutes. */
function DurationInput({
    id,
    minutes,
    onChange,
    disabled,
    label,
}: {
    id: string;
    minutes: number;
    onChange: (minutes: number) => void;
    disabled?: boolean;
    label: string;
}) {
    const { t } = useTranslation();
    const [unit, setUnit] = useState<DurationUnit>(() => bestUnit(minutes));
    const factor = DURATION_UNITS.find((u) => u.value === unit)!.factor;
    return (
        <div className="flex gap-2">
            <Input
                id={id}
                type="number"
                min={0}
                step="any"
                disabled={disabled}
                aria-label={label}
                className="tabular-nums"
                value={minutes / factor}
                onChange={(e) =>
                    onChange(Math.round(Number(e.target.value) * factor))
                }
            />
            <Select
                value={unit}
                disabled={disabled}
                onValueChange={(v) => setUnit(v as DurationUnit)}
            >
                <SelectTrigger
                    className="w-28 shrink-0"
                    aria-label={t('{{field}} unit', { field: label })}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {DURATION_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                            {t(u.value)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    disabled,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <label
            className={cn(
                'inline-flex cursor-pointer items-center gap-2 text-sm',
                disabled && 'cursor-not-allowed opacity-60',
            )}
        >
            <input
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span
                aria-hidden
                className="relative h-5 w-9 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
            />
            {label}
        </label>
    );
}

function Chip({
    checked,
    onChange,
    children,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children: ReactNode;
}) {
    return (
        <label
            className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted',
            )}
        >
            <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            {checked && <CheckCircle2 className="size-3.5" aria-hidden />}
            {children}
        </label>
    );
}

function Hint({ children }: { children: ReactNode }) {
    return (
        <p className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{children}</span>
        </p>
    );
}

const MODE_TONE: Record<string, string> = {
    disabled: 'bg-muted text-foreground',
    shadow: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    automatic:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function FraudPolicies(props: Props) {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Fraud rules')} />
            <div className="workspace-page flex flex-col gap-6">
                <ReusablePageTitle
                    title={t('Fraud rules')}
                    description={t(
                        'Decide which commissions can be approved automatically, and which rules send a commission to manual review.',
                    )}
                    breadcrumbs={[
                        { title: t('Finance'), href: '/finance' },
                        { title: t('Fraud rules'), href: '/finance/fraud' },
                    ]}
                />
                {props.networkId ? (
                    <PolicyEditor
                        key={`${props.networkId}:${props.campaignId}:${props.activeVersionId}`}
                        {...props}
                    />
                ) : (
                    <p className="rounded-xl border bg-card p-6 text-muted-foreground">
                        {t('Create a network before configuring fraud rules.')}
                    </p>
                )}
            </div>
        </AppLayout>
    );
}

function ScopeBar(props: Props) {
    const { t } = useTranslation();
    const { networkId, campaignId } = props;
    return (
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
            {props.networks.length > 1 && (
                <div className="space-y-1.5">
                    <Label htmlFor="scope-network">{t('Network')}</Label>
                    <Select
                        value={String(networkId ?? '')}
                        onValueChange={(value) =>
                            router.get('/finance/fraud', { network_id: value })
                        }
                    >
                        <SelectTrigger id="scope-network" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {props.networks.map((n) => (
                                <SelectItem key={n.id} value={String(n.id)}>
                                    {n.network_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div
                className={cn(
                    'space-y-1.5',
                    props.networks.length <= 1 && 'sm:col-span-2',
                )}
            >
                <Label htmlFor="scope-campaign">{t('Policy scope')}</Label>
                <Select
                    value={campaignId ? String(campaignId) : 'network'}
                    onValueChange={(value) =>
                        router.get('/finance/fraud', {
                            network_id: networkId,
                            campaign_id:
                                value === 'network' ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger id="scope-campaign" className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="network">
                            {t('Network defaults (all campaigns)')}
                        </SelectItem>
                        {props.campaigns.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    {campaignId
                        ? t(
                              'Campaign settings override the network defaults only where you choose to.',
                          )
                        : t(
                              'Network defaults apply to every campaign unless a campaign overrides them.',
                          )}
                </p>
            </div>
        </div>
    );
}

function StatusStrip({
    mode,
    health,
    onReassess,
}: {
    mode: FraudConfiguration['mode'];
    health: Props['health'];
    onReassess: () => void;
}) {
    const { t } = useTranslation();
    const tiles = [
        {
            label: 'Awaiting checks',
            value: health.queued,
            icon: Loader2,
            tone: 'text-muted-foreground',
        },
        {
            label: 'On hold',
            value: health.waiting,
            icon: Clock,
            tone: 'text-amber-600',
        },
        {
            label: 'Failed checks',
            value: health.errors,
            icon: AlertTriangle,
            tone: health.errors ? 'text-destructive' : 'text-muted-foreground',
        },
    ];
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                    {t('Active automation')}
                </p>
                <span
                    className={cn(
                        'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium',
                        MODE_TONE[mode],
                    )}
                >
                    {t(automationLabel(mode))}
                </span>
            </div>
            {tiles.map((tile) => (
                <div
                    key={tile.label}
                    className="flex items-start justify-between rounded-xl border bg-card p-4"
                >
                    <div>
                        <p className="text-xs text-muted-foreground">
                            {t(tile.label)}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                            {tile.value}
                        </p>
                    </div>
                    <tile.icon className={cn('size-4', tile.tone)} />
                </div>
            ))}
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 lg:col-span-4">
                <p className="text-xs text-muted-foreground">
                    {t(
                        'Authentication, attribution and ledger safeguards always stay active, whatever you configure here.',
                    )}
                </p>
                <Button variant="outline" size="sm" onClick={onReassess}>
                    <RefreshCw />
                    {t('Reassess pending with changed policies')}
                </Button>
            </div>
        </div>
    );
}

function PolicyEditor(props: Props) {
    const { t } = useTranslation();
    const {
        networkId,
        campaignId,
        effective,
        inherited,
        configuration,
        definitions,
    } = props;
    const form = useForm({
        network_id: networkId,
        campaign_id: campaignId,
        configuration: configuration as Partial<FraudConfiguration>,
        expected_version: props.activeVersionId,
        reason: '',
    });
    const [tab, setTab] = useState('policy');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [previewing, setPreviewing] = useState(false);
    const [assignmentQuery, setAssignmentQuery] = useState('');
    const [restoreVersion, setRestoreVersion] = useState<
        Props['history'][number] | null
    >(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const saveRef = useRef<HTMLDivElement>(null);
    const [saveVisible, setSaveVisible] = useState(false);
    useEffect(() => {
        const node = saveRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(([entry]) =>
            setSaveVisible(entry.isIntersecting),
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [tab]);

    const resolved = {
        ...(campaignId ? inherited : effective.configuration),
        ...form.data.configuration,
        rules: {
            ...(campaignId ? inherited.rules : effective.configuration.rules),
            ...form.data.configuration.rules,
        },
    };
    const setConfig = (next: Partial<FraudConfiguration>) => {
        form.setData('configuration', next);
        setPreview(null);
    };
    const setGeneral = <K extends keyof FraudConfiguration>(
        key: K,
        value: FraudConfiguration[K],
    ) => setConfig({ ...form.data.configuration, [key]: value });
    const generalKeys = [
        'mode',
        'max_score',
        'wait_minutes',
        'event_types',
        'assignment_ids',
        'limits',
    ] as const;
    const generalOverride =
        !campaignId ||
        generalKeys.some((key) => key in form.data.configuration);
    const updateRule = (id: string, value: FraudRule) =>
        setGeneral('rules', { ...form.data.configuration.rules, [id]: value });
    const scope = { network_id: networkId, campaign_id: campaignId };

    const enforcedWeight = useMemo(
        () =>
            Object.values(resolved.rules)
                .filter((rule) => rule.mode === 'enforce')
                .reduce((sum, rule) => sum + rule.weight, 0),
        [resolved.rules],
    );
    const enforcedCount = Object.values(resolved.rules).filter(
        (rule) => rule.mode === 'enforce',
    ).length;

    const runPreview = async () => {
        setPreviewing(true);
        setPreviewError('');
        try {
            const response = await axios.post<Preview>(
                '/finance/fraud/preview',
                { ...scope, configuration: form.data.configuration },
            );
            setPreview(response.data);
            requestAnimationFrame(() =>
                previewRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                }),
            );
        } catch (error) {
            setPreviewError(
                axios.isAxiosError(error)
                    ? Object.values(
                          error.response?.data?.errors ?? {
                              message:
                                  error.response?.data?.message ??
                                  t('Preview failed.'),
                          },
                      )
                          .flat()
                          .join(' ')
                    : t('Preview failed.'),
            );
        } finally {
            setPreviewing(false);
        }
    };

    const filteredAssignments = props.assignments.filter((a) =>
        a.label.toLowerCase().includes(assignmentQuery.toLowerCase()),
    );
    const allAssignments = resolved.assignment_ids.length === 0;

    return (
        <>
            <ScopeBar {...props} />
            <StatusStrip
                mode={effective.configuration.mode}
                health={props.health}
                onReassess={() =>
                    router.post('/finance/fraud/reassess', scope, {
                        preserveScroll: true,
                    })
                }
            />

            <Tabs value={tab} onValueChange={setTab} className="gap-6">
                <TabsList className="w-full justify-start sm:w-fit">
                    <TabsTrigger value="policy">{t('Policy')}</TabsTrigger>
                    <TabsTrigger value="performance">
                        {t('Rule performance')}
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        {t('History')}
                        {props.history.length > 0 && (
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-xs tabular-nums">
                                {props.history.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ---------------- Policy ---------------- */}
                <TabsContent value="policy">
                    <form
                        ref={formRef}
                        className="space-y-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/finance/fraud/policy', {
                                preserveScroll: true,
                            });
                        }}
                    >
                        {!!campaignId && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card p-4">
                                <div>
                                    <p className="text-sm font-medium">
                                        {t(
                                            'Approval settings for this campaign',
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {generalOverride
                                            ? t(
                                                  'This campaign uses its own automation, coverage and limits below.',
                                              )
                                            : t(
                                                  'Automation, coverage and limits are inherited from the network defaults.',
                                              )}
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-primary"
                                        checked={generalOverride}
                                        onChange={(e) => {
                                            const next = {
                                                ...form.data.configuration,
                                            };
                                            if (e.target.checked) {
                                                Object.assign(
                                                    next,
                                                    Object.fromEntries(
                                                        generalKeys.map(
                                                            (key) => [
                                                                key,
                                                                resolved[key],
                                                            ],
                                                        ),
                                                    ),
                                                );
                                            } else {
                                                generalKeys.forEach(
                                                    (key) => delete next[key],
                                                );
                                            }
                                            setConfig(next);
                                        }}
                                    />
                                    {t('Override network approval settings')}
                                </label>
                            </div>
                        )}

                        <fieldset
                            disabled={!generalOverride}
                            className="space-y-6 disabled:opacity-60"
                        >
                            {/* 1. Automation */}
                            <Section
                                step={1}
                                title={t('Automation mode')}
                                description={t(
                                    'Choose what happens after the rules have checked a commission.',
                                )}
                            >
                                <div
                                    role="radiogroup"
                                    aria-label={t('Automation mode')}
                                    className="grid gap-3 md:grid-cols-3"
                                >
                                    {AUTOMATION_MODES.map((option) => {
                                        const checked =
                                            resolved.mode === option.value;
                                        return (
                                            <label
                                                key={option.value}
                                                className={cn(
                                                    'flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                                                    checked
                                                        ? 'border-primary bg-primary/5'
                                                        : 'hover:bg-muted/50',
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="automation-mode"
                                                        className="size-4 accent-primary"
                                                        checked={checked}
                                                        onChange={() =>
                                                            setGeneral(
                                                                'mode',
                                                                option.value,
                                                            )
                                                        }
                                                    />
                                                    <option.icon className="size-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">
                                                        {t(option.label)}
                                                    </span>
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {t(option.description)}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {!!campaignId &&
                                    resolved.mode === 'automatic' &&
                                    inherited.mode !== 'automatic' && (
                                        <p className="mt-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                                            <AlertTriangle className="size-3.5 shrink-0" />
                                            {t(
                                                'The network is set to “{{mode}}”, which takes precedence. This campaign won’t auto-approve until the network is set to Automatic.',
                                                {
                                                    mode: t(
                                                        automationLabel(
                                                            inherited.mode,
                                                        ),
                                                    ),
                                                },
                                            )}
                                        </p>
                                    )}
                            </Section>

                            {/* 2. Coverage */}
                            <Section
                                step={2}
                                title={t('What can be auto-approved')}
                                description={t(
                                    'Pick the conversion types and publishers that are eligible, and how long to wait before approving.',
                                )}
                            >
                                <div className="space-y-6">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        {Object.keys(EVENTS).map((event) => {
                                            const enabled =
                                                resolved.event_types.includes(
                                                    event,
                                                );
                                            return (
                                                <div
                                                    key={event}
                                                    className={cn(
                                                        'space-y-3 rounded-lg border p-4',
                                                        enabled &&
                                                            'border-primary/40',
                                                    )}
                                                >
                                                    <label className="flex cursor-pointer items-start gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 size-4 accent-primary"
                                                            checked={enabled}
                                                            onChange={(e) =>
                                                                setGeneral(
                                                                    'event_types',
                                                                    e.target
                                                                        .checked
                                                                        ? [
                                                                              ...resolved.event_types,
                                                                              event,
                                                                          ]
                                                                        : resolved.event_types.filter(
                                                                              (
                                                                                  v,
                                                                              ) =>
                                                                                  v !==
                                                                                  event,
                                                                          ),
                                                                )
                                                            }
                                                        />
                                                        <span>
                                                            <span className="block text-sm font-medium">
                                                                {t(
                                                                    EVENTS[
                                                                        event
                                                                    ].label,
                                                                )}
                                                            </span>
                                                            <span className="block text-xs text-muted-foreground">
                                                                {t(
                                                                    EVENTS[
                                                                        event
                                                                    ]
                                                                        .description,
                                                                )}
                                                            </span>
                                                        </span>
                                                    </label>
                                                    <div className="space-y-1.5">
                                                        <Label
                                                            htmlFor={`hold-${event}`}
                                                            className="text-xs"
                                                        >
                                                            {t(
                                                                'Hold before approving',
                                                            )}
                                                        </Label>
                                                        <DurationInput
                                                            id={`hold-${event}`}
                                                            label={t(
                                                                '{{type}} hold',
                                                                {
                                                                    type: t(
                                                                        EVENTS[
                                                                            event
                                                                        ].label,
                                                                    ),
                                                                },
                                                            )}
                                                            disabled={!enabled}
                                                            minutes={
                                                                resolved
                                                                    .wait_minutes[
                                                                    event
                                                                ] ?? 0
                                                            }
                                                            onChange={(
                                                                minutes,
                                                            ) =>
                                                                setGeneral(
                                                                    'wait_minutes',
                                                                    {
                                                                        ...resolved.wait_minutes,
                                                                        [event]:
                                                                            minutes,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Hint>
                                        {t(
                                            'The hold gives the merchant time to report returns or cancellations before the commission is approved. Unchecked types always need manual approval.',
                                        )}
                                    </Hint>

                                    <fieldset className="space-y-3">
                                        <legend className="text-sm font-medium">
                                            {t('Eligible publishers')}
                                        </legend>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="assignment-scope"
                                                    className="size-4 accent-primary"
                                                    checked={allAssignments}
                                                    onChange={() =>
                                                        setGeneral(
                                                            'assignment_ids',
                                                            [],
                                                        )
                                                    }
                                                />
                                                {t(
                                                    'All publishers in this scope',
                                                )}
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="assignment-scope"
                                                    className="size-4 accent-primary"
                                                    disabled={
                                                        !props.assignments
                                                            .length
                                                    }
                                                    checked={!allAssignments}
                                                    onChange={() =>
                                                        props.assignments[0] &&
                                                        setGeneral(
                                                            'assignment_ids',
                                                            [
                                                                props
                                                                    .assignments[0]
                                                                    .id,
                                                            ],
                                                        )
                                                    }
                                                />
                                                {t('Only selected publishers')}
                                            </label>
                                        </div>
                                        {!allAssignments && (
                                            <div className="rounded-lg border">
                                                {props.assignments.length >
                                                    6 && (
                                                    <div className="relative border-b p-2">
                                                        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            aria-label={t(
                                                                'Filter publishers',
                                                            )}
                                                            placeholder={t(
                                                                'Filter publishers…',
                                                            )}
                                                            className="h-8 border-0 pl-8 shadow-none focus-visible:ring-0"
                                                            value={
                                                                assignmentQuery
                                                            }
                                                            onChange={(e) =>
                                                                setAssignmentQuery(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}
                                                <ul className="max-h-56 divide-y overflow-y-auto">
                                                    {filteredAssignments.map(
                                                        (assignment) => {
                                                            const checked =
                                                                resolved.assignment_ids.includes(
                                                                    assignment.id,
                                                                );
                                                            return (
                                                                <li
                                                                    key={
                                                                        assignment.id
                                                                    }
                                                                >
                                                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="size-4 accent-primary"
                                                                            checked={
                                                                                checked
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setGeneral(
                                                                                    'assignment_ids',
                                                                                    e
                                                                                        .target
                                                                                        .checked
                                                                                        ? [
                                                                                              ...resolved.assignment_ids,
                                                                                              assignment.id,
                                                                                          ]
                                                                                        : resolved.assignment_ids.filter(
                                                                                              (
                                                                                                  id,
                                                                                              ) =>
                                                                                                  id !==
                                                                                                  assignment.id,
                                                                                          ),
                                                                                )
                                                                            }
                                                                        />
                                                                        {
                                                                            assignment.label
                                                                        }
                                                                    </label>
                                                                </li>
                                                            );
                                                        },
                                                    )}
                                                    {!filteredAssignments.length && (
                                                        <li className="px-3 py-4 text-sm text-muted-foreground">
                                                            {t(
                                                                'No publishers match this filter.',
                                                            )}
                                                        </li>
                                                    )}
                                                </ul>
                                                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                                                    {t(
                                                        '{{selected}} of {{total}} selected. Removing every selection includes all publishers again.',
                                                        {
                                                            selected:
                                                                resolved
                                                                    .assignment_ids
                                                                    .length,
                                                            total: props
                                                                .assignments
                                                                .length,
                                                        },
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </fieldset>
                                </div>
                            </Section>

                            {/* 3. Limits */}
                            <Section
                                step={3}
                                title={t('Risk threshold and spending limits')}
                                description={t(
                                    'Safety caps that stop automatic approval even when every rule passes.',
                                )}
                            >
                                <div className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="max-score">
                                                {t(
                                                    'Maximum enforced risk score',
                                                )}
                                            </Label>
                                            <UnitInput
                                                id="max-score"
                                                unit={t('points')}
                                                min={0}
                                                max={900}
                                                value={resolved.max_score}
                                                onChange={(value) =>
                                                    setGeneral(
                                                        'max_score',
                                                        value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <Hint>
                                            {t(
                                                'Each enforced rule that flags adds its risk points. If the total is above this number the commission goes to manual review.',
                                            )}{' '}
                                            <strong className="text-foreground">
                                                {resolved.max_score === 0
                                                    ? t(
                                                          'At 0, any single flagged enforced rule blocks automatic approval.',
                                                      )
                                                    : t(
                                                          'You have {{count}} enforced rules worth up to {{points}} points in total.',
                                                          {
                                                              count: enforcedCount,
                                                              points: enforcedWeight,
                                                          },
                                                      )}
                                            </strong>{' '}
                                            {t(
                                                'Points are weights you choose, not fraud probabilities.',
                                            )}
                                        </Hint>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {t(
                                                    'Approval limits per currency',
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {t(
                                                    'Commissions in a currency without limits are never approved automatically. Daily totals reset at 00:00 UTC.',
                                                )}
                                                {campaignId
                                                    ? ` ${t('Network limits still cap this campaign.')}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="divide-y rounded-lg border">
                                            {props.currencies.map(
                                                (currency) => {
                                                    const limit =
                                                        resolved.limits[
                                                            currency
                                                        ];
                                                    return (
                                                        <div
                                                            key={currency}
                                                            className="grid gap-3 p-4 sm:grid-cols-[10rem_1fr_1fr] sm:items-center"
                                                        >
                                                            <Toggle
                                                                label={t(
                                                                    '{{currency}} limits',
                                                                    {
                                                                        currency,
                                                                    },
                                                                )}
                                                                checked={
                                                                    !!limit
                                                                }
                                                                onChange={(
                                                                    on,
                                                                ) => {
                                                                    const limits =
                                                                        {
                                                                            ...resolved.limits,
                                                                        };
                                                                    if (on)
                                                                        limits[
                                                                            currency
                                                                        ] = {
                                                                            max_commission_minor: 1000,
                                                                            daily_limit_minor: 10000,
                                                                        };
                                                                    else
                                                                        delete limits[
                                                                            currency
                                                                        ];
                                                                    setGeneral(
                                                                        'limits',
                                                                        limits,
                                                                    );
                                                                }}
                                                            />
                                                            {limit ? (
                                                                (
                                                                    [
                                                                        [
                                                                            'max_commission_minor',
                                                                            'Per commission',
                                                                        ],
                                                                        [
                                                                            'daily_limit_minor',
                                                                            'Daily total',
                                                                        ],
                                                                    ] as const
                                                                ).map(
                                                                    ([
                                                                        key,
                                                                        text,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                key
                                                                            }
                                                                            className="space-y-1"
                                                                        >
                                                                            <Label
                                                                                htmlFor={`${currency}-${key}`}
                                                                                className="text-xs"
                                                                            >
                                                                                {t(
                                                                                    text,
                                                                                )}{' '}
                                                                                (
                                                                                {
                                                                                    currency
                                                                                }

                                                                                )
                                                                            </Label>
                                                                            <UnitInput
                                                                                id={`${currency}-${key}`}
                                                                                unit={
                                                                                    currency
                                                                                }
                                                                                min={
                                                                                    0.01
                                                                                }
                                                                                step={
                                                                                    0.01
                                                                                }
                                                                                value={
                                                                                    limit[
                                                                                        key
                                                                                    ] /
                                                                                    100
                                                                                }
                                                                                onChange={(
                                                                                    value,
                                                                                ) =>
                                                                                    setGeneral(
                                                                                        'limits',
                                                                                        {
                                                                                            ...resolved.limits,
                                                                                            [currency]:
                                                                                                {
                                                                                                    ...limit,
                                                                                                    [key]: Math.round(
                                                                                                        value *
                                                                                                            100,
                                                                                                    ),
                                                                                                },
                                                                                        },
                                                                                    )
                                                                                }
                                                                            />
                                                                        </div>
                                                                    ),
                                                                )
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground sm:col-span-2">
                                                                    {t(
                                                                        'Not auto-approved in {{currency}}.',
                                                                        {
                                                                            currency,
                                                                        },
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        </fieldset>

                        {/* 4. Rules */}
                        <Section
                            step={4}
                            title={t('Rules')}
                            description={t(
                                'Each rule checks one signal. Choose how much it matters.',
                            )}
                        >
                            <dl className="mb-5 grid gap-3 rounded-lg bg-muted/40 p-4 text-xs sm:grid-cols-3">
                                {RULE_MODES.map((mode) => (
                                    <div key={mode.value}>
                                        <dt className="font-semibold">
                                            {t(mode.label)}
                                        </dt>
                                        <dd className="text-muted-foreground">
                                            {t(mode.description)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                            <div className="space-y-3">
                                {Object.entries(definitions).map(
                                    ([id, definition]) => (
                                        <RuleCard
                                            key={id}
                                            id={id}
                                            definition={definition}
                                            rule={resolved.rules[id]}
                                            campaignScoped={!!campaignId}
                                            own={
                                                !campaignId ||
                                                id in
                                                    (form.data.configuration
                                                        .rules ?? {})
                                            }
                                            onOverride={(on) => {
                                                const rules = {
                                                    ...form.data.configuration
                                                        .rules,
                                                };
                                                if (on)
                                                    rules[id] =
                                                        resolved.rules[id];
                                                else delete rules[id];
                                                setGeneral('rules', rules);
                                            }}
                                            onChange={(rule) =>
                                                updateRule(id, rule)
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        </Section>

                        {/* Preview results */}
                        <div ref={previewRef} className="scroll-mb-40">
                            {previewError && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                                >
                                    {previewError}
                                </p>
                            )}
                            {preview && <PreviewResults preview={preview} />}
                        </div>

                        {/* Save */}
                        <div
                            ref={saveRef}
                            className="scroll-mt-6 rounded-xl border bg-card p-5"
                        >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                                <div className="flex-1 space-y-1.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <Label htmlFor="policy-reason">
                                            {t('Reason for policy change')}
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            {form.isDirty
                                                ? t('Unsaved changes')
                                                : t('No changes yet')}
                                        </span>
                                    </div>
                                    <Input
                                        id="policy-reason"
                                        required
                                        maxLength={500}
                                        placeholder={t(
                                            'e.g. Enforce honeypot after a week of clean shadow results',
                                        )}
                                        value={form.data.reason}
                                        onChange={(e) =>
                                            form.setData(
                                                'reason',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={previewing}
                                        onClick={runPreview}
                                    >
                                        {previewing ? (
                                            <Loader2 className="animate-spin" />
                                        ) : (
                                            <FlaskConical />
                                        )}
                                        {previewing
                                            ? t('Comparing…')
                                            : t(
                                                  'Preview on recorded assessments',
                                              )}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            form.processing ||
                                            !form.data.reason.trim()
                                        }
                                    >
                                        {t('Save new policy version')}
                                    </Button>
                                </div>
                            </div>
                            {Object.values(form.errors).length > 0 && (
                                <p
                                    role="alert"
                                    className="mt-3 text-sm text-destructive"
                                >
                                    {Object.values(form.errors).join(' ')}
                                </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t(
                                    'Saving creates a new version. Completed decisions are not changed; queued approvals recheck the latest policy before applying.',
                                )}
                            </p>
                        </div>
                    </form>
                    <UnsavedChangesPill
                        show={form.isDirty && !saveVisible}
                        anchor={formRef}
                        onClick={() => {
                            saveRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                            document
                                .getElementById('policy-reason')
                                ?.focus({ preventScroll: true });
                        }}
                    />
                </TabsContent>

                {/* ---------------- Performance ---------------- */}
                <TabsContent value="performance">
                    <PerformanceTable statistics={props.statistics} />
                </TabsContent>

                {/* ---------------- History ---------------- */}
                <TabsContent value="history">
                    <Section
                        title={t('Policy history')}
                        description={t(
                            'Every save creates a new version. Restoring copies an older configuration into a new version.',
                        )}
                    >
                        {props.history.length ? (
                            <ol className="relative space-y-4 border-l pl-6">
                                {props.history.map((version) => {
                                    const active =
                                        version.id === props.activeVersionId;
                                    return (
                                        <li
                                            key={version.id}
                                            className="relative"
                                        >
                                            <span
                                                className={cn(
                                                    'absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-card',
                                                    active
                                                        ? 'bg-primary'
                                                        : 'bg-muted-foreground/40',
                                                )}
                                            />
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="flex items-center gap-2 text-sm">
                                                        <strong>
                                                            {t(
                                                                'Version {{version}}',
                                                                {
                                                                    version:
                                                                        version.version,
                                                                },
                                                            )}
                                                        </strong>
                                                        {active && (
                                                            <span className="rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">
                                                                {t(
                                                                    'Active version',
                                                                )}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(
                                                            version.created_at,
                                                        ).toLocaleString()}{' '}
                                                        ·{' '}
                                                        {t('Operator #{{id}}', {
                                                            id: version.actor_id,
                                                        })}
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        {version.reason}
                                                    </p>
                                                </div>
                                                {!active && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setRestoreVersion(
                                                                version,
                                                            )
                                                        }
                                                    >
                                                        <RotateCcw />
                                                        {t('Restore')}
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        ) : (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <History className="size-6 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    {t('No versions saved for this scope yet.')}
                                </p>
                            </div>
                        )}
                    </Section>
                </TabsContent>
            </Tabs>

            <RestoreDialog
                version={restoreVersion}
                onClose={() => setRestoreVersion(null)}
                onConfirm={(reason) =>
                    restoreVersion &&
                    router.post(
                        '/finance/fraud/restore',
                        {
                            ...scope,
                            version_id: restoreVersion.id,
                            expected_version: props.activeVersionId,
                            reason,
                        },
                        {
                            preserveScroll: true,
                            onSuccess: () => setRestoreVersion(null),
                        },
                    )
                }
            />
        </>
    );
}

/** Floating reminder centred under the form while the save card is off-screen. */
function UnsavedChangesPill({
    show,
    anchor,
    onClick,
}: {
    show: boolean;
    anchor: RefObject<HTMLElement | null>;
    onClick: () => void;
}) {
    const { t } = useTranslation();
    const [centre, setCentre] = useState<number | null>(null);
    useEffect(() => {
        const node = anchor.current;
        if (!node) return;
        const update = () => {
            const rect = node.getBoundingClientRect();
            setCentre(rect.left + rect.width / 2);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(node);
        window.addEventListener('resize', update);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [anchor]);
    if (!show || centre === null) return null;
    return (
        <div
            className="fixed bottom-6 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card py-1.5 pr-1.5 pl-4 text-sm shadow-lg"
            style={{ left: centre }}
            role="status"
        >
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            <span className="whitespace-nowrap">{t('Unsaved changes')}</span>
            <Button size="sm" className="rounded-full" onClick={onClick}>
                {t('Review & save')}
            </Button>
        </div>
    );
}

function RuleCard({
    id,
    definition,
    rule,
    campaignScoped,
    own,
    onOverride,
    onChange,
}: {
    id: string;
    definition: Definition;
    rule: FraudRule;
    campaignScoped: boolean;
    own: boolean;
    onOverride: (on: boolean) => void;
    onChange: (rule: FraudRule) => void;
}) {
    const { t, i18n } = useTranslation();
    const settings = Object.entries(definition.settings);
    const active = rule.mode !== 'off';
    const label = t(definition.label);
    return (
        <article
            className={cn(
                'rounded-lg border transition-colors',
                rule.mode === 'enforce' && 'border-primary/40',
                !active && 'bg-muted/30',
            )}
        >
            <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {ruleSummary(t, i18n.language, id, rule.settings) ||
                            t(definition.description)}
                    </p>
                    {campaignScoped && (
                        <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium">
                            <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={own}
                                onChange={(e) => onOverride(e.target.checked)}
                            />
                            {t('Override network rule')}
                        </label>
                    )}
                </div>
                <fieldset disabled={!own} className="shrink-0">
                    <legend className="sr-only">
                        {t('{{rule}} mode', { rule: label })}
                    </legend>
                    <div
                        role="radiogroup"
                        aria-label={t('{{rule}} mode', { rule: label })}
                        className="inline-flex rounded-lg border bg-background p-0.5"
                    >
                        {RULE_MODES.map((mode) => {
                            const checked = rule.mode === mode.value;
                            return (
                                <label
                                    key={mode.value}
                                    title={t(mode.description)}
                                    className={cn(
                                        'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-[:disabled]:cursor-not-allowed has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                                        checked
                                            ? mode.value === 'enforce'
                                                ? 'bg-primary text-primary-foreground'
                                                : mode.value === 'monitor'
                                                  ? 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200'
                                                  : 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                        !own && 'opacity-60',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name={`rule-mode-${id}`}
                                        className="sr-only"
                                        checked={checked}
                                        onChange={() =>
                                            onChange({
                                                ...rule,
                                                mode: mode.value,
                                            })
                                        }
                                    />
                                    {t(mode.label)}
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            </div>

            {active && (
                <fieldset
                    disabled={!own}
                    className="space-y-4 border-t p-4 disabled:opacity-60"
                >
                    <div
                        className={cn(
                            'grid gap-4',
                            rule.mode === 'enforce' &&
                                'md:grid-cols-[1fr_12rem]',
                        )}
                    >
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium">
                                {t('Applies to')}
                            </p>
                            {definition.events.length === 1 ? (
                                <p className="text-sm text-muted-foreground">
                                    {t('{{type}} only', {
                                        type: t(
                                            eventLabel(definition.events[0]),
                                        ),
                                    })}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {definition.events.map((event) => (
                                        <Chip
                                            key={event}
                                            checked={rule.event_types.includes(
                                                event,
                                            )}
                                            onChange={(checked) =>
                                                onChange({
                                                    ...rule,
                                                    event_types: checked
                                                        ? [
                                                              ...rule.event_types,
                                                              event,
                                                          ]
                                                        : rule.event_types.filter(
                                                              (v) =>
                                                                  v !== event,
                                                          ),
                                                })
                                            }
                                        >
                                            {t(eventLabel(event))}
                                        </Chip>
                                    ))}
                                </div>
                            )}
                            {!rule.event_types.length && (
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {t(
                                        'Select at least one type, or the rule never runs.',
                                    )}
                                </p>
                            )}
                        </div>
                        {rule.mode === 'enforce' && (
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor={`weight-${id}`}
                                    className="text-xs"
                                >
                                    {t('Risk points when flagged')}
                                </Label>
                                <UnitInput
                                    id={`weight-${id}`}
                                    unit={t('points')}
                                    min={1}
                                    max={100}
                                    value={rule.weight}
                                    onChange={(weight) =>
                                        onChange({ ...rule, weight })
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {settings.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {settings.map(([key, [, min, max]]) => {
                                const meta = settingMeta(key);
                                const scale = meta.scale ?? 1;
                                return (
                                    <div key={key} className="space-y-1.5">
                                        <Label
                                            htmlFor={`${id}-${key}`}
                                            className="text-xs"
                                        >
                                            {t(meta.label)}
                                        </Label>
                                        <UnitInput
                                            id={`${id}-${key}`}
                                            unit={t(meta.unit)}
                                            min={min / scale}
                                            max={max / scale}
                                            step={meta.step ?? 1}
                                            value={rule.settings[key] / scale}
                                            onChange={(value) =>
                                                onChange({
                                                    ...rule,
                                                    settings: {
                                                        ...rule.settings,
                                                        [key]: Math.round(
                                                            value * scale,
                                                        ),
                                                    },
                                                })
                                            }
                                        />
                                        {meta.help && (
                                            <p className="text-xs text-muted-foreground">
                                                {t(meta.help)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </fieldset>
            )}
        </article>
    );
}

const OUTCOME_LABELS: Record<string, string> = {
    approve: 'Auto-approve',
    manual_review: 'Manual review',
};

function PreviewResults({ preview }: { preview: Preview }) {
    const { t } = useTranslation();
    const outcome = (value: string) =>
        t(OUTCOME_LABELS[value] ?? value.replaceAll('_', ' '));
    const tiles = [
        { label: 'Assessments compared', value: preview.sample_size },
        { label: 'Eligible today', value: preview.current_eligible },
        { label: 'Eligible with changes', value: preview.proposed_eligible },
        { label: 'Decisions that change', value: preview.changed },
    ];
    const delta = preview.proposed_eligible - preview.current_eligible;
    return (
        <Section
            title={t('Preview results')}
            description={t(preview.note)}
            action={
                <span
                    className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        delta > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : delta < 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'bg-muted',
                    )}
                >
                    {t('{{delta}} auto-approvals', {
                        delta: `${delta > 0 ? '+' : ''}${delta}`,
                    })}
                </span>
            }
        >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <div key={tile.label} className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                            {t(tile.label)}
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                            {tile.value}
                        </p>
                    </div>
                ))}
            </div>
            {preview.rows.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 font-medium">
                                    {t('Commission')}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    {t('Today')}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    {t('With changes')}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    {t('Missing evidence')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {preview.rows.map((row) => (
                                <tr key={row.earning_id}>
                                    <td className="px-3 py-2">
                                        <Link
                                            className="font-medium text-primary hover:underline"
                                            href={`/finance/earnings/${row.earning_id}/fraud`}
                                        >
                                            #{row.earning_id}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">
                                        {outcome(row.current)}
                                    </td>
                                    <td
                                        className={cn(
                                            'px-3 py-2 font-medium',
                                            row.current !== row.proposed &&
                                                'text-primary',
                                        )}
                                    >
                                        {outcome(row.proposed)}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">
                                        {row.missing_evidence
                                            .map((item) => t(item))
                                            .join(', ') || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

const PERFORMANCE_COLUMNS: {
    key: keyof Props['statistics']['rules'][number];
    label: string;
    help: string;
}[] = [
    { key: 'evaluated', label: 'Evaluated', help: 'Times the rule ran.' },
    { key: 'flagged', label: 'Flagged', help: 'Times it raised a flag.' },
    {
        key: 'sole_enforced_trigger',
        label: 'Sole blocker',
        help: 'Only enforced rule that sent the commission to review.',
    },
    {
        key: 'reviewer_disagreements',
        label: 'Reviewer disagreed',
        help: 'A reviewer approved despite the flag. Not proof of a false positive.',
    },
    {
        key: 'confirmed_legitimate',
        label: 'Confirmed legitimate',
        help: 'Flagged, later classified as legitimate.',
    },
    {
        key: 'confirmed_fraud',
        label: 'Confirmed fraud',
        help: 'Flagged, later classified as fraud.',
    },
];

function PerformanceTable({ statistics }: { statistics: Props['statistics'] }) {
    const { t } = useTranslation();
    return (
        <Section
            title={t('Rule performance')}
            description={t(
                'Latest assessment per conversion from the last 30 days (up to 500). Current sample: {{sample}}. Confirmed outcomes need an operator classification; ordinary returns are excluded.',
                { sample: statistics.sample_size },
            )}
        >
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2 font-medium">
                                {t('Rule')}
                            </th>
                            {PERFORMANCE_COLUMNS.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-3 py-2 text-right font-medium"
                                    title={t(col.help)}
                                >
                                    <span className="cursor-help border-b border-dotted border-muted-foreground/50">
                                        {t(col.label)}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {statistics.rules.map((rule) => {
                            const rate = rule.evaluated
                                ? Math.round(
                                      (rule.flagged / rule.evaluated) * 100,
                                  )
                                : 0;
                            return (
                                <tr key={rule.id} className="hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium">
                                        {t(rule.label)}
                                    </td>
                                    {PERFORMANCE_COLUMNS.map((col) => (
                                        <td
                                            key={col.key}
                                            className="px-3 py-2 text-right tabular-nums"
                                        >
                                            {rule[col.key]}
                                            {col.key === 'flagged' &&
                                                rule.evaluated > 0 && (
                                                    <span className="ml-1 text-xs text-muted-foreground">
                                                        ({rate}%)
                                                    </span>
                                                )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                {PERFORMANCE_COLUMNS.map((col) => (
                    <div key={col.key}>
                        <dt className="inline font-medium">{t(col.label)}: </dt>
                        <dd className="inline text-muted-foreground">
                            {t(col.help)}
                        </dd>
                    </div>
                ))}
            </dl>
        </Section>
    );
}

function RestoreDialog({
    version,
    onClose,
    onConfirm,
}: {
    version: Props['history'][number] | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}) {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    return (
        <Dialog
            open={!!version}
            onOpenChange={(open) => {
                if (!open) {
                    setReason('');
                    onClose();
                }
            }}
        >
            <DialogContent>
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onConfirm(reason);
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {t('Restore version {{version}}?', {
                                version: version?.version,
                            })}
                        </DialogTitle>
                        <DialogDescription>
                            {t(
                                'Its configuration is copied into a new version and becomes active. Unsaved edits on the Policy tab are discarded.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5">
                        <Label htmlFor="restore-reason">
                            {t('Reason for restoring')}
                        </Label>
                        <Textarea
                            id="restore-reason"
                            required
                            maxLength={500}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={!reason.trim()}>
                            <RotateCcw />
                            {t('Restore as new version')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
