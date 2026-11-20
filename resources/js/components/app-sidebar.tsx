import { NavMain } from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/context/permission-context';
import { initialsFrom } from '@/lib/tones';
import {
    buildNavigation,
    primaryRole,
    roleLabels,
    type NavCounts,
} from '@/navigation/config';
import { dashboard } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Link2 } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Brand mark: the tenant's sidebar logo when set, otherwise the plain brand icon (as on the sign-in page). */
function SidebarBrand() {
    const { networkBranding } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const name = networkBranding?.network_name || 'Brand New Day';
    return (
        <Link
            href={dashboard()}
            prefetch
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-[12px] px-1.5 py-1"
        >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-brand shadow-primary">
                {networkBranding?.sidebar_logo_url ? (
                    <img
                        src={networkBranding.sidebar_logo_url}
                        alt=""
                        className="size-full object-contain p-1.5"
                    />
                ) : (
                    <Link2
                        className="size-5 text-white"
                        strokeWidth={2.4}
                        aria-hidden="true"
                    />
                )}
            </span>
            <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:sr-only">
                <strong className="truncate text-[17px] font-extrabold tracking-[-0.01em] text-white">
                    {name}
                </strong>
                <span className="text-xs text-sidebar-label">
                    {t('Affiliate workspace')}
                </span>
            </span>
        </Link>
    );
}

/** Network name and the user's role; not interactive (one workspace per user). */
function WorkspaceCard() {
    const { auth, networkBranding, name } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const role = primaryRole(auth.user);
    const workspace = networkBranding?.network_name || name || 'Brand New Day';
    return (
        <div
            data-slot="workspace-card"
            className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] border border-white/8 bg-white/6 px-3 py-2.5 text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5"
        >
            <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-partners-strong text-[13px] font-extrabold"
            >
                {initialsFrom(workspace)}
            </span>
            <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:sr-only">
                <strong className="truncate text-[13px] font-bold">
                    {workspace}
                </strong>
                <span className="text-xs text-sidebar-label">
                    {role ? t(roleLabels[role]) : t('Workspace')}
                </span>
            </span>
        </div>
    );
}

function DocsCard() {
    const { t } = useTranslation();
    return (
        <>
            {/* Full card on tall screens; a compact link when short or collapsed. */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/6 bg-white/5 p-4 group-data-[collapsible=icon]:hidden [@media(max-height:999px)]:hidden">
                <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-[11px] bg-finance-nav text-sidebar [&_svg]:size-[18px]"
                >
                    <BookOpen />
                </span>
                <div className="flex flex-col gap-0.5">
                    <strong className="font-bold text-white">
                        {t('Integration guide')}
                    </strong>
                    <span className="text-xs text-sidebar-text">
                        {t('Tracking pixels, postbacks and API keys.')}
                    </span>
                </div>
                <a
                    href="/docs"
                    className="inline-flex h-10 items-center justify-center rounded-[11px] bg-white text-[13px] font-bold text-sidebar hover:bg-white/90"
                >
                    {t('Open docs')}
                </a>
            </div>
            <a
                href="/docs"
                className="hidden min-h-11 items-center gap-3 rounded-[13px] bg-white/5 px-2.5 py-[7px] text-sm font-semibold text-sidebar-text group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-[7px] hover:bg-white/8 hover:text-white [@media(max-height:999px)]:flex"
            >
                <span
                    aria-hidden="true"
                    className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-finance-nav text-sidebar [&_svg]:size-4"
                >
                    <BookOpen />
                </span>
                <span className="group-data-[collapsible=icon]:sr-only">
                    {t('Open docs')}
                </span>
            </a>
        </>
    );
}

export function AppSidebar() {
    const { auth, navCounts } = usePage<
        SharedData & { navCounts?: NavCounts | null }
    >().props;
    const { permissions } = usePermissions();
    const groups = useMemo(
        () => buildNavigation(auth.user, permissions),
        [auth.user, permissions],
    );

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="gap-[22px] px-4 pt-5 pb-0 group-data-[collapsible=icon]:px-3.5">
                <SidebarBrand />
                <WorkspaceCard />
            </SidebarHeader>
            <SidebarContent className="px-4 py-[22px] group-data-[collapsible=icon]:px-3.5">
                <NavMain groups={groups} counts={navCounts} />
            </SidebarContent>
            <SidebarFooter className="px-4 pt-0 pb-5 group-data-[collapsible=icon]:px-3.5">
                <DocsCard />
            </SidebarFooter>
        </Sidebar>
    );
}
