import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { HeaderAccountMenu } from '@/components/header-account-menu';
import { HeaderDocsLink } from '@/components/header-docs-link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavBarLanguageChanger, NavBarNotification } from '@/dev/core';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export function AppSidebarHeader() {
    const { name, networkBranding, auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const role = auth.user.is_super_admin
        ? 'Administrator'
        : auth.user.is_network
          ? 'Network'
          : auth.user.is_advertiser
            ? 'Advertiser'
            : auth.user.is_publisher
              ? 'Publisher'
              : 'Workspace';
    return (
        <header className="workspace-header sticky top-0 z-30 flex shrink-0 items-center justify-between gap-3 border-b bg-card px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 text-muted-foreground" />
                <span
                    className="hidden h-5 w-px bg-border sm:block"
                    aria-hidden="true"
                />
                <span className="truncate text-sm font-semibold">
                    {networkBranding?.network_name || name || 'DM Hub'}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                    /
                </span>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                    {t(role)}
                </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 md:gap-3">
                <HeaderDocsLink />
                <NavBarLanguageChanger />
                <AppearanceToggleDropdown />
                <NavBarNotification />
                <HeaderAccountMenu />
            </div>
        </header>
    );
}
