import {
    EmptyState,
    PageHeader,
    SectionCard,
    StatCard,
} from '@/components/app';
import { DurationInput, Hint, UnitInput } from '@/components/fraud/fields';
import {
    AUTOMATION_MODES,
    EVENTS,
    RULE_MODES,
    automationLabel,
    automationStatus,
    type FraudPreview,
    type PolicyVersion,
    type RuleDefinition,
} from '@/components/fraud/meta';
import {
    PerformanceTable,
    PolicyHistory,
    RestoreDialog,
    type RuleStatistics,
} from '@/components/fraud/policy-history';
import { PreviewCard } from '@/components/fraud/preview-card';
import { RuleCard } from '@/components/fraud/rule-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, InputGroup } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { FraudConfiguration, FraudRule } from '@/types/fraud';
import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Clock,
    Coins,
    Layers,
    Loader2,
    Megaphone,
    Network as NetworkIcon,
    RefreshCw,
    Search,
    ShieldAlert,
    SlidersHorizontal,
    Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
    networks: { id: number; network_name: string }[];
    networkId: number | null;
    campaignId: number | null;
    campaigns: { id: number; name: string }[];
    assignments: { id: number; label: string }[];
    definitions: Record<string, RuleDefinition>;
    currencies: string[];
    effective: { configuration: FraudConfiguration };
    inherited: FraudConfiguration;
    configuration: Partial<FraudConfiguration>;
    activeVersionId: number | null;
    history: PolicyVersion[];
    statistics: RuleStatistics;
    health: { queued: number; waiting: number; errors: number };
};

const FRAUD_URL = '/finance/fraud';

export default function FraudPolicies(props: Props) {
    const { t } = useTranslation();
    return (
        <AppLayout>
            <Head title={t('Fraud rules')} />
            <div className="workspace-page flex flex-col gap-6">
                <PageHeader
                    title={t('Fraud rules')}
                    description={t(
                        'Decide which commissions can be approved automatically, and which rules send a commission to manual review.',
                    )}
                    breadcrumbs={[
                        { title: t('Administration'), href: FRAUD_URL },
                        { title: t('Fraud rules'), href: FRAUD_URL },
                    ]}
                    icon={<ShieldAlert />}
                    tone="admin"
                    actions={
                        props.networkId ? <ScopeSelectors {...props} /> : null
                    }
                />
                {props.networkId ? (
                    <PolicyEditor
                        key={`${props.networkId}:${props.campaignId}:${props.activeVersionId}`}
                        {...props}
                    />
                ) : (
                    <EmptyState
                        icon={<NetworkIcon />}
                        tone="partners"
                        title={t('No network yet')}
                        description={t(
                            'Create a network before configuring fraud rules.',
                        )}
                    />
                )}
            </div>
        </AppLayout>
    );
}

