import AppLogo from '@/components/app-logo';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="relative flex min-h-svh overflow-hidden bg-linear-to-br from-background via-background to-muted/20">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 h-full w-full rounded-full bg-linear-to-br from-primary/5 via-primary/10 to-transparent blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 h-full w-full rounded-full bg-linear-to-tr from-primary/5 via-primary/10 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10 flex w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="w-full max-w-lg">
                    <div className="rounded-2xl border border-border/50 bg-background/80 p-8 shadow-2xl backdrop-blur-xl md:p-10">
                        <div className="flex flex-col gap-8">
                            <Link href="/" className="flex items-center gap-2">
                                <AppLogo />
                            </Link>
                            <div className="flex flex-col items-center gap-4">
                                <div className="space-y-2 text-center">
                                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                                        {title}
                                    </h1>
                                    {description && (
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}