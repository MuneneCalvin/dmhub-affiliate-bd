import { SidebarTrigger } from '@/components/ui/sidebar';
import {
    EmployeeAvatar,
    NavBarLanguageChanger,
    NavBarNotification,
} from '@/dev/core';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

export function AppSidebarHeader() {
    const { name } = usePage<SharedData>().props;

    return (
        <header className="flex h-20 shrink-0 items-center justify-between rounded-3xl border shadow-sm sticky top-4 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 px-6 mx-4 mb-4 transition-[width,height,padding] group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <h5 className="font-semibold text-base">{name}</h5>
            </div>
            <div className="ml-auto flex items-center gap-5">
                <NavBarLanguageChanger />
                <NavBarNotification />
                <EmployeeAvatar
                    className="size-9"
                    alt="User profile"
                />
            </div>
        </header>
    );
}
