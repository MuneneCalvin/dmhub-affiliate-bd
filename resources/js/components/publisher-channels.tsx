import { PUBLISHER_CHANNELS } from '@/lib/publisher-channels';
import { useTranslation } from 'react-i18next';

export type PublisherChannelRow = { type: string; handle: string };

/** Where a publisher promotes: each channel with its URL or account name. Only web addresses become links. */
export function PublisherChannels({
    channels,
}: {
    channels?: PublisherChannelRow[] | null;
}) {
    const { t } = useTranslation();
    if (!channels?.length) {
        return <span className="text-ink-muted">{t('No channels given')}</span>;
    }

    return (
        <ul className="grid gap-1">
            {channels.map((channel) => {
                const known = PUBLISHER_CHANNELS.find(
                    (c) => c.value === channel.type,
                );
                const web = /^https?:\/\//i.test(channel.handle);
                return (
                    <li key={channel.type}>
                        <span className="font-semibold">
                            {known ? t(known.label) : channel.type}
                        </span>
                        {': '}
                        {web ? (
                            <a
                                href={channel.handle}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-ink underline"
                            >
                                {channel.handle}
                            </a>
                        ) : (
                            <span>{channel.handle}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
