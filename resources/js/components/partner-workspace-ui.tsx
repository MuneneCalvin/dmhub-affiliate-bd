import { DetailList, EmptyState, SectionCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import type { Tone } from '@/lib/tones';
import type { WorkspacePage } from '@/types/partner-workspace';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Inbox, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Workspace card: SectionCard with an optional pencil "Edit {{section}}" button. */
export function Panel({
    title,
    children,
    onEdit,
    icon,
    tone = 'brand',
    description,
    action,
    flush,
}: {
    title: string;
    children: ReactNode;
    onEdit?: () => void;
    icon?: ReactNode;
    tone?: Tone;
    description?: ReactNode;
    action?: ReactNode;
    flush?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <SectionCard
            title={title}
            icon={icon}
            tone={tone}
            description={description}
            flush={flush}
            action={
                action ??
                (onEdit && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        aria-label={t('Edit {{section}}', { section: title })}
                        title={t('Edit {{section}}', { section: title })}
                        onClick={onEdit}
                    >
                        <Pencil aria-hidden="true" />
                    </Button>
                ))
            }
        >
            {children}
        </SectionCard>
    );
}

export function Details({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <DetailList rows={rows.map(([label, value]) => ({ label, value }))} />
    );
}

/** "Showing x–y of n" + previous/next for the workspace's simple paginators. */
export function Paging({ page }: { page: WorkspacePage<unknown> }) {
    const { t } = useTranslation();
    if (!page.prev_page_url && !page.next_page_url && !page.total) return null;
    const go = (url: string | null) =>
        url && router.visit(url, { preserveScroll: true });
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-[18px] py-3.5 text-[13px]">
            <span role="status" className="text-ink-muted">
                {t('Showing {{from}}–{{to}} of {{total}}', {
                    from: page.from ?? 0,
                    to: page.to ?? 0,
                    total: page.total,
                })}
            </span>
            {(page.prev_page_url || page.next_page_url) && (
                <nav aria-label={t('Pagination')} className="flex gap-1.5">
                    <Button
                        variant="secondary"
                        size="icon-sm"
                        aria-label={t('Previous page')}
                        disabled={!page.prev_page_url}
                        onClick={() => go(page.prev_page_url)}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon-sm"
                        aria-label={t('Next page')}
                        disabled={!page.next_page_url}
                        onClick={() => go(page.next_page_url)}
                    >
                        <ChevronRight />
                    </Button>
                </nav>
            )}
        </div>
    );
}

export function Empty({
    message,
    icon = <Inbox />,
    tone = 'brand',
}: {
    message: string;
    icon?: ReactNode;
    tone?: Tone;
}) {
    const { t } = useTranslation();
    return <EmptyState icon={icon} tone={tone} title={t(message)} />;
}
