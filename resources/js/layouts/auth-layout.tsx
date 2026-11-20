import { LanguageSwitcher } from '@/components/language-switcher';
import { LanguageProvider } from '@/context/language-context';
import { AuthBrandMark, AuthBrandPanel } from '@/layouts/auth/auth-brand-panel';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

type AuthLayoutProps = {
    children: ReactNode;
    /** Page heading (h1). Omit when the content renders its own h1 (state pages). */
    title?: string;
    description?: string;
    /** Width of the form column: `form` 420px, `wide` 520px (register, state cards). */
    width?: 'form' | 'wide';
};

/**
 * Split auth layout: navy brand panel with role tiles on the left (lg+), the
 * form on the right. Below `lg` only the form column shows, with the logo on top.
 */
export default function AuthLayout({
    children,
    title,
    description,
    width = 'form',
}: AuthLayoutProps) {
    return (
        <LanguageProvider>
            <div className="flex min-h-svh flex-wrap bg-surface text-ink">
                <AuthBrandPanel />
                <main className="flex min-w-0 flex-[1_1_440px] flex-col px-4 py-6 sm:px-12 sm:py-8">
                    <div className="flex items-center justify-between gap-4 lg:justify-end">
                        <div className="lg:hidden">
                            <AuthBrandMark />
                        </div>
                        <LanguageSwitcher />
                    </div>
                    <div
                        className={cn(
                            'mx-auto my-auto flex w-full flex-col gap-[18px] py-10',
                            width === 'wide'
                                ? 'max-w-[520px]'
                                : 'max-w-[420px]',
                        )}
                    >
                        {title && (
                            <div className="flex flex-col gap-1.5">
                                <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.02em] text-ink">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="text-ink-muted">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </LanguageProvider>
    );
}
