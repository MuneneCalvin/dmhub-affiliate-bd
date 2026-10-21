import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashMessages } from '@/components/flash-messages';
import { LanguageProvider } from '@/context/language-context';
import { PermissionProvider } from '@/context/permission-context';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({
    children,
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <LanguageProvider>
            <PermissionProvider>
                <AppShell variant="sidebar">
                    <AppSidebar />
                    <AppContent variant="sidebar" className="overflow-x-hidden">
                        <AppSidebarHeader/>
                        <FlashMessages />
                        {children}
                    </AppContent>
                </AppShell>
            </PermissionProvider>
        </LanguageProvider>
    );
}
