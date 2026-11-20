import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { usePermissions } from '@/context/permission-context';
import { cn } from '@/lib/utils';
import { buildNavigation } from '@/navigation/config';
import { edit as profileEdit } from '@/routes/profile';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { BookOpen, Search as SearchIcon, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const isMac = () =>
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Search pill in the top bar. Opens a command palette (also with ⌘K / Ctrl+K)
 * that jumps to any page the user may open.
 */
export function GlobalSearch({ className }: { className?: string }) {
    const { auth } = usePage<SharedData>().props;
    const { permissions } = usePermissions();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const groups = useMemo(
        () => buildNavigation(auth.user, permissions),
        [auth.user, permissions],
    );
    const shortcut = isMac() ? '⌘K' : 'Ctrl K';

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key.toLowerCase() === 'k' &&
                (event.metaKey || event.ctrlKey)
            ) {
                event.preventDefault();
                setOpen((value) => !value);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const go = (href: string) => {
        setOpen(false);
        if (href.startsWith('/docs')) window.location.assign(href);
        else router.visit(href);
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-keyshortcuts="Meta+K Control+K"
                className={cn(
                    'flex h-11 min-w-11 items-center gap-2.5 rounded-control border border-transparent bg-surface-tint px-3.5 text-ink-muted transition-colors hover:border-border-strong',
                    className,
                )}
            >
                <SearchIcon
                    aria-hidden="true"
                    className="size-[18px] shrink-0 text-brand"
                />
                {/* Visible from sm up; still names the icon-only pill on phones. */}
                <span className="sr-only text-left sm:not-sr-only sm:flex-1 sm:truncate">
                    {t('Search pages and tools…')}
                </span>
                <kbd className="hidden rounded-[6px] border border-border-strong bg-surface px-1.5 py-0.5 text-[11px] font-bold text-ink-muted sm:inline">
                    {shortcut}
                </kbd>
            </button>
            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                title={t('Search workspace')}
                description={t('Jump to a page or tool')}
                className="rounded-[24px] sm:max-w-xl"
            >
                <CommandInput
                    placeholder={t('Type a page name…')}
                    aria-label={t('Search workspace')}
                />
                <CommandList>
                    <CommandEmpty>{t('No matching pages')}</CommandEmpty>
                    {groups.map((group) => (
                        <CommandGroup
                            key={group.key}
                            heading={t(group.titleKey ?? 'Overview')}
                        >
                            {group.items.map((item) => (
                                <CommandItem
                                    key={item.key}
                                    value={`${t(item.titleKey)} ${item.key}`}
                                    onSelect={() => go(item.href)}
                                >
                                    <item.icon aria-hidden="true" />
                                    {t(item.titleKey)}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    ))}
                    <CommandGroup heading={t('Account')}>
                        <CommandItem
                            value={`${t('Account settings')} settings`}
                            onSelect={() => go(profileEdit().url)}
                        >
                            <Settings aria-hidden="true" />
                            {t('Account settings')}
                        </CommandItem>
                        <CommandItem
                            value={`${t('Documentation')} docs`}
                            onSelect={() => go('/docs')}
                        >
                            <BookOpen aria-hidden="true" />
                            {t('Documentation')}
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
