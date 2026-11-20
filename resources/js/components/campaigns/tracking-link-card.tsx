import { Link2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { CopyField } from '@/components/app/copy-field';
import { IconTile } from '@/components/app/icon-tile';
import { cn } from '@/lib/utils';

export type TrackingSignal = {
    label: string;
    /** `ok` = teal (verified), `wait` = orange (not seen yet), `muted` = grey. */
    state: 'ok' | 'wait' | 'muted';
};

const signalClasses: Record<TrackingSignal['state'], string> = {
    ok: 'bg-partners-nav/16 text-partners-nav',
    wait: 'bg-finance-nav/16 text-finance-nav',
    muted: 'bg-white/8 text-sidebar-text',
};
const dotClasses: Record<TrackingSignal['state'], string> = {
    ok: 'bg-partners-nav',
    wait: 'bg-finance-nav',
    muted: 'bg-sidebar-label',
};

/** Navy card with a copyable tracking link (or a note) and status chips. */
function TrackingLinkCard({
    title,
    link,
    emptyMessage,
    signals = [],
    footer,
    className,
}: {
    title: string;
    link?: string | null;
    emptyMessage: string;
    signals?: TrackingSignal[];
    footer?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();
    const titleId = React.useId();
    return (
        <section
            aria-labelledby={titleId}
            data-slot="tracking-link-card"
            className={cn(
                'flex flex-col gap-3.5 rounded-card bg-sidebar p-5 text-white shadow-card dark:border dark:border-border',
                className,
            )}
        >
            <div className="flex items-center gap-2.5">
                <IconTile size={32} tone="analytics" variant="solid">
                    <Link2 />
                </IconTile>
                <h2 id={titleId} className="text-base font-bold">
                    {title}
                </h2>
            </div>
            {link ? (
                <CopyField
                    value={link}
                    variant="dark"
                    copiedMessage={t('Tracking link copied')}
                    aria-label={title}
                />
            ) : (
                <p className="text-sm text-sidebar-text">{emptyMessage}</p>
            )}
            {signals.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {signals.map((signal) => (
                        <li
                            key={signal.label}
                            className={cn(
                                'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold',
                                signalClasses[signal.state],
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'size-1.5 rounded-full',
                                    dotClasses[signal.state],
                                )}
                            />
                            {signal.label}
                        </li>
                    ))}
                </ul>
            )}
            {footer}
        </section>
    );
}

export { TrackingLinkCard };
