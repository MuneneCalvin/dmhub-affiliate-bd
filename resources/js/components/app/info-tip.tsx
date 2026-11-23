import { Info } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { GLOSSARY, GLOSSARY_LABELS, type GlossaryTerm } from '@/lib/glossary';
import { cn } from '@/lib/utils';

/**
 * An info icon that explains a term. A real button: reachable with Tab, opens on focus and hover, closes on
 * Escape, and opens on a tap for touch screens (tooltips alone do not).
 */
function InfoTip({
    term,
    label,
    className,
}: {
    term: GlossaryTerm;
    /** The word as this screen writes it, when it differs from the glossary's. */
    label?: string;
    className?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const name = label ?? t(GLOSSARY_LABELS[term]);

    return (
        <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    data-slot="info-tip"
                    aria-label={t('What is {{term}}?', { term: name })}
                    onClick={() => setOpen(true)}
                    className={cn(
                        'inline-flex size-5 shrink-0 items-center justify-center rounded-full align-middle text-ink-muted outline-none hover:text-ink focus-visible:ring-[3px] focus-visible:ring-focus-halo',
                        className,
                    )}
                >
                    <Info aria-hidden="true" className="size-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                {t(GLOSSARY[term])}
            </TooltipContent>
        </Tooltip>
    );
}

export { InfoTip };
