/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
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
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    Bolt,
    BookOpenCheck,
    Dot,
    FileText,
    Image,
    LayoutGrid,
    Megaphone,
    Network,
    Receipt,
    Rss,
    Settings,
    UserCheck,
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
        href: dashboard(),
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
        href: '',
        icon: Megaphone,
        permissions: ['view_campaigns', 'manage_campaigns'],
        children: [
            {
                title: 'My Campaigns',
                href: advertiser.campaign.index(),
                icon: Dot,
                permissions: ['view_campaigns', 'manage_campaigns'],
            },
            {
                title: 'My Terms',
                href: advertiser.terms(),
                icon: Dot,
                permissions: ['view_campaigns', 'manage_campaigns'],
            },
        ],
    },
    {
        title: 'Creatives',
        href: advertiser.creatives.index(),
        icon: Image,
        permissions: ['upload_creatives', 'manage_creatives'],
        children: [],
    },
    {
        title: 'Leads',
        href: advertiser.leads.index(),
        icon: UserCheck,
        permissions: [
            'view_campaigns',
            'manage_campaigns',
            'access_advertiser_dashboard',
        ],
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
    {
        title: 'Pool',
        href: '',
        icon: Users,
        permissions: ['access_pool'],
        children: [
            {
                title: 'Advertisers',
                href: networks.pool.advertisers.url(),
                icon: Rss,
                permissions: ['view_advertisers', 'manage_advertisers'],
            },
            {
                title: 'Publishers',
                href: networks.pool.publishers.url(),
                icon: BookOpenCheck,
                permissions: ['view_publishers', 'manage_publishers'],
            },
        ],
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
                icon: Dot,
                permissions: ['manage_roles'],
            },
            {
                title: 'Permissions',
                href: Permissions(),
                icon: Dot,
                permissions: ['manage_permissions'],
            },
        ],
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { t } = useTranslation();
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

    const translatedMainNavItems = filteredMainNavItems.map((item) => ({
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
            variant="floating"
            className="ml-0 bg-white dark:bg-sidebar"
        >
            <div className="flex h-full flex-col">
                <SidebarHeader className="pt-6 pb-2 group-data-[collapsible=icon]:hidden">
                    <div className="mt-2 mb-4 flex items-center justify-center">
                        <Link
                            href={dashboard()}
                            prefetch
                            className="flex size-18 items-center justify-center overflow-hidden rounded-full border border-primary"
                        >
                            <AppLogoIcon
                                size="lg"
                                className="size-12 object-contain"
                            />
                        </Link>
                    </div>
                </SidebarHeader>
                <SidebarContent className="group-data-[collapsible=icon]:mt-25">
                    <NavMain items={translatedMainNavItems} />
                </SidebarContent>
                <SidebarFooter className="group-data-[collapsible=icon]:hidden">
                    <NavUser />
                </SidebarFooter>
            </div>
        </Sidebar>
    );
}
