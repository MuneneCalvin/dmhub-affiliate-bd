import type { LandingFooterProps } from '@/types/landing';
// import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLogo from '../app-logo';

export default function LandingFooter({
    // logo,
    // brandName,
    links = [],
    copyright,
    className,
}: LandingFooterProps) {
    // const defaultBrandName = (
    //     <span className="font-semibold text-gray-900 dark:text-white">
    //         Affiliate<span>-</span><span className="text-[#FF6B35]">Marketing</span>
    //     </span>
    // );

    // const defaultLogo = (
    //     <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7931E]">
    //         <TrendingUp className="h-4 w-4 text-white" />
    //     </div>
    // );

    const currentYear = new Date().getFullYear();
    const defaultCopyright = `© ${currentYear} Affiliate-Marketing. Powered by BrandNewDay.`;

    return (
        <footer
            className={cn(
                'border-t border-gray-100 bg-gray-50/50 py-12 dark:border-gray-800 dark:bg-gray-900/50',
                className,
            )}
        >
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                    <div className="flex items-center gap-2">
                        <AppLogo />
                    </div>
                    {links.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                            {links.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    className="transition hover:text-[#FF6B35]"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        {copyright ?? defaultCopyright}
                    </p>
                </div>
            </div>
        </footer>
    );
}
