import AppHeaderLayout from '@/layouts/app/app-header-layout';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AppLayout({ children, breadcrumbs }: AppLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    // Operational roles retain their sidebar, including multi-role accounts.
    const useTopNavigation =
        !auth.user.is_super_admin &&
        !auth.user.is_network &&
        (auth.user.is_publisher || auth.user.is_advertiser);
    const Layout = useTopNavigation ? AppHeaderLayout : AppSidebarLayout;

    return <Layout breadcrumbs={breadcrumbs}>{children}</Layout>;
}
