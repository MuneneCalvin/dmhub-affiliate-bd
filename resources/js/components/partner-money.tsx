import { DEFAULT_CURRENCY } from '@/lib/format';
import { formatCurrency } from '@/utils/utils';

export function partnerMoney(
    rows:
        | { currency: string; revenue: number; commission: number }[]
        | undefined,
    field: 'revenue' | 'commission',
) {
    return rows?.length
        ? rows
              .map((row) => formatCurrency(Number(row[field]), row.currency))
              .join(' · ')
        : '—';
}

export function formatCommission(
    value: string | number | null | undefined,
    type: string | number | null | undefined,
    currency = DEFAULT_CURRENCY,
) {
    if (value == null) return '—';
    return ['CPS', 'RevShare'].includes(String(type))
        ? `${Number(value)}%`
        : formatCurrency(Number(value), currency);
}
