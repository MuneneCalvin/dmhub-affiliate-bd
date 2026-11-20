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
                    <AppContent
                        variant="sidebar"
                        className="workspace-main overflow-x-hidden"
                    >
                        <a
                            href="#main-content"
                            className="sr-only z-50 bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
                        >
                            Skip to content
                        </a>
                        <AppSidebarHeader />
                        <FlashMessages />
                        <div id="main-content" className="contents">
                            {children}
                        </div>
                    </AppContent>
                </AppShell>
            </PermissionProvider>
        </LanguageProvider>
    );
}
