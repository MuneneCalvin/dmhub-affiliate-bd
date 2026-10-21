
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ReusablePageTitle } from '@/dev/core';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    return (
        <AppLayout>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <ReusablePageTitle
                    title="Dashboard"
                    breadcrumbs={breadcrumbs}
                />
                <div className="flex flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border"
                            >
                                <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                            </div>
                        ))}
                    </div>
                    <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
