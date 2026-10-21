import type { LandingStatsProps } from '@/types/landing';
import { cn } from '@/lib/utils';

export default function LandingStats({
    stats,
    id = 'stats',
    className,
}: LandingStatsProps) {
    if (stats.length === 0) return null;

    return (
        <section
            id={id}
            className={cn(
                'border-y border-gray-100 bg-gray-50/50 py-16 dark:border-gray-800 dark:bg-gray-900/50',
                className
            )}>
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {stats.map((stat, index) => (
                        <div key={index} className="text-center">
                            <p className="mb-2 text-3xl font-bold text-[#FF6B35] md:text-4xl">
                                {stat.value}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}