import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { FlashMessages } from '@/components/flash-messages';
import { LanguageProvider } from '@/context/language-context';
import { PermissionProvider } from '@/context/permission-context';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function AppHeaderLayout({
    children,
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { auth, networkBranding } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const workspace = auth.user.is_advertiser
        ? 'Advertiser workspace'
        : 'Publisher workspace';
    return (
        <LanguageProvider>
            <PermissionProvider>
                <AppShell>
                    <a
                        href="#main-content"
                        className="sr-only z-50 bg-card p-3 text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
                    >
                        {t('Skip to content')}
                    </a>
                    <AppHeader />
                    <AppContent
                        id="main-content"
                        tabIndex={-1}
                        className="workspace-main workspace-top-main flex w-full flex-1 flex-col"
                    >
                        <FlashMessages />
                        {children}
                    </AppContent>
                    <footer className="workspace-footer">
                        <span>
                            {networkBranding?.network_name || 'DMHub'} ·{' '}
                            {t(workspace)}
                        </span>
                        <a
                            href="/docs"
                            className="inline-flex items-center gap-2 hover:text-foreground"
                        >
                            {t('Help & documentation')}{' '}
                            <ArrowUpRight className="size-4" />
                        </a>
                    </footer>
                </AppShell>
            </PermissionProvider>
        </LanguageProvider>
    );
}
