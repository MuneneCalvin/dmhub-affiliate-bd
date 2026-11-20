import { describe, expect, it } from 'vitest';
import {
    buildNavigation,
    findActiveKey,
    primaryRole,
    type NavGroup,
    type NavUser,
} from './config';

// Grants from database/seeders/RolePermsSeeder.php.
const seeded = {
    super_admin: [
        'manage_funding',
        'review_commissions',
        'adjust_commissions',
        'view_financial_ledger',
        'manage_fraud_rules',
        'access_admin_dashboard',
        'create_network',
        'manage_networks',
        'view_networks',
        'manage_platform_settings',
        'manage_system_users',
        'view_audit_logs',
        'handle_escalated_disputes',
        'manage_roles',
        'manage_permissions',
        'approve_publishers',
        'suspend_publishers',
        'manage_publishers',
        'view_publishers',
        'approve_advertisers',
        'manage_advertisers',
        'view_advertisers',
        'access_pool',
        'review_applications',
        'approve_applications',
        'reject_applications',
        'create_campaigns',
        'manage_campaigns',
        'view_campaigns',
        'upload_creatives',
        'manage_creatives',
        'approve_network_invoices',
    ],
    network_owner: [
        'review_commissions',
        'adjust_commissions',
        'view_financial_ledger',
        'manage_fraud_rules',
        'view_conversions',
        'view_campaigns',
        'upload_creatives',
        'manage_creatives',
        'access_network_dashboard',
        'configure_network',
        'create_offers',
        'manage_offers',
        'view_offers',
        'approve_publishers',
        'suspend_publishers',
        'manage_publishers',
        'view_publishers',
        'approve_advertisers',
        'manage_advertisers',
        'view_advertisers',
        'view_network_analytics',
        'view_network_reports',
        'access_pool',
        'review_applications',
        'approve_applications',
        'reject_applications',
        'view_network_invoices',
    ],
    advertiser: [
        'view_conversions',
        'access_advertiser_dashboard',
        'create_campaigns',
        'manage_campaigns',
        'view_campaigns',
        'set_campaign_budgets',
        'generate_tracking_links',
        'upload_creatives',
        'manage_creatives',
        'view_campaign_performance',
        'view_advertiser_reports',
        'view_offers',
        'create_offers',
        'manage_offers',
    ],
    publisher: [
        'access_publisher_dashboard',
        'discover_campaigns',
        'apply_to_campaigns',
        'view_my_campaigns',
        'view_offers',
        'share_tracking_links',
        'view_conversions',
        'view_earnings',
        'generate_tracking_links',
        'request_payouts',
        'manage_payouts',
        'view_invoices',
        'download_statements',
        'manage_publisher_account',
        'manage_publisher_sites',
        'view_account_balance',
        'view_embeded_scripts',
    ],
};

const users: Record<string, NavUser> = {
    admin: { is_super_admin: true },
    network: { is_network: true },
    advertiser: { is_advertiser: true },
    publisher: { is_publisher: true },
};

const visible = (groups: NavGroup[]) =>
    Object.fromEntries(
        groups.map((group) => [group.key, group.items.map((i) => i.key)]),
    );
const titles = (groups: NavGroup[]) =>
    Object.fromEntries(
        groups.flatMap((group) => group.items.map((i) => [i.key, i.titleKey])),
    );

