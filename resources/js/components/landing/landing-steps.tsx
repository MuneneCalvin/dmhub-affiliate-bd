import type { LandingStepsProps } from '@/types/landing';
import { cn } from '@/lib/utils';

export default function LandingSteps({
    title,
    subtitle,
    steps,
    id = 'how-it-works',
    className,
}: LandingStepsProps) {
    if (steps.length === 0) return null;

    return (
        <section
            id={id}
            className={cn('bg-gray-50/50 py-20 lg:py-32 dark:bg-gray-900/50', className)}>
            <div className="mx-auto max-w-7xl px-6">
                {(title || subtitle) && (
                    <div className="mb-16 text-center">
                        {title && (
                            <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl dark:text-white">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}
                <div className="grid gap-8 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            {index < steps.length - 1 && (
                                <div className="absolute top-8 left-1/2 hidden h-0.5 w-full bg-linear-to-r from-[#FF6B35] to-transparent md:block" />
                            )}
                            <div className="relative rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-[#FF6B35] to-[#F7931E] text-2xl font-bold text-white">
                                    {step.number}
                                </div>
                                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                                    {step.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}