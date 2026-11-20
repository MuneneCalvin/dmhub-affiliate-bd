/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/context/permission-context';
import { dashboard } from '@/routes';
import advertiser from '@/routes/advertiser';
import advertisers from '@/routes/advertisers';
import applications from '@/routes/applications';
import networks from '@/routes/networks';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import system from '@/routes/system';
import { Permissions, roles } from '@/routes/system/settings';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bolt,
    BookOpenCheck,
    FileText,
    Inbox,
    KeyRound,
    LayoutGrid,
    Megaphone,
    Network,
    Receipt,
    Rss,
    Settings,
    ShieldCheck,
    Users,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppLogoIcon from './app-logo-icon';

const mainNavItems: NavItem[] = [
    // Dashnoard SECTION
    {
        title: 'Marketplace',
        href: publisher.dashboard(),
        icon: LayoutGrid,
        permissions: ['access_publisher_dashboard'],
        children: [],
    },
    {
        title: 'Dashboard',
        href: '/advertiser/dashboard',
        icon: LayoutGrid,
        permissions: ['access_advertiser_dashboard'],
        children: [],
    },
    {
        title: 'Dashboard',
        href: '/network/dashboard',
        icon: LayoutGrid,
        permissions: ['access_network_dashboard'],
        children: [],
    },
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutGrid,
        permissions: ['access_admin_dashboard'],
        children: [],
    },
    // PUBLISHER SECTION
    {
        title: 'My Campaigns',
        href: publishers.my.campaign.url(),
        icon: Megaphone,
        permissions: ['view_my_campaigns'],
        children: [],
    },
    {
        title: 'My Earnings',
        href: publisher.earnings.url(),
        icon: Wallet,
        permissions: ['view_earnings'],
        children: [],
    },
    {
        title: 'Invoices',
        href: publisher.invoices.url(),
        icon: Receipt,
        permissions: ['view_invoices'],
        children: [],
    },
    {
        title: 'Embed Scripts',
        href: publisher.scripts.url(),
        icon: FileText,
        permissions: ['view_embeded_scripts'],
        children: [],
    },

    // ADVERTISER SECTION
    {
        title: 'My Campaigns',
        href: advertiser.campaign.index(),
        icon: Megaphone,
        permissions: ['view_campaigns'],
        children: [],
    },

    {
        title: 'Leads',
        href: '/leads',
        icon: Inbox,
        permissions: ['manage_leads'],
        children: [],
    },
    {
        title: 'Financial review',
        href: '/finance',
        icon: Wallet,
        permissions: ['review_commissions'],
        children: [],
    },

    // NETWORK OWNER SECTION
    {
        title: 'Advertisers',
        href: advertisers.index(),
        icon: Rss,
        permissions: ['view_advertisers', 'manage_advertisers'],
        children: [],
    },
    {
        title: 'Publishers',
        href: publishers.index(),
        icon: BookOpenCheck,
        permissions: ['view_publishers', 'manage_publishers'],
        children: [],
    },
    {
        title: 'Network Settings',
        href: networks.settings.index.url(),
        icon: Settings,
        permissions: ['configure_network'],
        children: [],
    },
    {
        title: 'Publisher Applications',
        href: applications.index.url(),
        icon: FileText,
        permissions: [
            'review_applications',
            'approve_applications',
            'reject_applications',
        ],
        children: [],
    },
    {
        title: 'Publisher Invoices',
        href: '/admin/invoices',
        icon: Receipt,
        permissions: [
            'review_applications',
            'approve_applications',
            'manage_publishers',
        ],
        children: [],
    },
    {
        title: 'My Invoices',
        href: '/networks/invoices',
        icon: Receipt,
        permissions: ['view_network_invoices'],
        children: [],
    },

    // SUPER ADMIN SECTION
    {
        title: 'Networks',
        href: networks.index(),
        icon: Network,
        permissions: ['view_networks', 'manage_networks', 'create_network'],
        children: [],
    },
    {
        title: 'Network Invoices',
        href: '/networks/invoices',
        icon: Receipt,
        permissions: ['approve_network_invoices'],
        children: [],
    },
    {
        title: 'System Users',
        href: system.settings.users.url(),
        icon: Users,
        permissions: ['manage_system_users'],
        children: [],
    },
    {
        title: 'Settings',
        href: '',
        icon: Bolt,
        permissions: ['manage_roles', 'manage_permissions'],
        children: [
            {
                title: 'Roles',
                href: roles(),
                icon: ShieldCheck,
                permissions: ['manage_roles'],
            },
            {
                title: 'Permissions',
                href: Permissions(),
                icon: KeyRound,
                permissions: ['manage_permissions'],
            },
        ],
    },
];

