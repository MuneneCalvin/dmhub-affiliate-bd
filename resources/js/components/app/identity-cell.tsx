import * as React from 'react';

import {
    initialsFrom,
    toneClasses,
    toneFromName,
    type Tone,
} from '@/lib/tones';
import { cn } from '@/lib/utils';

const tileSize = {
    32: 'size-8 rounded-[10px]',
    40: 'size-10 rounded-[12px]',
    44: 'size-11 rounded-[13px]',
} as const;

type IdentityCellProps = Omit<React.ComponentProps<'div'>, 'title'> & {
    name: string;
    subtitle?: React.ReactNode;
    /** Logo image; falls back to initials. */
    logoUrl?: string | null;
    /** Override the tone derived from the name. */
    tone?: Tone;
    size?: 32 | 40 | 44;
    /** Makes the name a link (an Inertia `<Link>` or `<a>` element). */
    renderName?: (name: string) => React.ReactNode;
};

/** Initials or logo tile + name + secondary line, for tables and lists. */
function IdentityCell({
    name,
    subtitle,
    logoUrl,
    tone,
    size = 40,
    renderName,
    className,
    ...props
}: IdentityCellProps) {
    const [logoFailed, setLogoFailed] = React.useState(false);
    const showLogo = logoUrl && !logoFailed;

    return (
        <div
            data-slot="identity-cell"
            className={cn('flex min-w-0 items-center gap-3', className)}
            {...props}
        >
            {showLogo ? (
                <img
                    src={logoUrl}
                    alt=""
                    onError={() => setLogoFailed(true)}
                    className={cn(
                        'shrink-0 border border-border bg-surface object-contain',
                        tileSize[size],
                    )}
                />
            ) : (
                <span
                    aria-hidden="true"
                    data-slot="identity-initials"
                    className={cn(
                        'inline-flex shrink-0 items-center justify-center text-[13px] font-extrabold',
                        tileSize[size],
                        toneClasses[tone ?? toneFromName(name)].soft,
                    )}
                >
                    {initialsFrom(name)}
                </span>
            )}
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-ink">
                    {renderName ? renderName(name) : name}
                </span>
                {subtitle && (
                    <span className="truncate text-xs text-ink-muted">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );
}

export { IdentityCell };
