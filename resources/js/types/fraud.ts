export type RuleMode = 'off' | 'monitor' | 'enforce';
export type FraudRule = {
    mode: RuleMode;
    weight: number;
    event_types: string[];
    settings: Record<string, number>;
};
export type FraudConfiguration = {
    mode: 'disabled' | 'shadow' | 'automatic';
    max_score: number;
    wait_minutes: Record<string, number>;
    event_types: string[];
    assignment_ids: number[];
    limits: Record<
        string,
        { max_commission_minor: number; daily_limit_minor: number }
    >;
    rules: Record<string, FraudRule>;
};
export type FraudRuleResult = {
    id: string;
    label: string;
    mode: RuleMode;
    outcome: string;
    reason: string;
    contribution: number;
    observed: unknown;
    settings: Record<string, number>;
};
export type FraudAssessment = {
    id: number;
    status: string;
    score: number | null;
    recommendation: string | null;
    reasons: string[] | null;
    results: FraudRuleResult[] | null;
    evidence: Record<string, unknown> | null;
    eligible_at: string | null;
    applied_at: string | null;
    created_at: string;
    last_error: string | null;
    policy_snapshot: {
        configuration: FraudConfiguration;
        network_version_id: number | null;
        campaign_version_id: number | null;
    } | null;
};
