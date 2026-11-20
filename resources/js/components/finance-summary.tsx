import { formatCurrency } from '@/utils/utils';
import { useTranslation } from 'react-i18next';

export type FinanceSummary = Record<
    string,
    Record<string, { amount: string; count: number }>
>;

export default function FinanceSummaryTable({
    summary,
}: {
    summary: FinanceSummary;
}) {
    const { t } = useTranslation();
    return (
        <div className="overflow-x-auto rounded-xl border bg-card p-4">
            <table className="w-full text-sm tabular-nums">
                <caption className="mb-3 text-left font-medium">
                    {t('Totals by currency and status')}
                </caption>
                <thead>
                    <tr className="border-b text-left">
                        <th className="py-2">{t('Currency')}</th>
                        <th>{t('Status')}</th>
                        <th className="text-right">{t('Count')}</th>
                        <th className="text-right">{t('Amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(summary).flatMap(([currency, statuses]) =>
                        Object.entries(statuses).map(([status, value]) => (
                            <tr
                                key={`${currency}-${status}`}
                                className="border-b last:border-0"
                            >
                                <td className="py-3">{currency}</td>
                                <td>{t(status)}</td>
                                <td className="text-right">{value.count}</td>
                                <td className="text-right">
                                    {formatCurrency(
                                        Number(value.amount),
                                        currency,
                                    )}
                                </td>
                            </tr>
                        )),
                    )}
                </tbody>
            </table>
            {!Object.keys(summary).length && (
                <p className="py-4 text-muted-foreground">
                    {t('No reviewed financial activity yet.')}
                </p>
            )}
        </div>
    );
}
