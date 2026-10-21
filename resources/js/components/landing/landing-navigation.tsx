import AppLogo from '@/components/app-logo';
import type { LandingNavigationProps, NavButton } from '@/types/landing';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

interface NavigationButtonProps {
    button: NavButton;
}

function NavigationButton({ button }: NavigationButtonProps) {
    const baseClasses = 'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition';

    const variantClasses = {
        primary: 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40',
        secondary: 'border-2 border-gray-200 text-gray-700 hover:border-[#FF6B35] hover:text-[#FF6B35] dark:border-gray-700 dark:text-gray-300',
        ghost: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
    };

    return (
        <Link
            href={button.href}
            className={cn(baseClasses, variantClasses[button.variant])}>
            {button.label}
            {button.icon}
        </Link>
    );
}

export default function LandingNavigation({
    links = [],
    buttons = [],
    logo,
    className,
}: LandingNavigationProps) {
    return (
        <header className={cn(
            'fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-[#0f1419]/90',
            className
        )}>
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="flex items-center gap-2">
                    {logo ?? <AppLogo />}
                </Link>
                {links.length > 0 && (
                    <div className="hidden items-center gap-8 md:flex">
                        {links.map((link, index) => (
                            link.isExternal ? (
                                <a
                                    key={index}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-gray-600 transition hover:text-[#FF6B35] dark:text-gray-300">
                                    {link.label}
                                </a>
                            ) : (
                                <a
                                    key={index}
                                    href={link.href}
                                    className="text-sm font-medium text-gray-600 transition hover:text-[#FF6B35] dark:text-gray-300">
                                    {link.label}
                                </a>
                            )
                        ))}
                    </div>
                )}
                {buttons.length > 0 && (
                    <div className="flex items-center gap-3">
                        {buttons.map((button, index) => (
                            <NavigationButton key={index} button={button} />
                        ))}
                    </div>
                )}
            </nav>
        </header>
    );
}
export { NavigationButton };