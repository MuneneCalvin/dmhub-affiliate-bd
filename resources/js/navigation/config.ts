import { type DomainTone } from '@/lib/tones';
import { dashboard as adminDashboard } from '@/routes/admin';
import adminInvoices from '@/routes/admin/invoices';
import advertiser from '@/routes/advertiser';
import advertiserCreatives from '@/routes/advertiser/creatives';
import advertisers from '@/routes/advertisers';
import applications from '@/routes/applications';
import finance from '@/routes/finance';
import fraud from '@/routes/fraud';
import leads from '@/routes/leads';
import { dashboard as networkDashboard } from '@/routes/network';
import networks from '@/routes/networks';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import systemSettings from '@/routes/system/settings';
import {
    Building2,
    Code2,
    FileText,
    Gauge,
    Image,
    Inbox,
    LayoutGrid,
    Megaphone,
    Network,
    Receipt,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Store,
    UserRoundCheck,
    Users,
    UsersRound,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

/** Account categories, mirroring the server's `is_*` flags. */
export type NavRole = 'admin' | 'network' | 'advertiser' | 'publisher';

/** Shared Inertia prop `navCounts` keys that can drive a sidebar badge. */
export type NavBadgeKey = 'pendingApplications' | 'fraudFlags';
export type NavCounts = Partial<Record<NavBadgeKey, number | null>>;

export type NavItemConfig = {
    key: string;
    /** English source string; translated with t() when rendered. */
    titleKey: string;
    /** Role-specific label, e.g. advertisers read "My campaigns". */
    titleByRole?: Partial<Record<NavRole, string>>;
    href: string;
    icon: LucideIcon;
    domain: DomainTone;
    /** Visible when the user has any of these. Super admins pass, like the server. */
    permission?: string[];
    /** Visible only for these account categories (mirrors the route middleware). */
    roles?: NavRole[];
    /** Only the first visible item per slot is kept (one "Overview" per user). */
    slot?: string;
    /** Extra path prefixes that belong to this item (detail/create pages). */
    matchPatterns?: string[];
    badgeKey?: NavBadgeKey;
};

export type NavGroupConfig = {
    key: string;
    /** Group label; omitted for the top "overview" group. */
    titleKey?: string;
    domain: DomainTone;
    items: NavItemConfig[];
};

export type NavItem = Omit<NavItemConfig, 'titleByRole' | 'roles' | 'slot'>;
export type NavGroup = Omit<NavGroupConfig, 'items'> & { items: NavItem[] };

export type NavUser = {
    is_super_admin?: unknown;
    is_network?: unknown;
    is_advertiser?: unknown;
    is_publisher?: unknown;
    [key: string]: unknown;
};

export const navigation: NavGroupConfig[] = [
    {
        key: 'overview',
        domain: 'brand',
        items: [
            {
                key: 'overview-admin',
                titleKey: 'Overview',
                href: adminDashboard.url(),
                icon: Gauge,
                domain: 'brand',
                roles: ['admin'],
                permission: ['access_admin_dashboard'],
                slot: 'overview',
            },
            {
                key: 'overview-network',
                titleKey: 'Overview',
                href: networkDashboard.url(),
                icon: Gauge,
                domain: 'brand',
                roles: ['network'],
                permission: ['access_network_dashboard'],
                slot: 'overview',
            },
            {
                key: 'overview-advertiser',
                titleKey: 'Overview',
                href: advertiser.dashboard.url(),
                icon: Gauge,
                domain: 'brand',
                roles: ['advertiser'],
                permission: ['access_advertiser_dashboard'],
                slot: 'overview',
            },
            {
                key: 'marketplace',
                titleKey: 'Marketplace',
                href: publisher.dashboard.url(),
                icon: Store,
                domain: 'brand',
                roles: ['publisher'],
                permission: ['access_publisher_dashboard'],
                matchPatterns: ['/publishers/*/campaign/application'],
            },
        ],
    },
    {
        key: 'campaigns',
        titleKey: 'Campaigns',
        domain: 'brand',
        items: [
            {
                key: 'campaigns',
                titleKey: 'Campaigns',
                titleByRole: { advertiser: 'My campaigns' },
                href: advertiser.campaign.index.url(),
                icon: Megaphone,
                domain: 'brand',
                roles: ['admin', 'network', 'advertiser'],
                permission: ['view_campaigns'],
                matchPatterns: [
                    '/advertiser/campaigns',
                    '/advertiser/offers',
                    '/advertiser/terms',
                ],
            },
            {
                key: 'my-campaigns',
                titleKey: 'My campaigns',
                href: publishers.my.campaign.url(),
                icon: Megaphone,
                domain: 'brand',
                roles: ['publisher'],
                permission: ['view_my_campaigns'],
            },
            {
                key: 'creatives',
                titleKey: 'Creatives',
                href: advertiserCreatives.index.url(),
                icon: Image,
                domain: 'brand',
                roles: ['advertiser'],
                permission: ['manage_creatives'],
            },
            {
                key: 'leads',
                titleKey: 'Leads',
                href: leads.index.url(),
                icon: Inbox,
                domain: 'brand',
                roles: ['admin', 'network', 'advertiser'],
                permission: ['manage_leads'],
            },
            {
                key: 'applications',
                titleKey: 'Applications',
                href: applications.index.url(),
                icon: UserRoundCheck,
                domain: 'admin',
                roles: ['admin', 'network'],
                permission: ['review_applications'],
                badgeKey: 'pendingApplications',
            },
            {
                key: 'scripts',
                titleKey: 'Embed scripts',
                href: publisher.scripts.url(),
                icon: Code2,
                domain: 'brand',
                roles: ['publisher'],
                permission: ['view_embeded_scripts'],
            },
        ],
    },
    {
        key: 'partners',
        titleKey: 'Partners',
        domain: 'partners',
        items: [
            {
                key: 'networks',
                titleKey: 'Networks',
                href: networks.index.url(),
                icon: Network,
                domain: 'partners',
                roles: ['admin'],
                permission: ['view_networks'],
            },
            {
                key: 'advertisers',
                titleKey: 'Advertisers',
                href: advertisers.index.url(),
                icon: Building2,
                domain: 'partners',
                roles: ['admin', 'network'],
                permission: ['view_advertisers'],
            },
            {
                key: 'publishers',
                titleKey: 'Publishers',
                href: publishers.index.url(),
                icon: UsersRound,
                domain: 'partners',
                roles: ['admin', 'network'],
                permission: ['view_publishers'],
            },
            {
                key: 'pool',
                titleKey: 'Partner pool',
                href: networks.pool.publishers.url(),
                icon: LayoutGrid,
                domain: 'partners',
                roles: ['admin', 'network'],
                permission: ['access_pool'],
                matchPatterns: ['/networks/pool'],
            },
        ],
    },
    {
        key: 'finance',
        titleKey: 'Finance',
        domain: 'finance',
        items: [
            {
                key: 'earnings',
                titleKey: 'My earnings',
                href: publisher.earnings.url(),
                icon: Wallet,
                domain: 'finance',
                roles: ['publisher'],
                permission: ['view_earnings'],
            },
            {
                key: 'publisher-invoices',
                titleKey: 'Invoices',
                href: publisher.invoices.url(),
                icon: Receipt,
                domain: 'finance',
                roles: ['publisher'],
                permission: ['view_invoices'],
            },
            {
                key: 'financial-review',
                titleKey: 'Financial review',
                titleByRole: { admin: 'Platform finance' },
                href: finance.index.url(),
                icon: Wallet,
                domain: 'finance',
                roles: ['admin', 'network'],
                permission: ['review_commissions'],
                matchPatterns: ['/finance/earnings', '/finance/networks'],
                badgeKey: 'fraudFlags',
            },
            {
                key: 'invoices-from-publishers',
                titleKey: 'Publisher invoices',
                href: adminInvoices.index.url(),
                icon: Receipt,
                domain: 'finance',
                roles: ['admin', 'network'],
                permission: ['view_network_invoices'],
            },
            {
                key: 'network-invoices',
                titleKey: 'My invoices',
                titleByRole: { admin: 'Network invoices' },
                href: networks.invoices.index.url(),
                icon: FileText,
                domain: 'finance',
                roles: ['admin', 'network'],
                permission: [
                    'view_network_invoices',
                    'approve_network_invoices',
                ],
            },
        ],
    },
    {
        key: 'administration',
        titleKey: 'Administration',
        domain: 'admin',
        items: [
            {
                key: 'network-settings',
                titleKey: 'Network settings',
                href: networks.settings.index.url(),
                icon: Settings,
                domain: 'admin',
                roles: ['network'],
                permission: ['configure_network'],
            },
            {
                key: 'system-users',
                titleKey: 'System users',
                href: systemSettings.users.url(),
                icon: Users,
                domain: 'admin',
                roles: ['admin'],
                permission: ['manage_system_users'],
            },
            {
                key: 'roles',
                titleKey: 'Roles & permissions',
                href: systemSettings.roles.url(),
                icon: ShieldCheck,
                domain: 'admin',
                roles: ['admin'],
                permission: ['manage_roles'],
                // The permissions catalogue is linked from the roles page.
                matchPatterns: ['/system/settings/permissions'],
            },
            {
                key: 'fraud',
                titleKey: 'Fraud rules',
                href: fraud.index.url(),
                icon: ShieldAlert,
                domain: 'admin',
                roles: ['admin', 'network'],
                permission: ['manage_fraud_rules'],
                matchPatterns: ['/finance/earnings/*/fraud'],
            },
        ],
    },
];

/** Account categories a user belongs to, from the server's `is_*` flags. */
export function userRoles(user: NavUser): NavRole[] {
    const roles: NavRole[] = [];
    if (user.is_super_admin) roles.push('admin');
    if (user.is_network) roles.push('network');
    if (user.is_advertiser) roles.push('advertiser');
    if (user.is_publisher) roles.push('publisher');
    return roles;
}

/** The role used for labels and the role chip (highest authority first). */
export function primaryRole(user: NavUser): NavRole | null {
    return userRoles(user)[0] ?? null;
}

export const roleLabels: Record<NavRole, string> = {
    admin: 'Super admin',
    network: 'Network owner',
    advertiser: 'Advertiser',
    publisher: 'Publisher',
};

export const roleTones: Record<NavRole, DomainTone> = {
    admin: 'admin',
    network: 'partners',
    advertiser: 'finance',
    publisher: 'brand',
};

/**
 * The groups a user may see: items are filtered by account category and
 * permission (super admins pass permission checks, as on the server), one
 * item per slot is kept and empty groups are dropped.
 */
export function buildNavigation(
    user: NavUser,
    permissions: readonly string[],
    groups: NavGroupConfig[] = navigation,
): NavGroup[] {
    const roles = userRoles(user);
    const isSuperAdmin = Boolean(user.is_super_admin);
    const granted = new Set(permissions);
    const usedSlots = new Set<string>();
    const labelRole = roles[0];

    return groups
        .map(({ items, ...group }) => ({
            ...group,
            items: items
                .filter((item) => {
                    if (
                        item.roles &&
                        !item.roles.some((role) => roles.includes(role))
                    )
                        return false;
                    if (
                        item.permission?.length &&
                        !isSuperAdmin &&
                        !item.permission.some((name) => granted.has(name))
                    )
                        return false;
                    if (item.slot) {
                        if (usedSlots.has(item.slot)) return false;
                        usedSlots.add(item.slot);
                    }
                    return true;
                })
                .map(({ titleByRole, ...item }): NavItem => {
                    delete item.roles;
                    delete item.slot;
                    return {
                        ...item,
                        titleKey:
                            (labelRole && titleByRole?.[labelRole]) ||
                            item.titleKey,
                    };
                }),
        }))
        .filter((group) => group.items.length > 0);
}

/** Path without query, hash, trailing slash or a trailing `/index`. */
export function normalizePath(path: string): string {
    const pathname = path.startsWith('http')
        ? new URL(path).pathname
        : path.split(/[?#]/)[0];
    return pathname.replace(/\/index\/?$/, '').replace(/\/$/, '') || '/';
}

function matchLength(pattern: string, path: string): number {
    const base = normalizePath(pattern);
    const regex = new RegExp(
        `^${base
            .split('*')
            .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[^/]+')}(?:/|$)`,
    );
    return regex.test(path) ? base.length : -1;
}

/**
 * Key of the item the current URL belongs to: the most specific matching
 * href or pattern wins, so /finance/earnings/1/fraud is "Fraud rules", not
 * "Financial review".
 */
export function findActiveKey(
    groups: NavGroup[],
    url: string,
): string | undefined {
    const path = normalizePath(url);
    let best: { key: string; length: number } | undefined;
    for (const item of groups.flatMap((group) => group.items)) {
        for (const pattern of [item.href, ...(item.matchPatterns ?? [])]) {
            const length = matchLength(pattern, path);
            if (length >= 0 && (!best || length > best.length))
                best = { key: item.key, length };
        }
    }
    return best?.key;
}
