/**
 * Plain-language explanations of the terms people asked about. Each value is the English text, which is also its
 * translation key in `locales/{en,nl}.json`, so `t(GLOSSARY[term])` gives the reader's language.
 */
export type GlossaryTerm =
    | 'compensation'
    | 'cpl'
    | 'cpa'
    | 'cps'
    | 'revshare'
    | 'flat'
    | 'campaign'
    | 'offer'
    | 'creative'
    | 'lead'
    | 'accountOpened'
    | 'partnerPool';

export const GLOSSARY: Record<GlossaryTerm, string> = {
    compensation:
        'Compensation is what the advertiser pays the publisher for an agreed result, such as a lead or an opened account.',
    cpl: 'CPL (cost per lead): the publisher is paid compensation for each valid lead, such as a completed form.',
    cpa: 'CPA (cost per action): the publisher is paid compensation for each qualified action, such as an opened account.',
    cps: 'CPS (cost per sale): the compensation is a percentage of the value of each sale.',
    revshare:
        'Revenue share: the compensation is a percentage of the revenue a referred customer generates.',
    flat: 'Flat fee: a fixed compensation amount agreed in advance.',
    campaign:
        'A campaign is an ongoing product or conversion category, for example a pension savings account.',
    offer: 'An offer is a temporary promotion or agreement within a campaign, for example a seasonal deal or a special compensation for one publisher.',
    creative:
        'Creatives are the materials publishers use to promote: links, banners, copy, conditions and required disclaimers.',
    lead: 'A lead is a visitor who completed the form and gave consent to be contacted.',
    accountOpened:
        'Account opened: a lead whose account has been opened. Staff set this status on the Leads page.',
    partnerPool:
        'The partner pool lists advertisers and publishers who signed up and are waiting for approval.',
};

/** The short name of each term, used in the button's accessible name. Also translation keys. */
export const GLOSSARY_LABELS: Record<GlossaryTerm, string> = {
    compensation: 'Compensation',
    cpl: 'CPL',
    cpa: 'CPA',
    cps: 'CPS',
    revshare: 'Revenue share',
    flat: 'Flat fee',
    campaign: 'Campaign',
    offer: 'Offer',
    creative: 'Creative',
    lead: 'Lead',
    accountOpened: 'Account opened',
    partnerPool: 'Partner pool',
};

const TYPE_TERMS: Record<string, GlossaryTerm> = {
    CPL: 'cpl',
    CPA: 'cpa',
    CPS: 'cps',
    REVSHARE: 'revshare',
    FLAT: 'flat',
};

/** The glossary term for a compensation model by its stored name (CPL, CPA, CPS, RevShare, Flat). */
export function termForCommissionType(
    name?: string | null,
): GlossaryTerm | null {
    return TYPE_TERMS[(name ?? '').toUpperCase()] ?? null;
}
