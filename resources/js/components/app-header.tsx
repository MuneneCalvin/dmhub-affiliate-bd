import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { HeaderAccountMenu } from '@/components/header-account-menu';
import { HeaderDocsLink } from '@/components/header-docs-link';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { usePermissions } from '@/context/permission-context';
import { NavBarLanguageChanger, NavBarNotification } from '@/dev/core';
import { cn } from '@/lib/utils';
import advertiser from '@/routes/advertiser';
import publisher from '@/routes/publisher';
import publishers from '@/routes/publishers';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const advertiserNavigation = [
    {
        title: 'Overview',
        href: advertiser.dashboard.url(),
        permission: 'access_advertiser_dashboard',
    },
    {
        title: 'My Campaigns',
        href: advertiser.campaign.index.url(),
        permission: 'view_campaigns',
    },
];
const publisherNavigation = [
    {
        title: 'Marketplace',
        href: publisher.dashboard.url(),
        permission: 'access_publisher_dashboard',
    },
    {
        title: 'My Campaigns',
        href: publishers.my.campaign.url(),
        permission: 'view_my_campaigns',
    },
    {
        title: 'My Earnings',
        href: publisher.earnings.url(),
        permission: 'view_earnings',
    },
    {
        title: 'Invoices',
        href: publisher.invoices.url(),
        permission: 'view_invoices',
    },
    {
        title: 'Embed Scripts',
        href: publisher.scripts.url(),
        permission: 'view_embeded_scripts',
    },
];

export function AppHeader() {
    const {
        props: { auth, networkBranding },
        url,
    } = usePage<SharedData>();
    const { hasPermission } = usePermissions();
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const items = [
        ...(auth.user.is_advertiser ? advertiserNavigation : []),
        ...(auth.user.is_publisher ? publisherNavigation : []),
    ].filter((item) => hasPermission(item.permission));
    const normalize = (path: string) =>
        path
            .split(/[?#]/)[0]
            .replace(/\/index\/?$/, '')
            .replace(/\/$/, '');
    // Offer pages belong to campaigns even though their route has a separate prefix.
    const currentPath = normalize(url).replace(
        /^\/advertiser\/offers(?=\/|$)/,
        '/advertiser/campaigns',
    );
    const activeHref = items
        .filter(
            ({ href }) =>
                currentPath === normalize(href) ||
                currentPath.startsWith(`${normalize(href)}/`),
        )
        .sort(
            (a, b) => normalize(b.href).length - normalize(a.href).length,
        )[0]?.href;
    const role = auth.user.is_advertiser ? 'Advertiser' : 'Publisher';
    const brand = networkBranding?.network_name || 'DMHub';
    const links = (mobile = false) =>
        items.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={activeHref === item.href ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={cn(
                    mobile ? 'workspace-mobile-link' : 'workspace-nav-link',
                    activeHref === item.href && 'is-active',
                )}
            >
                {t(item.title)}
            </Link>
        ));
    return (
        <header className="workspace-top-header sticky top-0 z-30 border-b bg-background">
            <div className="workspace-top-bar">
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="workspace-menu-toggle"
                            aria-label={t('Open navigation')}
                        >
                            <Menu className="size-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-80 max-w-[90vw] bg-background"
                    >
                        <SheetHeader>
                            <SheetTitle>{brand}</SheetTitle>
                            <SheetDescription>{t(role)}</SheetDescription>
                        </SheetHeader>
                        <nav
                            aria-label={t('Main navigation')}
                            className="flex flex-col gap-1 px-4"
                        >
                            {links(true)}
                        </nav>
                        <div className="mt-auto flex items-center justify-end border-t p-4">
                            <NavBarLanguageChanger />
                        </div>
                    </SheetContent>
                </Sheet>
                <Link
                    href={items[0]?.href || '/dashboard'}
                    prefetch
                    className="workspace-brand"
                    aria-label={brand}
                >
                    <AppLogoIcon size="md" />
                    <span className="truncate">{brand}</span>
                </Link>
                <nav
                    aria-label={t('Main navigation')}
                    className="workspace-top-nav"
                >
                    {links()}
                </nav>
                <div className="workspace-header-tools ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
                    <HeaderDocsLink />
                    <div className="workspace-language">
                        <NavBarLanguageChanger />
                    </div>
                    <AppearanceToggleDropdown className="workspace-appearance" />
                    <NavBarNotification />
                    <div className="border-l pl-2 sm:pl-5">
                        <HeaderAccountMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}
