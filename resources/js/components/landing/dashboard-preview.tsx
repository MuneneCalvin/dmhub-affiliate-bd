import type { DashboardPreviewProps } from '@/types/landing';
import { PiggyBank, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPreview({
    totalEarnings = '€12.847,50',
    growthPercentage = '+23%',
    stats = {
        clicks: '24.5K',
        conversions: '1.284',
        ratio: '5.2%',
    },
    chartData = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100],
    floatingCard = {
        label: 'Nieuwe betaling',
        value: '+€847,50',
    },
    className,
}: DashboardPreviewProps) {
    return (
        <div className={cn('relative', className)}>
            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-linear-to-br from-gray-50 to-white p-2 shadow-2xl dark:border-gray-800 dark:from-gray-900 dark:to-gray-800">
                <div className="rounded-2xl bg-white p-6 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Totale Verdiensten
                            </p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                {totalEarnings}
                            </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="mb-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <TrendingUp className="h-4 w-4" />
                        {growthPercentage} deze maand
                    </div>
                    <div className="flex items-end gap-2">
                        {chartData.map((height, index) => (
                            <div
                                key={index}
                                className="flex-1 rounded-t-sm bg-linear-to-t from-[#FF6B35] to-[#F7931E]"
                                style={{ height: `${height}px` }}
                            />
                        ))}
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Clicks
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {stats.clicks}
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Conversies
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {stats.conversions}
                            </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ratio
                            </p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {stats.ratio}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {floatingCard && (
                <div className="absolute -bottom-4 -left-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                            {floatingCard.icon ?? (
                                <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {floatingCard.label}
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {floatingCard.value}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}