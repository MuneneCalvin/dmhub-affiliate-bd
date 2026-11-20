import AppLogo from '@/components/app-logo';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, Check, Network, ShieldCheck } from 'lucide-react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const { t } = useTranslation();
    return (
        <div className="grid min-h-svh bg-card lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
            <aside className="auth-panel relative hidden flex-col justify-between p-12 text-white lg:flex xl:p-16">
                <Link href="/" className="flex w-fit items-center gap-3">
                    <div className="flex h-11 w-14 items-center rounded-lg bg-white px-2">
                        <AppLogo />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">
                        DM Hub
                    </span>
                </Link>
                <div className="my-16 max-w-md">
                    <h2 className="text-4xl leading-[1.18] font-semibold tracking-tight xl:text-5xl">
                        {t('Your partnerships.')}
                        <br />
                        <span className="text-[#a5beff]">
                            {t('Working together.')}
                        </span>
                    </h2>
                    <p className="mt-6 max-w-sm text-base leading-7 text-sidebar-foreground">
                        {t(
                            'Connect campaigns, publishers, and performance in one focused workspace.',
                        )}
                    </p>
                    <div className="mt-10 divide-y divide-sidebar-border border-y border-sidebar-border">
                        {[
                            t('Discover and manage campaigns'),
                            t('Follow submissions and conversions'),
                            t('Keep earnings and invoices in view'),
                        ].map((text) => (
                            <div
                                key={text}
                                className="flex items-center gap-3 py-4 text-sm text-sidebar-foreground"
                            >
                                <Check className="size-4 shrink-0 text-[#a5beff]" />
                                {text}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-sidebar-foreground">
                    <span>{t('Affiliate partnerships, connected.')}</span>
                    <Network className="size-5" />
                </div>
            </aside>
            <main className="flex min-w-0 flex-col px-6 py-8 sm:px-12">
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground lg:justify-end">
                    <Link href="/" className="flex h-9 w-14 lg:hidden">
                        <AppLogo />
                    </Link>
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5" />
                        {t('Secure account access')}
                    </span>
                </div>
                <div className="mx-auto my-auto w-full max-w-[440px] py-12">
                    <div className="mb-8 space-y-3">
                        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-foreground">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm leading-6 text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {children}
                </div>
                <Link
                    href="/"
                    className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
                >
                    DM Hub <ArrowUpRight className="size-3" />
                </Link>
            </main>
        </div>
    );
}
