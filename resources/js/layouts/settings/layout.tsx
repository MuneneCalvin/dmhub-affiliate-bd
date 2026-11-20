import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ReusablePageTitle } from '@/dev/core';
import { cn, isSameUrl, resolveUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import { type NavItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation();

    const sidebarNavItems: NavItem[] = [
        {
            title: t('Profile'),
            href: edit(),
            icon: null,
            children: [],
        },
        {
            title: t('Password'),
            href: editPassword(),
            icon: null,
            children: [],
        },
        {
            title: t('Two-Factor Auth'),
            href: show(),
            icon: null,
            children: [],
        },
        {
            title: t('Appearance'),
            href: editAppearance(),
            icon: null,
            children: [],
        },
    ];

    if (typeof window === 'undefined') {
        return null;
    }
    const currentPath = window.location.pathname;
    return (
        <div className="workspace-page flex flex-col">
            <Head title={t('Settings')} />
            <div className="flex h-full flex-1 flex-col gap-6">
                <ReusablePageTitle
                    title={t('Settings')}
                    description={t('Manage your profile and account settings')}
                    breadcrumbs={[]}
                />
                <div className="w-full">
                    <div className="flex flex-col gap-8 rounded-xl border bg-card p-5 md:p-8 lg:flex-row lg:gap-10">
                        <aside className="w-full max-w-xl lg:w-48">
                            <nav className="flex flex-col space-y-1 space-x-0">
                                {sidebarNavItems.map((item, index) => (
                                    <Button
                                        key={`${resolveUrl(item.href)}-${index}`}
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn('w-full justify-start', {
                                            'bg-accent text-accent-foreground':
                                                isSameUrl(
                                                    currentPath,
                                                    item.href,
                                                ),
                                        })}
                                    >
                                        <Link href={item.href}>
                                            {item.icon && (
                                                <item.icon className="h-4 w-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                    </Button>
                                ))}
                            </nav>
                        </aside>

                        <Separator className="my-6 lg:hidden" />

                        <div className="flex-1 md:max-w-2xl">
                            <section className="max-w-xl space-y-12">
                                {children}
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
