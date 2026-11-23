/** Where a publisher can promote. `value` matches `config/publisher.php` on the server. */
export const PUBLISHER_CHANNELS = [
    {
        value: 'website',
        label: 'Website or blog',
        placeholder: 'https://www.example.com',
        urlOnly: true,
    },
    {
        value: 'comparison_site',
        label: 'Comparison website',
        placeholder: 'https://www.example.com',
        urlOnly: true,
    },
    {
        value: 'facebook',
        label: 'Facebook',
        placeholder: 'https://www.facebook.com/your-page',
    },
    { value: 'instagram', label: 'Instagram', placeholder: '@your-account' },
    { value: 'tiktok', label: 'TikTok', placeholder: '@your-account' },
    {
        value: 'youtube',
        label: 'YouTube',
        placeholder: 'https://www.youtube.com/@your-channel',
    },
    {
        value: 'newsletter',
        label: 'Newsletter',
        placeholder: 'Newsletter name or URL',
    },
    {
        value: 'cashback_loyalty',
        label: 'Cashback or loyalty platform',
        placeholder: 'Platform name or URL',
    },
    {
        value: 'paid_media',
        label: 'Paid media',
        placeholder: 'Network, platform or URL',
    },
    { value: 'other', label: 'Other', placeholder: 'URL or account name' },
] as const;

export type ChannelType = (typeof PUBLISHER_CHANNELS)[number]['value'];

const isWebAddress = (value: string) => {
    try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol) && url.hostname.includes('.');
    } catch {
        return false;
    }
};

/**
 * The message key to show for a channel's value, or null when it is fine. A website or comparison site must be
 * a web address; the others take a URL or an account name, but anything that looks like a URL must be valid.
 */
export function channelError(type: ChannelType, handle: string): string | null {
    const value = handle.trim();
    if (value === '') return 'Enter a URL or account name';
    const channel = PUBLISHER_CHANNELS.find((c) => c.value === type);
    const looksLikeUrl =
        value.includes('://') || value.toLowerCase().startsWith('www.');
    if ((channel && 'urlOnly' in channel && channel.urlOnly) || looksLikeUrl) {
        return isWebAddress(value)
            ? null
            : 'Enter a web address starting with https://';
    }
    return null;
}
