import type { PromotionConfig, PromotionStore } from '@/types/campaign-offers';

export const promotionSections = {
    savings: {
        title: 'Customer savings',
        description:
            'Name the discount customers will see and choose how much they save.',
        fields: ['name', 'type', 'value', 'currency', 'commission_basis'],
    },
    catalogue: {
        title: 'Catalogue rules',
        description:
            'Choose which items qualify and whether the order must meet a minimum.',
        fields: [
            'scope',
            'product_ids',
            'category_ids',
            'excluded_product_ids',
            'minimum_subtotal',
            'minimum_quantity',
            'exclude_sale_items',
            'combines_with_other_discounts',
        ],
    },
    timing: {
        title: 'Schedule & limits',
        description:
            'Set the promotion dates in your local time and how long each referral discount lasts.',
        fields: ['starts_at', 'ends_at', 'validity_hours', 'usage_limit'],
    },
    message: {
        title: 'Storefront message',
        description:
            'Choose how the offer appears in the store and what customers see after the discount is applied.',
        fields: [
            'display',
            'message',
            'applied_message',
            'message_nl',
            'applied_message_nl',
            'background_color',
            'text_color',
        ],
    },
    stores: {
        title: 'Store selection',
        description:
            'Select the stores that will honour this offer. A connected store is required to publish.',
        fields: ['store_ids'],
    },
} as const;
export type SectionId = keyof typeof promotionSections;
export const sectionIds = Object.keys(promotionSections) as SectionId[];
export type Issues = Record<string, string>;

export const cleanIds = (ids: string[]) =>
    ids.map((id) => id.trim()).filter(Boolean);
const money = (value: string) => /^\d{1,9}(?:\.\d{1,2})?$/.test(value);
const integer = (value: unknown, min: number, max: number) =>
    /^\d+$/.test(String(value)) && Number(value) >= min && Number(value) <= max;

export function promotionIssues(
    c: PromotionConfig,
    ids: number[],
    stores: PromotionStore[],
    publish: boolean,
): Issues {
    const issues: Issues = {};
    if (!c.name.trim()) issues.name = 'Enter a customer-facing offer name.';
    else if (c.name.length > 120) issues.name = 'Use 120 characters or fewer.';
    if (!money(c.value) || Number(c.value) <= 0)
        issues.value =
            'Enter a positive discount with up to two decimal places.';
    else if (c.type === 'percentage' && Number(c.value) > 100)
        issues.value = 'Percentage must not exceed 100.';
    for (const key of [
        'product_ids',
        'category_ids',
        'excluded_product_ids',
    ] as const) {
        const values = cleanIds(c[key]);
        if (
            values.length > 100 ||
            values.some((id) => !/^\d+$/.test(id)) ||
            new Set(values).size !== values.length
        )
            issues[key] =
                'Enter up to 100 unique numeric IDs, separated by commas.';
        else if (
            ((key === 'product_ids' && c.scope === 'products') ||
                (key === 'category_ids' && c.scope === 'categories')) &&
            !values.length
        )
            issues[key] = 'Select at least one item for this scope.';
    }
    if (!money(c.minimum_subtotal))
        issues.minimum_subtotal =
            'Enter a subtotal of zero or more with up to two decimal places.';
    if (!integer(c.minimum_quantity, 0, 100000))
        issues.minimum_quantity = 'Enter a whole quantity from 0 to 100,000.';
    if (!c.starts_at || Number.isNaN(Date.parse(c.starts_at)))
        issues.starts_at = 'Choose a start date and time.';
    if (
        c.ends_at &&
        (!Number.isFinite(Date.parse(c.ends_at)) ||
            Date.parse(c.ends_at) <= Date.parse(c.starts_at))
    )
        issues.ends_at = 'Choose an end date after the start.';
    if (!integer(c.validity_hours, 1, 8760))
        issues.validity_hours =
            'Enter a referral validity of 1 to 8,760 hours.';
    if (
        c.usage_limit != null &&
        c.usage_limit !== '' &&
        !integer(c.usage_limit, 1, 1000000)
    )
        issues.usage_limit = 'Enter 1 to 1,000,000 uses or leave this blank.';
    for (const key of [
        'message',
        'applied_message',
        'message_nl',
        'applied_message_nl',
    ] as const) {
        const text = c[key] ?? '';
        if (!text.trim() && (key === 'message' || key === 'applied_message'))
            issues[key] = 'Enter the customer message.';
        else if (text.length > 300)
            issues[key] = 'Use 300 characters or fewer.';
        else if (
            /<[^>]+>|\{(?!benefit\}|offer_name\}|saving\})[^}]*\}/.test(text)
        )
            issues[key] =
                'Use plain text and {benefit}, {offer_name}, or {saving} placeholders.';
    }
    const selected = stores.filter((s) => ids.includes(s.id));
    if (selected.length !== ids.length)
        issues.store_ids = 'Choose stores available to this campaign.';
    else if (ids.length > 20) issues.store_ids = 'Select up to 20 stores.';
    else if (
        ids.length > 1 &&
        (c.scope !== 'all' || cleanIds(c.excluded_product_ids).length)
    )
        issues.store_ids =
            'Select one store when using product or category IDs.';
    else if (publish && !ids.length)
        issues.store_ids = 'Select a connected store to publish.';
    else if (publish && selected.some((s) => s.status !== 'connected'))
        issues.store_ids = 'Complete the connection for each selected store.';
    else if (publish && selected.some((s) => s.currency !== c.currency))
        issues.store_ids = 'Store and campaign currencies must match.';
    if (publish && selected.some((s) => s.platform === 'shopify')) {
        if (cleanIds(c.excluded_product_ids).length)
            issues.excluded_product_ids =
                'Remove product exclusions for Shopify.';
        if (c.exclude_sale_items)
            issues.exclude_sale_items = 'Include sale items for Shopify.';
        if (Number(c.minimum_quantity) > 0 && Number(c.minimum_subtotal) > 0)
            issues.minimum_quantity =
                'For Shopify, set a minimum subtotal or quantity. Leave the other at zero.';
    }
    return issues;
}

export function promotionErrorKey(key: string) {
    const field = key.replace(/^configuration\./, '').split('.')[0];
    return field === 'stores' ? 'store_ids' : field;
}

export function localDateInput(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime())
        ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
        : '';
}
