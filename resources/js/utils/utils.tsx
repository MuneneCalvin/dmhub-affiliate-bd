export const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US').format(num);
};

// export const formatCurrency = (amount: string | number, currency: string = 'EUR') => {
// 	const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
// 	return new Intl.NumberFormat('en-US', {
// 		style: 'currency',
// 		currency: currency,
// 	}).format(numAmount);
// };

export const formatCurrency = (
    amount: number | string,
    currency: string = 'EUR',
    locale: string = 'en-US',
): string => {
    const value =
        typeof amount === 'string' ? Number(amount.replace(/,/g, '')) : amount;

    if (!Number.isFinite(value)) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
        }).format(0);
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};
