import { ActivityTimeline, EmptyState, SectionCard } from '@/components/app';
import { relativeTime } from '@/lib/relative-time';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Activity, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ServerNotification = {
    id: string;
    data?: { message?: string; title?: string } | null;
    read_at: string | null;
    created_at: string;
};

/**
 * The signed-in user's latest notifications: the app's only event stream.
 * Nothing is shown that the server did not send.
 */
export function RecentActivity({ limit = 5 }: { limit?: number }) {
    const { t, i18n } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const items = ((auth.user?.notifications as ServerNotification[]) ?? [])
        .map((notification) => ({
            id: notification.id,
            message: notification.data?.message || notification.data?.title,
            createdAt: notification.created_at,
            unread: notification.read_at === null,
        }))
        .filter((item) => item.message)
        .slice(0, limit);

    return (
        <SectionCard
            title={t('Recent activity')}
            description={t('Your latest notifications')}
            icon={<Activity />}
            tone="analytics"
        >
            {items.length ? (
                <ActivityTimeline
                    items={items.map((item) => ({
                        id: item.id,
                        message: item.message,
                        meta: `${item.unread ? `${t('Unread')} · ` : ''}${relativeTime(item.createdAt, i18n.language)}`,
                        icon: <Bell />,
                        tone: item.unread ? 'brand' : 'neutral',
                    }))}
                />
            ) : (
                <EmptyState
                    icon={<Bell />}
                    tone="analytics"
                    title={t('No recent activity')}
                    description={t(
                        'Applications, approvals and invoices will show up here as they happen.',
                    )}
                />
            )}
        </SectionCard>
    );
}
