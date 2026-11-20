import { Button } from '@/components/ui/button';
import type { WorkspacePage } from '@/types/partner-workspace';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function Panel({
    title,
    children,
    onEdit,
}: {
    title: string;
    children: ReactNode;
    onEdit?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <section className="campaign-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                {onEdit && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={t('Edit {{section}}', { section: title })}
                        title={t('Edit {{section}}', { section: title })}
                        onClick={onEdit}
                    >
                        <Pencil size={16} aria-hidden="true" />
                    </Button>
                )}
            </div>
            {children}
        </section>
    );
}
export function Details({ rows }: { rows: [string, ReactNode][] }) {
    return (
        <dl className="divide-y">
            {rows.map(([label, value]) => (
                <div
                    key={label}
                    className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="max-w-full text-right font-medium break-words">
                        {value ?? '—'}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
export function Paging({ page }: { page: WorkspacePage<unknown> }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
            <span className="text-muted-foreground">
                {t('Showing {{from}}–{{to}} of {{total}}', {
                    from: page.from ?? 0,
                    to: page.to ?? 0,
                    total: page.total,
                })}
            </span>
            <div className="flex gap-2">
                {page.prev_page_url && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={page.prev_page_url} preserveScroll>
                            <ChevronLeft size={16} />
                            {t('Previous')}
                        </Link>
                    </Button>
                )}
                {page.next_page_url && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={page.next_page_url} preserveScroll>
                            {t('Next')}
                            <ChevronRight size={16} />
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
export function Empty({ message }: { message: string }) {
    const { t } = useTranslation();
    return (
        <p className="px-5 py-12 text-center text-muted-foreground">
            {t(message)}
        </p>
    );
}
