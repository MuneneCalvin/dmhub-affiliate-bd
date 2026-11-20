import ThemeToggle from '@/components/appearance-dropdown';
import { HeaderAccountMenu } from '@/components/header-account-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationsMenu } from '@/components/notifications-menu';
import { GlobalSearch } from '@/components/search';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { toneClasses } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { primaryRole, roleLabels, roleTones } from '@/navigation/config';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function SidebarToggle() {
    const { toggleSidebar, isMobile, open, openMobile } = useSidebar();
    const { t } = useTranslation();
    const expanded = isMobile ? openMobile : open;
    return (
        <Button
            variant="secondary"
            size="icon"
            onClick={toggleSidebar}
            aria-label={isMobile ? t('Open navigation') : t('Toggle sidebar')}
            aria-expanded={expanded}
            data-sidebar="trigger"
        >
            <PanelLeft aria-hidden="true" />
        </Button>
    );
}

/** Workspace top bar: sidebar toggle, search, role, language, theme, notifications, account. */
export function AppSidebarHeader() {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const role = primaryRole(auth.user);

    return (
        <header
            data-slot="topbar"
            className="workspace-header sticky top-0 z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b bg-surface px-4 py-2.5 sm:gap-3.5 md:min-h-[72px] md:px-9 md:py-3"
        >
            <SidebarToggle />
            <GlobalSearch className="w-11 flex-none justify-center px-0 sm:w-auto sm:max-w-[520px] sm:flex-[1_1_280px] sm:justify-start sm:px-3.5" />
            <div className="ml-auto flex flex-wrap items-center gap-2">
                {role && (
                    <span
                        className={cn(
                            'hidden h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold lg:inline-flex',
                            toneClasses[roleTones[role]].soft,
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'size-[7px] rounded-full',
                                toneClasses[roleTones[role]].fill,
                            )}
                        />
                        {t(roleLabels[role])}
                    </span>
                )}
                <LanguageSwitcher />
                <ThemeToggle />
                <NotificationsMenu />
                <HeaderAccountMenu />
            </div>
        </header>
    );
}
