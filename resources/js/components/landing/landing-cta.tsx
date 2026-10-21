import type { LandingCTAProps } from '@/types/landing';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function LandingCTA({
    title,
    description,
    buttonLabel,
    buttonHref,
    buttonIcon,
    className,
}: LandingCTAProps) {
    return (
        <section className={cn('py-20 lg:py-32', className)}>
            <div className="mx-auto max-w-7xl px-6">
                <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#FF6B35] to-[#F7931E] p-12 text-center lg:p-20">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-40 border-white" />
                        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full border-60 border-white" />
                    </div>

                    <div className="relative">
                        <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                            {title}
                        </h2>
                        <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
                            {description}
                        </p>
                        <Link
                            href={buttonHref}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2 text-base font-semibold text-[#FF6B35] shadow-xl transition hover:bg-gray-50">
                            {buttonLabel}
                            {buttonIcon}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}