import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { url } = usePage();
    const { setOpenMobile } = useSidebar();
    const normalize = (path: string) =>
        path
            .split('?')[0]
            .replace(/\/index\/?$/, '')
            .replace(/\/$/, '');
    const currentUrl = normalize(url);
    const allLinks: NavItem[] = items.flatMap((item) =>
        item.children?.length ? item.children : [item],
    );
    // Prefer the most specific match, so /campaigns and /campaigns/terms do not both highlight.
    const activeHref = allLinks
        .map((item) => resolveUrl(item.href))
        .filter(
            (href) =>
                href &&
                (currentUrl === normalize(href) ||
                    currentUrl.startsWith(`${normalize(href)}/`)),
        )
        .sort((a, b) => b.length - a.length)[0];
    const renderLink = (item: NavItem) => (
        <SidebarMenuItem key={resolveUrl(item.href)}>
            <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={resolveUrl(item.href) === activeHref}
            >
                <Link
                    href={item.href}
                    prefetch
                    onClick={() => setOpenMobile(false)}
                    aria-current={
                        resolveUrl(item.href) === activeHref
                            ? 'page'
                            : undefined
                    }
                >
                    {item.icon && <item.icon className="size-4 shrink-0" />}
                    <span>{item.title}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
    return (
        <nav aria-label="Main navigation" className="space-y-3">
            {items.map((item) => (
                <SidebarGroup key={item.title} className="py-0">
                    {item.children?.length > 0 && (
                        <SidebarGroupLabel className="mb-2">
                            {item.title}
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu>
                        {item.children?.length > 0
                            ? item.children.map(renderLink)
                            : renderLink(item)}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </nav>
    );
}
