import { type DomainTone } from '@/lib/tones';

export type PermissionGroupKey =
    | 'campaigns'
    | 'partners'
    | 'finance'
    | 'analytics'
    | 'administration'
    | 'other';

export type PermissionGroupMeta = {
    key: PermissionGroupKey;
    /** English source string, translated at render. */
    title: string;
    tone: DomainTone | 'neutral';
};

export const PERMISSION_GROUPS: PermissionGroupMeta[] = [
    { key: 'campaigns', title: 'Campaigns', tone: 'brand' },
    { key: 'partners', title: 'Partners', tone: 'partners' },
    { key: 'finance', title: 'Finance', tone: 'finance' },
    { key: 'analytics', title: 'Analytics', tone: 'analytics' },
    { key: 'administration', title: 'Administration', tone: 'admin' },
    { key: 'other', title: 'Other', tone: 'neutral' },
];

/**
 * Domain of a permission, from its name. Checked in order, so specific words
 * win: `view_network_invoices` is finance, `configure_network` is
 * administration, `view_campaign_performance` is analytics.
 */
const RULES: [PermissionGroupKey, RegExp][] = [
    [
        'administration',
        /dashboard|role|permission|system_users|platform|configure_network|fraud|audit|dispute/,
    ],
    ['analytics', /analytics|report|performance/],
    [
        'finance',
        /funding|commission|ledger|invoice|payout|earning|statement|balance|budget/,
    ],
    ['partners', /publisher|advertiser|network|pool|application/],
    ['campaigns', /campaign|offer|creative|tracking|script|conversion/],
];

export function permissionGroup(name: string): PermissionGroupKey {
    return RULES.find(([, pattern]) => pattern.test(name))?.[0] ?? 'other';
}

/** Readable English labels (translation keys) for the seeded permissions. */
const LABELS: Record<string, string> = {
    access_admin_dashboard: 'Open the admin dashboard',
    access_advertiser_dashboard: 'Open the advertiser dashboard',
    access_network_dashboard: 'Open the network dashboard',
    access_pool: 'Browse the partner pool',
    access_publisher_dashboard: 'Open the publisher marketplace',
    adjust_commissions: 'Adjust commissions',
    apply_to_campaigns: 'Apply to campaigns',
    approve_advertisers: 'Approve advertisers',
    approve_applications: 'Approve applications',
    approve_network_invoices: 'Settle network invoices',
    approve_publishers: 'Approve publishers',
    configure_network: 'Network settings',
    create_campaigns: 'Create campaigns',
    create_network: 'Create networks',
    create_offers: 'Create offers',
    discover_campaigns: 'Discover campaigns',
    download_statements: 'Download statements',
    generate_tracking_links: 'Generate tracking links',
    handle_escalated_disputes: 'Handle escalated disputes',
    manage_advertisers: 'Manage advertisers',
    manage_campaigns: 'Edit campaigns',
    manage_creatives: 'Manage creatives',
    manage_fraud_rules: 'Fraud rules',
    manage_funding: 'Record campaign funding',
    manage_networks: 'Manage networks',
    manage_offers: 'Manage offers',
    manage_payouts: 'Manage payouts',
    manage_permissions: 'View permissions',
    manage_platform_settings: 'Platform settings',
    manage_publisher_account: 'Manage publisher account',
    manage_publisher_sites: 'Manage publisher sites',
    manage_publishers: 'Manage publishers',
    manage_roles: 'Manage roles',
    manage_system_users: 'System users',
    reject_applications: 'Reject applications',
    request_payouts: 'Request payouts',
    review_applications: 'Review applications',
    review_commissions: 'Review commissions',
    set_campaign_budgets: 'Set campaign budgets',
    share_tracking_links: 'Share tracking links',
    suspend_publishers: 'Suspend publishers',
    upload_creatives: 'Upload creatives',
    view_account_balance: 'View account balance',
    view_advertiser_reports: 'View advertiser reports',
    view_advertisers: 'View advertisers',
    view_audit_logs: 'View audit logs',
    view_campaign_performance: 'View campaign performance',
    view_campaigns: 'View campaigns',
    view_conversions: 'View conversions',
    view_earnings: 'View earnings',
    view_embeded_scripts: 'View embed scripts',
    view_financial_ledger: 'View financial ledger',
    view_invoices: 'View own invoices',
    view_my_campaigns: 'View my campaigns',
    view_network_analytics: 'View network analytics',
    view_network_invoices: 'View network invoices',
    view_network_reports: 'View network reports',
    view_networks: 'View networks',
    view_offers: 'View offers',
    view_publishers: 'View publishers',
};

/**
 * English label for a permission: the catalogue entry, or the code with
 * underscores as spaces ("export_data" → "Export data") for unknown ones.
 */
export function permissionLabel(name: string): string {
    if (LABELS[name]) return LABELS[name];
    const words = name.replaceAll('_', ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function hasPermissionLabel(name: string): boolean {
    return name in LABELS;
}

export type GroupedPermissions<T extends { name: string }> =
    (PermissionGroupMeta & { items: T[] })[];

/** Permissions bucketed by domain in menu order; empty groups dropped. */
export function groupPermissions<T extends { name: string }>(
    permissions: T[],
): GroupedPermissions<T> {
    return PERMISSION_GROUPS.map((group) => ({
        ...group,
        items: permissions.filter(
            (permission) => permissionGroup(permission.name) === group.key,
        ),
    })).filter((group) => group.items.length > 0);
}

/** Built-in role codes shown with readable names. */
const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super admin',
    'super-admin': 'Super admin',
    network_owner: 'Network owner',
    advertiser: 'Advertiser',
    publisher: 'Publisher',
};

/** English label for a role (built-in codes get a readable name). */
export function roleLabel(name: string): string {
    return ROLE_LABELS[name] ?? name;
}

export function isTranslatableRole(name: string): boolean {
    return name in ROLE_LABELS;
}