/** Network (super admins with several networks) and policy scope pickers. */
function ScopeSelectors(props: Props) {
    const { t } = useTranslation();
    const { networkId, campaignId } = props;
    return (
        <>
            {props.networks.length > 1 && (
                <div className="flex flex-col gap-1">
                    <Label htmlFor="scope-network" className="sr-only">
                        {t('Network')}
                    </Label>
                    <Select
                        value={String(networkId ?? '')}
                        onValueChange={(value) =>
                            router.get(FRAUD_URL, { network_id: value })
                        }
                    >
                        <SelectTrigger
                            id="scope-network"
                            className="w-full min-w-48 sm:w-auto"
                        >
                            <NetworkIcon
                                className="text-partners"
                                aria-hidden="true"
                            />
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
            <div className="flex flex-col gap-1">
                <Label htmlFor="scope-campaign" className="sr-only">
                    {t('Policy scope')}
                </Label>
                <Select
                    value={campaignId ? String(campaignId) : 'network'}
                    onValueChange={(value) =>
                        router.get(FRAUD_URL, {
                            network_id: networkId,
                            campaign_id:
                                value === 'network' ? undefined : value,
                        })
                    }
                >
                    <SelectTrigger
                        id="scope-campaign"
                        className="w-full min-w-56 sm:w-auto"
                    >
                        <Megaphone className="text-brand" aria-hidden="true" />
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
            </div>
        </>
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
    const [preview, setPreview] = useState<FraudPreview | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [previewing, setPreviewing] = useState(false);
    const [assignmentQuery, setAssignmentQuery] = useState('');
    const [restoreVersion, setRestoreVersion] = useState<PolicyVersion | null>(
        null,
    );
    const previewRef = useRef<HTMLElement>(null);
    const [saveVisible, setSaveVisible] = useState(true);
    useEffect(() => {
        const node = previewRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) =>
            setSaveVisible(entry.isIntersecting),
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

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
    const activeCount = Object.values(resolved.rules).filter(
        (rule) => rule.mode !== 'off',
    ).length;

    const runPreview = async () => {
        setPreviewing(true);
        setPreviewError('');
        try {
            const response = await axios.post<FraudPreview>(
                `${FRAUD_URL}/preview`,
                { ...scope, configuration: form.data.configuration },
            );
            setPreview(response.data);
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
    const health = props.health;

    return (
        <>
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label={t('Active automation')}
                    icon={<Workflow />}
                    tone="admin"
                    value={
                        <StatusBadge
                            status={
                                automationStatus[
                                    effective.configuration.mode
                                ] ?? 'neutral'
                            }
                            label={t(
                                automationLabel(effective.configuration.mode),
                            )}
                        />
                    }
                    hint={t('{{count}} rules on', { count: activeCount })}
                />
                <StatCard
                    label={t('Awaiting checks')}
                    icon={<Loader2 />}
                    tone="analytics"
                    value={health.queued}
                />
                <StatCard
                    label={t('On hold')}
                    icon={<Clock />}
                    tone="warning"
                    value={health.waiting}
                />
                <StatCard
                    label={t('Failed checks')}
                    icon={<AlertTriangle />}
                    tone={health.errors ? 'danger' : 'neutral'}
                    value={health.errors}
                />
            </div>
            <div className="-mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-ink-muted">
                    {t(
                        'Authentication, attribution and ledger safeguards always stay active, whatever you configure here.',
                    )}
                </p>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                        router.post(`${FRAUD_URL}/reassess`, scope, {
                            preserveScroll: true,
                        })
                    }
                >
                    <RefreshCw className="text-analytics" aria-hidden="true" />
                    {t('Reassess pending with changed policies')}
                </Button>
            </div>

            <form
                className="flex flex-col gap-[22px]"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post(`${FRAUD_URL}/policy`, { preserveScroll: true });
                }}
            >
                {!!campaignId && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border-strong bg-surface p-4">
                        <div>
                            <p className="text-sm font-bold">
                                {t('Approval settings for this campaign')}
                            </p>
                            <p className="text-[13px] text-ink-muted">
                                {generalOverride
                                    ? t(
                                          'This campaign uses its own automation, coverage and limits below.',
                                      )
                                    : t(
                                          'Automation, coverage and limits are inherited from the network defaults.',
                                      )}
                            </p>
                        </div>
                        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                            <Checkbox
                                checked={generalOverride}
                                onCheckedChange={(checked) => {
                                    const next = { ...form.data.configuration };
                                    if (checked === true) {
                                        Object.assign(
                                            next,
                                            Object.fromEntries(
                                                generalKeys.map((key) => [
                                                    key,
                                                    resolved[key],
                                                ]),
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

                <SectionCard
                    title={t('Automation mode')}
                    description={t(
                        'Choose what happens after the rules have checked a commission.',
                    )}
                    icon={<Workflow />}
                    tone="admin"
                >
                    <fieldset
                        disabled={!generalOverride}
                        className="disabled:opacity-60"
                    >
                        <legend className="sr-only">
                            {t('Automation mode')}
                        </legend>
                        <RadioCardGroup
                            name="automation-mode"
                            label={t('Automation mode')}
                            value={resolved.mode}
                            onValueChange={(value) =>
                                setGeneral(
                                    'mode',
                                    value as FraudConfiguration['mode'],
                                )
                            }
                            className="md:grid-cols-3"
                        >
                            {AUTOMATION_MODES.map((option) => (
                                <RadioCard
                                    key={option.value}
                                    value={option.value}
                                    title={t(option.label)}
                                    hint={t(option.description)}
                                    icon={
                                        <option.icon
                                            className="text-admin"
                                            aria-hidden="true"
                                        />
                                    }
                                    tone="admin"
                                />
                            ))}
                        </RadioCardGroup>
                    </fieldset>
                    {!!campaignId &&
                        resolved.mode === 'automatic' &&
                        inherited.mode !== 'automatic' && (
                            <p className="mt-3 flex gap-2 rounded-xl bg-warning-soft p-3 text-[13px] text-warning-ink">
                                <AlertTriangle
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {t(
                                    'The network is set to “{{mode}}”, which takes precedence. This campaign won’t auto-approve until the network is set to Automatic.',
                                    {
                                        mode: t(
                                            automationLabel(inherited.mode),
                                        ),
                                    },
                                )}
                            </p>
                        )}
                </SectionCard>

                <div className="flex flex-col items-start gap-[18px] xl:flex-row">
                    <div className="flex w-full min-w-0 flex-col gap-[18px] xl:flex-[2]">
                        <section
                            aria-labelledby="fraud-rules-title"
                            className="flex flex-col gap-3"
                        >
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <h2
                                        id="fraud-rules-title"
                                        className="text-lg font-extrabold"
                                    >
                                        {t('Rules')}
                                    </h2>
                                    <p className="text-[13px] text-ink-muted">
                                        {t(
                                            'Each rule checks one signal. Switch it on, then choose whether it only records evidence or can block approval.',
                                        )}
                                    </p>
                                </div>
                            </div>
                            <dl className="grid gap-2 rounded-xl bg-surface-tint p-3 text-xs sm:grid-cols-3">
                                {RULE_MODES.map((mode) => (
                                    <div key={mode.value}>
                                        <dt className="font-bold">
                                            {t(mode.label)}
                                        </dt>
                                        <dd className="text-ink-muted">
                                            {t(mode.description)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
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
                                                rules[id] = resolved.rules[id];
                                            else delete rules[id];
                                            setGeneral('rules', rules);
                                        }}
                                        onChange={(rule) =>
                                            updateRule(id, rule)
                                        }
                                    />
                                ),
                            )}
                        </section>

                        <SectionCard
                            title={t('What can be auto-approved')}
                            description={t(
                                'Pick the conversion types and publishers that are eligible, and how long to wait before approving.',
                            )}
                            icon={<Layers />}
                            tone="brand"
                        >
                            <fieldset
                                disabled={!generalOverride}
                                className="flex flex-col gap-5 disabled:opacity-60"
                            >
                                <legend className="sr-only">
                                    {t('What can be auto-approved')}
                                </legend>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {Object.keys(EVENTS).map((event) => {
                                        const enabled =
                                            resolved.event_types.includes(
                                                event,
                                            );
                                        const typeLabel = t(
                                            EVENTS[event].label,
                                        );
                                        return (
                                            <div
                                                key={event}
                                                className={cn(
                                                    'flex flex-col gap-3 rounded-2xl border border-border p-4',
                                                    enabled &&
                                                        'border-brand/40 bg-brand-soft/40',
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold">
                                                            {typeLabel}
                                                        </p>
                                                        <p className="text-xs text-ink-muted">
                                                            {t(
                                                                EVENTS[event]
                                                                    .description,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        aria-label={t(
                                                            'Auto-approve {{type}}',
                                                            { type: typeLabel },
                                                        )}
                                                        checked={enabled}
                                                        onCheckedChange={(on) =>
                                                            setGeneral(
                                                                'event_types',
                                                                on
                                                                    ? [
                                                                          ...resolved.event_types,
                                                                          event,
                                                                      ]
                                                                    : resolved.event_types.filter(
                                                                          (v) =>
                                                                              v !==
                                                                              event,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
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
                                                            { type: typeLabel },
                                                        )}
                                                        disabled={!enabled}
                                                        minutes={
                                                            resolved
                                                                .wait_minutes[
                                                                event
                                                            ] ?? 0
                                                        }
                                                        onChange={(minutes) =>
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

                                <fieldset className="flex flex-col gap-3">
                                    <legend className="mb-3 text-sm font-bold">
                                        {t('Eligible publishers')}
                                    </legend>
                                    <RadioCardGroup
                                        name="assignment-scope"
                                        label={t('Eligible publishers')}
                                        value={
                                            allAssignments ? 'all' : 'selected'
                                        }
                                        onValueChange={(value) =>
                                            value === 'all'
                                                ? setGeneral(
                                                      'assignment_ids',
                                                      [],
                                                  )
                                                : props.assignments[0] &&
                                                  setGeneral('assignment_ids', [
                                                      props.assignments[0].id,
                                                  ])
                                        }
                                    >
                                        <RadioCard
                                            value="all"
                                            title={t(
                                                'All publishers in this scope',
                                            )}
                                        />
                                        <RadioCard
                                            value="selected"
                                            title={t(
                                                'Only selected publishers',
                                            )}
                                            disabled={!props.assignments.length}
                                        />
                                    </RadioCardGroup>
                                    {!allAssignments && (
                                        <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                                            {props.assignments.length > 6 && (
                                                <InputGroup
                                                    leading={
                                                        <Search
                                                            className="text-brand"
                                                            aria-hidden="true"
                                                        />
                                                    }
                                                >
                                                    <Input
                                                        type="search"
                                                        aria-label={t(
                                                            'Filter publishers',
                                                        )}
                                                        placeholder={t(
                                                            'Filter publishers…',
                                                        )}
                                                        value={assignmentQuery}
                                                        onChange={(e) =>
                                                            setAssignmentQuery(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </InputGroup>
                                            )}
                                            {filteredAssignments.length ? (
                                                <ul className="flex max-h-56 flex-col overflow-y-auto">
                                                    {filteredAssignments.map(
                                                        (assignment) => (
                                                            <li
                                                                key={
                                                                    assignment.id
                                                                }
                                                            >
                                                                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm hover:bg-surface-muted">
                                                                    <Checkbox
                                                                        checked={resolved.assignment_ids.includes(
                                                                            assignment.id,
                                                                        )}
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) =>
                                                                            setGeneral(
                                                                                'assignment_ids',
                                                                                checked ===
                                                                                    true
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
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="px-2 py-3 text-sm text-ink-muted">
                                                    {t(
                                                        'No publishers match this filter.',
                                                    )}
                                                </p>
                                            )}
                                            <p className="border-t border-border px-2 pt-2 text-xs text-ink-muted">
                                                {t(
                                                    '{{selected}} of {{total}} selected. Removing every selection includes all publishers again.',
                                                    {
                                                        selected:
                                                            resolved
                                                                .assignment_ids
                                                                .length,
                                                        total: props.assignments
                                                            .length,
                                                    },
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </fieldset>
                            </fieldset>
                        </SectionCard>

                        <SectionCard
                            title={t('Risk threshold and spending limits')}
                            description={t(
                                'Safety caps that stop automatic approval even when every rule passes.',
                            )}
                            icon={<SlidersHorizontal />}
                            tone="finance"
                        >
                            <fieldset
                                disabled={!generalOverride}
                                className="flex flex-col gap-5 disabled:opacity-60"
                            >
                                <legend className="sr-only">
                                    {t('Risk threshold and spending limits')}
                                </legend>
                                <div className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="max-score">
                                            {t('Maximum enforced risk score')}
                                        </Label>
                                        <UnitInput
                                            id="max-score"
                                            unit={t('points')}
                                            min={0}
                                            max={900}
                                            value={resolved.max_score}
                                            onChange={(value) =>
                                                setGeneral('max_score', value)
                                            }
                                        />
                                    </div>
                                    <Hint>
                                        {t(
                                            'Each enforced rule that flags adds its risk points. If the total is above this number the commission goes to manual review.',
                                        )}{' '}
                                        <strong className="text-ink">
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

                                <div className="flex flex-col gap-3">
                                    <div>
                                        <p className="text-sm font-bold">
                                            {t('Approval limits per currency')}
                                        </p>
                                        <p className="text-[13px] text-ink-muted">
                                            {t(
                                                'Commissions in a currency without limits are never approved automatically. Daily totals reset at 00:00 UTC.',
                                            )}
                                            {campaignId
                                                ? ` ${t('Network limits still cap this campaign.')}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="divide-y divide-border rounded-2xl border border-border">
                                        {props.currencies.map((currency) => {
                                            const limit =
                                                resolved.limits[currency];
                                            return (
                                                <div
                                                    key={currency}
                                                    className="grid gap-3 p-4 sm:grid-cols-[11rem_1fr_1fr] sm:items-center"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Switch
                                                            tone="finance"
                                                            aria-label={t(
                                                                '{{currency}} limits',
                                                                { currency },
                                                            )}
                                                            checked={!!limit}
                                                            onCheckedChange={(
                                                                on,
                                                            ) => {
                                                                const limits = {
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
                                                        <span className="flex items-center gap-1.5 text-sm font-bold">
                                                            <Coins
                                                                className="size-4 text-finance"
                                                                aria-hidden="true"
                                                            />
                                                            {currency}
                                                        </span>
                                                    </div>
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
                                                        ).map(([key, text]) => (
                                                            <div
                                                                key={key}
                                                                className="flex flex-col gap-1"
                                                            >
                                                                <Label
                                                                    htmlFor={`${currency}-${key}`}
                                                                    className="text-xs"
                                                                >
                                                                    {t(text)} (
                                                                    {currency})
                                                                </Label>
                                                                <UnitInput
                                                                    id={`${currency}-${key}`}
                                                                    unit={
                                                                        currency
                                                                    }
                                                                    min={0.01}
                                                                    step={0.01}
                                                                    value={
                                                                        limit[
                                                                            key
                                                                        ] / 100
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
                                                        ))
                                                    ) : (
                                                        <p className="text-[13px] text-ink-muted sm:col-span-2">
                                                            {t(
                                                                'Not auto-approved in {{currency}}.',
                                                                { currency },
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </fieldset>
                        </SectionCard>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-[18px] xl:sticky xl:top-24 xl:flex-1">
                        <PreviewCard
                            ref={previewRef}
                            preview={preview}
                            previewing={previewing}
                            previewError={previewError}
                            onPreview={runPreview}
                            reason={form.data.reason}
                            onReasonChange={(reason) =>
                                form.setData('reason', reason)
                            }
                            dirty={form.isDirty}
                            saving={form.processing}
                            errors={Object.values(form.errors)}
                        />
                        <PolicyHistory
                            history={props.history}
                            activeVersionId={props.activeVersionId}
                            onRestore={setRestoreVersion}
                        />
                    </div>
                </div>
            </form>

            <PerformanceTable statistics={props.statistics} />

            {form.isDirty && !saveVisible && (
                <div
                    role="status"
                    className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-4 text-sm shadow-card"
                >
                    <span
                        className="size-2 rounded-full bg-warning-dot"
                        aria-hidden="true"
                    />
                    <span className="whitespace-nowrap">
                        {t('Unsaved changes')}
                    </span>
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                            previewRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            });
                            document
                                .getElementById('policy-reason')
                                ?.focus({ preventScroll: true });
                        }}
                    >
                        {t('Review & save')}
                    </Button>
                </div>
            )}

            <RestoreDialog
                version={restoreVersion}
                onClose={() => setRestoreVersion(null)}
                onConfirm={(reason) =>
                    restoreVersion &&
                    router.post(
                        `${FRAUD_URL}/restore`,
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
