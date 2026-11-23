import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { type DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import {
    findActiveKey,
    type NavCounts,
    type NavGroup,
    type NavItem,
} from '@/navigation/config';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

/** Icon colour on the navy sidebar, per domain. */
const navText: Record<DomainTone, string> = {
    brand: 'text-brand-nav',
    partners: 'text-partners-nav',
    finance: 'text-finance-nav',
    admin: 'text-admin-nav',
    analytics: 'text-analytics-nav',
};

const navDot: Record<DomainTone, string> = {
    brand: 'bg-brand-nav',
    partners: 'bg-partners-nav',
    finance: 'bg-finance-nav',
    admin: 'bg-admin-nav',
    analytics: 'bg-analytics-nav',
};

const badgeClasses: Record<string, string> = {
    pendingApplications: 'bg-admin text-white',
    fraudFlags: 'bg-finance-nav text-sidebar',
    pendingPartners: 'bg-admin text-white',
};

function NavLink({
    item,
    active,
    count,
}: {
    item: NavItem;
    active: boolean;
    count?: number | null;
}) {
    const { t } = useTranslation();
    const { setOpenMobile } = useSidebar();
    const title = t(item.titleKey);
    const showCount = typeof count === 'number' && count > 0;
    const countLabel = showCount
        ? t('{{count}} waiting', { count: count as number })
        : undefined;
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={showCount ? `${title} · ${count}` : title}
            >
                <Link
                    href={item.href}
                    prefetch
                    onClick={() => setOpenMobile(false)}
                    aria-current={active ? 'page' : undefined}
                    data-nav-key={item.key}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            'flex size-[30px] shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4',
                            active
                                ? 'bg-white/20 text-white'
                                : cn('bg-white/6', navText[item.domain]),
                        )}
                    >
                        <item.icon />
                    </span>
                    <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:sr-only">
                        {title}
                    </span>
                    {showCount && (
                        <span
                            className={cn(
                                'rounded-full px-2 py-px text-[11px] font-extrabold tabular-nums group-data-[collapsible=icon]:sr-only',
                                item.badgeKey && badgeClasses[item.badgeKey],
                            )}
                        >
                            <span aria-hidden="true">{count}</span>
                            <span className="sr-only">{countLabel}</span>
                        </span>
                    )}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

/** Grouped sidebar navigation; the item owning the current URL is highlighted. */
export function NavMain({
    groups,
    counts = {},
}: {
    groups: NavGroup[];
    counts?: NavCounts | null;
}) {
    const { url } = usePage();
    const { t } = useTranslation();
    const activeKey = findActiveKey(groups, url);
    return (
        <nav
            aria-label={t('Main navigation')}
            className="flex flex-col gap-[18px]"
        >
            {groups.map((group) => (
                <SidebarGroup key={group.key} className="gap-1 p-0">
                    {group.titleKey && (
                        <SidebarGroupLabel>
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'size-1.5 rounded-full',
                                    navDot[group.domain],
                                )}
                            />
                            {t(group.titleKey)}
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu className="gap-1">
                        {group.items.map((item) => (
                            <NavLink
                                key={item.key}
                                item={item}
                                active={item.key === activeKey}
                                count={
                                    item.badgeKey
                                        ? counts?.[item.badgeKey]
                                        : undefined
                                }
                            />
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </nav>
    );
}
