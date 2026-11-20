/**
 * Campaign status codes → StatusBadge keywords. `P` is "Paused" for campaigns
 * (the header's Pause button sets it); `I` is inactive.
 */
export const campaignStatusKey = (code: string | null | undefined) =>
    code === 'A' ? 'active' : code === 'P' ? 'paused' : 'inactive';

/** Offer status codes → StatusBadge keywords. */
export const offerStatusKey = (code: string | null | undefined) =>
    code === 'A' ? 'active' : code === 'P' ? 'paused' : 'inactive';

/** Commission rate as shown to people: "8%" for sale-based, money otherwise. */
export function formatRate(
    type: string | null | undefined,
    value: string | number | null | undefined,
    money: (value: number) => string,
) {
    if (value === null || value === undefined || value === '') return null;
    return type === 'CPS' || type === 'RevShare'
        ? `${Number(value)}%`
        : money(Number(value));
}
