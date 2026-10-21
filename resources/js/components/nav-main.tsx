/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const currentUrl = page.url;

    const isActive = (url: NonNullable<NavItem['href']>) =>
        currentUrl === resolveUrl(url) ||
        currentUrl.startsWith(resolveUrl(url) + '/');

    const hasActiveChild = (children: NavItem['children']) =>
        Array.isArray(children) &&
        children.some(
            (sub) => sub?.href && currentUrl === resolveUrl(sub.href)
        );

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => {
                    const hasChildren =
                        Array.isArray(item.children) && item.children.length > 0;
                    const itemIsActive =
                        !hasChildren && !!item.href && isActive(item.href);
                    const childIsActive = hasActiveChild(item.children);
                    const collapsibleOpen = itemIsActive || !!childIsActive;

                    if (!hasChildren) {
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    asChild
                                    isActive={itemIsActive}>
                                    <Link href={item.href} prefetch>
                                        {item.icon && (
                                            <item.icon className="size-5 shrink-0" />
                                        )}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={collapsibleOpen}
                            className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        isActive={itemIsActive || !!childIsActive}>
                                        {item.icon && (
                                            <item.icon className="size-5 shrink-0" />
                                        )}
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.children?.map((child: any) => (
                                            <SidebarMenuSubItem
                                                key={child.title}>
                                                <SidebarMenuSubButton
                                                    asChild
                                                    isActive={
                                                        !!child.href &&
                                                        currentUrl ===
                                                            resolveUrl(
                                                                child.href
                                                            )
                                                    }>
                                                    <Link
                                                        href={child.href}
                                                        prefetch>
                                                        <span>{child.title}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
