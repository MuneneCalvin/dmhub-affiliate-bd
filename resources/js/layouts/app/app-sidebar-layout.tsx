import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashMessages } from '@/components/flash-messages';
import { LanguageProvider } from '@/context/language-context';
import { PermissionProvider } from '@/context/permission-context';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function AppSidebarLayout({
    children,
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { t } = useTranslation();
    return (
        <LanguageProvider>
            <PermissionProvider>
                <AppShell variant="sidebar">
                    <a
                        href="#main-content"
                        className="sr-only z-50 rounded-control bg-surface p-3 font-bold text-brand-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
                    >
                        {t('Skip to content')}
                    </a>
                    <AppSidebar />
                    <AppContent
                        variant="sidebar"
                        className="workspace-main min-w-0 overflow-x-hidden bg-canvas"
                    >
                        <AppSidebarHeader />
                        <FlashMessages />
                        <div
                            id="main-content"
                            tabIndex={-1}
                            className="flex min-w-0 flex-1 flex-col outline-none"
                        >
                            {children}
                        </div>
                    </AppContent>
                </AppShell>
            </PermissionProvider>
        </LanguageProvider>
    );
}
