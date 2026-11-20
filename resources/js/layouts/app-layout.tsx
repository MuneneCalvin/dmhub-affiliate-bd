import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    /** Kept for older pages; breadcrumbs now render in the page's PageHeader. */
    breadcrumbs?: BreadcrumbItem[];
}

/** Authenticated shell for every role: navy sidebar + top bar + content. */
export default function AppLayout({ children }: AppLayoutProps) {
    return <AppSidebarLayout>{children}</AppSidebarLayout>;
}
