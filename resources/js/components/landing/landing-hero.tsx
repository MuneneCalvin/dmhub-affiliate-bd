import type { LandingHeroProps } from '@/types/landing';
import { Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingHero({
    badge,
    title,
    highlightedText,
    description,
    buttons = [],
    checkmarks = [],
    preview,
    className,
}: LandingHeroProps) {
    return (
        <section className={cn('relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32', className)}>
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="text-center lg:text-left">
                        {badge && (
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/5 px-4 py-2 text-sm font-medium text-[#FF6B35]">
                                {badge.icon}
                                {badge.text}
                            </div>
                        )}
                        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
                            {title}
                            {highlightedText && (
                                <>
                                    {' '}
                                    <span className="bg-linear-to-r from-[#FF6B35] to-[#F7931E] bg-clip-text text-transparent">
                                        {highlightedText}
                                    </span>
                                </>
                            )}
                        </h1>
                        <p className="mb-8 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                            {description}
                        </p>
                        {buttons.length > 0 && (
                            <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                                {buttons.map((button, index) => (
                                    button.variant === 'primary' ? (
                                        <Link
                                            key={index}
                                            href={button.href}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#FF6B35] to-[#F7931E] px-6 py-2 text-base font-semibold text-white shadow-xl shadow-orange-500/25 transition hover:shadow-orange-500/40">
                                            {button.label}
                                            {button.icon}
                                        </Link>
                                    ) : (
                                        <a
                                            key={index}
                                            href={button.href}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-6 py-2 text-base font-semibold text-gray-700 transition hover:border-[#FF6B35] hover:text-[#FF6B35] dark:border-gray-700 dark:text-gray-300">
                                            {button.label}
                                            {button.icon}
                                        </a>
                                    )
                                ))}
                            </div>
                        )}
                        {checkmarks.length > 0 && (
                            <div className="mt-10 flex flex-wrap justify-center gap-6 lg:justify-start">
                                {checkmarks.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        {item.text}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {preview && (
                        <div className="relative">
                            {preview}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}