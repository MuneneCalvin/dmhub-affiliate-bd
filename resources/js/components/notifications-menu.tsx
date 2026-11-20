import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { relativeTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';
import {
    markAllAsRead as markAllAsReadRoute,
    markAsRead as markAsReadRoute,
} from '@/routes/notifications';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Bell, BellOff, Check } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type ServerNotification = {
    id: string;
    data?: { message?: string; title?: string } | null;
    read_at: string | null;
    created_at: string;
};

/** Bell button with unread count and a panel of the latest 20 notifications. */
export function NotificationsMenu() {
    const { auth } = usePage<SharedData>().props;
    const { t, i18n } = useTranslation();
    const headingId = useId();
    const [open, setOpen] = useState(false);
    // Optimistic reads; the next page load brings the server state.
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const notifications = useMemo(
        () =>
            ((auth.user?.notifications as ServerNotification[]) ?? []).map(
                (n) => ({
                    id: n.id,
                    message: n.data?.message || n.data?.title || '',
                    unread: n.read_at === null && !readIds.has(n.id),
                    createdAt: n.created_at,
                }),
            ),
        [auth.user?.notifications, readIds],
    );
    const unread = notifications.filter((n) => n.unread).length;

    const markRead = (id: string) =>
        router.post(
            markAsReadRoute.url({ id }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setReadIds((prev) => new Set(prev).add(id)),
            },
        );
    const markAllRead = () =>
        router.post(
            markAllAsReadRoute.url(),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () =>
                    setReadIds(new Set(notifications.map((n) => n.id))),
            },
        );

    const label =
        unread > 0
            ? t('Notifications, {{count}} unread', { count: unread })
            : t('Notifications');

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary"
                    size="icon"
                    className="relative text-finance"
                    aria-label={label}
                >
                    <Bell aria-hidden="true" />
                    {unread > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-[5px] -right-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-admin px-1 text-[11px] font-extrabold text-white"
                        >
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                sideOffset={8}
                role="region"
                aria-labelledby={headingId}
                className="w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[20px] p-0"
            >
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <h2 id={headingId} className="text-[15px] font-extrabold">
                        {t('Notifications')}
                    </h2>
                    {unread > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-brand-ink"
                            onClick={markAllRead}
                        >
                            {t('Mark all as read')}
                        </Button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-muted">
                        <BellOff aria-hidden="true" className="size-6" />
                        <p>{t('No notifications')}</p>
                    </div>
                ) : (
                    <ul className="max-h-96 overflow-y-auto">
                        {notifications.map((n) => (
                            <li
                                key={n.id}
                                className={cn(
                                    'flex items-start gap-3 border-t px-4 py-3 first:border-t-0',
                                    n.unread && 'bg-brand-soft/40',
                                )}
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex size-[34px] shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand [&_svg]:size-4"
                                >
                                    <Bell />
                                </span>
                                <div className="min-w-0 flex-1 text-[13px]">
                                    <p className="break-words">
                                        {n.unread && (
                                            <span className="sr-only">
                                                {t('Unread')}:{' '}
                                            </span>
                                        )}
                                        {n.message}
                                    </p>
                                    <time
                                        dateTime={n.createdAt}
                                        className="text-ink-muted"
                                    >
                                        {relativeTime(
                                            n.createdAt,
                                            i18n.language || 'en',
                                        )}
                                    </time>
                                </div>
                                {n.unread && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label={t('Mark as read')}
                                        onClick={() => markRead(n.id)}
                                    >
                                        <Check aria-hidden="true" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </PopoverContent>
        </Popover>
    );
}
