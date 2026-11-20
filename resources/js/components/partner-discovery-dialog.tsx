import { Button } from '@/components/ui/button';
import {
    Command,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { usePermissions } from '@/context/permission-context';
import networks from '@/routes/networks';
import { router } from '@inertiajs/react';
import { ArrowUpRight, Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Suggestion {
    id: number;
    name: string;
    description: string | null;
    href: string;
}

export function PartnerDiscoveryDialog({
    kind,
}: {
    kind: 'publishers' | 'advertisers';
}) {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const url = networks.pool[kind].url();
    const title = t(
        kind === 'publishers' ? 'Discover publishers' : 'Discover advertisers',
    );
    const searchLabel = t(
        kind === 'publishers'
            ? 'Search publishers...'
            : 'Search advertisers...',
    );

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    `${url}?${new URLSearchParams({ term: term.trim() })}`,
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                if (!response.ok) throw new Error('Discovery search failed');
                const data: { suggestions: Suggestion[] } =
                    await response.json();
                if (!controller.signal.aborted)
                    setSuggestions(data.suggestions);
            } catch {
                if (!controller.signal.aborted) setFailed(true);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [open, term, url, attempt]);

    const resetSearch = () => {
        setSuggestions([]);
        setLoading(true);
        setFailed(false);
    };

    if (!hasPermission('access_pool')) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setTerm('');
                resetSearch();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Search className="size-4" />
                    {title}
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[min(48rem,90dvh)] max-h-[90dvh] flex-col overflow-hidden p-4 sm:max-w-4xl sm:p-6">
                <DialogHeader className="shrink-0 pr-6">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'Find partners available to your network. Select a suggestion to review their profile.',
                        )}
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        setOpen(false);
                        router.get(url, { term: term.trim() });
                    }}
                    className="flex min-h-0 flex-1 flex-col gap-4"
                >
                    <Command
                        shouldFilter={false}
                        className="h-auto min-h-0 flex-1 border [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:shrink-0"
                        label={searchLabel}
                    >
                        <CommandInput
                            autoFocus
                            aria-label={searchLabel}
                            placeholder={searchLabel}
                            maxLength={200}
                            value={term}
                            onValueChange={(value) => {
                                setTerm(value);
                                resetSearch();
                            }}
                        />
                        <CommandList
                            aria-busy={loading}
                            className="max-h-none min-h-0 flex-1"
                        >
                            {loading ? (
                                <div
                                    role="status"
                                    className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"
                                >
                                    <Loader2 className="size-4 animate-spin" />
                                    {t('Searching partners...')}
                                </div>
                            ) : failed ? (
                                <div
                                    role="alert"
                                    className="space-y-2 p-6 text-center text-sm"
                                >
                                    <p>
                                        {t(
                                            'Could not load suggestions. Please try again.',
                                        )}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            resetSearch();
                                            setAttempt((value) => value + 1);
                                        }}
                                    >
                                        {t('Try again')}
                                    </Button>
                                </div>
                            ) : suggestions.length === 0 ? (
                                <p
                                    role="status"
                                    className="p-6 text-center text-sm text-muted-foreground"
                                >
                                    {t('No matching partners found.')}
                                </p>
                            ) : (
                                suggestions.map((suggestion) => (
                                    <CommandItem
                                        key={suggestion.id}
                                        value={String(suggestion.id)}
                                        onSelect={() => {
                                            setOpen(false);
                                            router.visit(suggestion.href);
                                        }}
                                        className="cursor-pointer gap-3 px-3 py-3"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-medium break-words">
                                                {suggestion.name}
                                            </span>
                                            <span className="block text-xs break-words text-muted-foreground">
                                                {suggestion.description}
                                            </span>
                                        </span>
                                        <ArrowUpRight className="size-4" />
                                    </CommandItem>
                                ))
                            )}
                        </CommandList>
                    </Command>
                    <div className="flex shrink-0 justify-end">
                        <Button type="submit">
                            <Search className="size-4" />
                            {t('View all results')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
