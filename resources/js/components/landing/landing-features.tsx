import type { LandingFeaturesProps } from '@/types/landing';
import { cn } from '@/lib/utils';

export default function LandingFeatures({
    title,
    subtitle,
    features,
    id = 'features',
    className,
    columns = 3,
}: LandingFeaturesProps) {
    if (features.length === 0) return null;

    const columnClasses = {
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-2 lg:grid-cols-3',
        4: 'md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <section id={id} className={cn('py-20 lg:py-32', className)}>
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
                <div className={cn('grid gap-8', columnClasses[columns])}>
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group rounded-2xl border border-gray-100 bg-white p-8 transition hover:border-[#FF6B35]/30 hover:shadow-xl hover:shadow-orange-500/5 dark:border-gray-800 dark:bg-gray-900">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-[#FF6B35]/10 to-[#F7931E]/10 text-[#FF6B35] transition group-hover:from-[#FF6B35] group-hover:to-[#F7931E] group-hover:text-white">
                                {feature.icon}
                            </div>
                            <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}