export function AppSidebar() {
    const { t } = useTranslation();
    const { networkBranding, auth } = usePage<SharedData>().props;
    const { hasAnyPermission } = usePermissions();

    const hasPermission = (permissions?: string[]) =>
        Array.isArray(permissions) && permissions.length > 0
            ? hasAnyPermission(permissions)
            : true;

    const filteredMainNavItems: NavItem[] = mainNavItems
        .map((item) => ({
            ...item,
            children:
                item.children?.filter((child: any) =>
                    hasPermission(child.permissions),
                ) || [],
        }))
        .filter(
            (item) =>
                hasPermission(item.permissions) ||
                (item.children?.length ?? 0) > 0,
        );

    const categories = [
        {
            title: 'Campaigns',
            icon: Megaphone,
            names: ['My Campaigns', 'Leads', 'Creatives', 'Embed Scripts'],
        },
        {
            title: 'Partners',
            icon: Users,
            names: [
                'Advertisers',
                'Publishers',
                'Publisher Applications',
                'Networks',
            ],
        },
        {
            title: 'Finance',
            icon: Wallet,
            names: [
                'Financial review',
                'My Earnings',
                'Invoices',
                'Publisher Invoices',
                'My Invoices',
                'Network Invoices',
            ],
        },
        {
            title: 'Administration',
            icon: Settings,
            names: ['System Users', 'Settings', 'Network Settings'],
        },
    ];
    const grouped: NavItem[] = filteredMainNavItems
        .filter((item) => ['Dashboard', 'Marketplace'].includes(item.title))
        .map((item) => ({
            ...item,
            title: item.title === 'Dashboard' ? 'Overview' : item.title,
        }));
    for (const category of categories) {
        const children = filteredMainNavItems
            .filter((item) => category.names.includes(item.title))
            .flatMap((item) => (item.children?.length ? item.children : [item]))
            .map((item) => ({
                ...item,
                title:
                    item.title === 'My Campaigns' &&
                    (auth.user.is_super_admin || auth.user.is_network)
                        ? 'Campaign directory'
                        : item.title,
            }));
        const unique = children.filter(
            (item, index) =>
                children.findIndex(
                    (other) =>
                        JSON.stringify(other.href) ===
                        JSON.stringify(item.href),
                ) === index,
        );
        if (unique.length)
            grouped.push({
                title: category.title,
                href: '',
                icon: category.icon,
                children: unique,
            });
    }
    const translatedMainNavItems = grouped.map((item) => ({
        ...item,
        title: t(item.title),
        children: item.children?.map((child: any) => ({
            ...child,
            title: t(child.title),
        })),
    }));

    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-r border-sidebar-border"
        >
            <div className="flex h-full flex-col">
                <SidebarHeader className="h-[72px] justify-center border-b border-sidebar-border px-5 group-data-[collapsible=icon]:px-3">
                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex min-w-0 items-center gap-3"
                        aria-label={
                            networkBranding?.network_name || 'Brand New Day'
                        }
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center">
                            <AppLogoIcon size="md" />
                        </div>
                        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="block truncate text-base font-semibold tracking-tight text-foreground">
                                {networkBranding?.network_name ||
                                    'Brand New Day'}
                            </span>
                            <span className="block text-[11px] text-sidebar-foreground/70">
                                {t('Affiliate Platform')}
                            </span>
                        </div>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="px-2 py-6">
                    <NavMain items={translatedMainNavItems} />
                </SidebarContent>
            </div>
        </Sidebar>
    );
}