describe('buildNavigation', () => {
    it('gives the super admin the platform menu', () => {
        const groups = buildNavigation(users.admin, seeded.super_admin);
        expect(visible(groups)).toEqual({
            overview: ['overview-admin'],
            campaigns: ['campaigns', 'leads', 'applications'],
            partners: ['networks', 'advertisers', 'publishers', 'pool'],
            finance: [
                'financial-review',
                'invoices-from-publishers',
                'network-invoices',
            ],
            administration: ['system-users', 'roles', 'fraud'],
        });
        expect(titles(groups)).toMatchObject({
            'financial-review': 'Platform finance',
            'network-invoices': 'Network invoices',
        });
    });

    it('gives the network owner the network menu', () => {
        const groups = buildNavigation(users.network, seeded.network_owner);
        expect(visible(groups)).toEqual({
            overview: ['overview-network'],
            campaigns: ['campaigns', 'applications'],
            partners: ['advertisers', 'publishers', 'pool'],
            finance: [
                'financial-review',
                'invoices-from-publishers',
                'network-invoices',
            ],
            administration: ['network-settings', 'fraud'],
        });
        expect(titles(groups)).toMatchObject({
            campaigns: 'Campaigns',
            'financial-review': 'Financial review',
            'network-invoices': 'My invoices',
        });
    });

    it('gives the advertiser their campaigns and creatives', () => {
        const groups = buildNavigation(users.advertiser, seeded.advertiser);
        expect(visible(groups)).toEqual({
            overview: ['overview-advertiser'],
            campaigns: ['campaigns', 'creatives'],
        });
        expect(titles(groups).campaigns).toBe('My campaigns');
    });

    it('gives the publisher the marketplace, scripts and finance', () => {
        expect(
            visible(buildNavigation(users.publisher, seeded.publisher)),
        ).toEqual({
            overview: ['marketplace'],
            campaigns: ['my-campaigns', 'scripts'],
            finance: ['earnings', 'publisher-invoices'],
        });
    });

    it('shows a partial role only what it was granted and drops empty groups', () => {
        expect(
            visible(
                buildNavigation(users.network, [
                    'view_publishers',
                    'review_commissions',
                ]),
            ),
        ).toEqual({
            partners: ['publishers'],
            finance: ['financial-review'],
        });
    });

    it('shows Leads to advertisers and network owners with the leads permission, never to publishers', () => {
        const grant = ['manage_leads'];
        expect(visible(buildNavigation(users.advertiser, grant))).toEqual({
            campaigns: ['leads'],
        });
        expect(visible(buildNavigation(users.network, grant))).toEqual({
            campaigns: ['leads'],
        });
        expect(visible(buildNavigation(users.publisher, grant))).toEqual({});
    });

    it('never shows another category’s pages, whatever the permissions', () => {
        const everything = Object.values(seeded).flat();
        const keys = buildNavigation(users.publisher, everything).flatMap(
            (group) => group.items.map((item) => item.key),
        );
        expect(keys).not.toContain('advertisers');
        expect(keys).not.toContain('system-users');
        expect(keys).not.toContain('campaigns');
    });

    it('keeps one overview for multi-role accounts', () => {
        const groups = buildNavigation(
            { is_network: true, is_advertiser: true },
            [...seeded.network_owner, ...seeded.advertiser],
        );
        expect(visible(groups).overview).toEqual(['overview-network']);
        expect(primaryRole({ is_network: true, is_advertiser: true })).toBe(
            'network',
        );
    });
});

describe('findActiveKey', () => {
    const admin = buildNavigation(users.admin, seeded.super_admin);
    const network = buildNavigation(users.network, seeded.network_owner);
    const publisher = buildNavigation(users.publisher, seeded.publisher);

    it.each([
        ['/advertiser/campaigns/show/12', network, 'campaigns'],
        ['/advertiser/campaigns/create', network, 'campaigns'],
        ['/advertiser/offers/4/edit', network, 'campaigns'],
        ['/advertisers/show/3?tab=campaigns', network, 'advertisers'],
        ['/publishers/show/9', network, 'publishers'],
        ['/networks/pool/advertisers/2', network, 'pool'],
        ['/applications/show/5', network, 'applications'],
        ['/finance/earnings', network, 'financial-review'],
        ['/finance/earnings/7/fraud', network, 'fraud'],
        ['/finance/fraud', network, 'fraud'],
        ['/networks/show/1', admin, 'networks'],
        ['/networks/invoices', admin, 'network-invoices'],
        ['/system/settings/role/3/permissions', admin, 'roles'],
        ['/system/settings/permissions', admin, 'roles'],
        ['/publishers/my/campaigns/show/4', publisher, 'my-campaigns'],
        ['/publishers/12/campaign/application', publisher, 'marketplace'],
        ['/publisher/invoices/create', publisher, 'publisher-invoices'],
        ['/publisher/scripts/3', publisher, 'scripts'],
    ])('%s belongs to its list item', (url, groups, key) => {
        expect(findActiveKey(groups, url)).toBe(key);
    });

    it('matches nothing on pages outside the menu', () => {
        expect(findActiveKey(network, '/settings/profile')).toBeUndefined();
    });
});
