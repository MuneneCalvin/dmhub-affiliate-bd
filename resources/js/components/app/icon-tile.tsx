import * as React from 'react';

import { softIconClasses, toneClasses, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type IconTileSize = 32 | 40 | 44 | 48 | 56 | 64 | 96;

const sizeClasses: Record<IconTileSize, string> = {
    32: 'size-8 rounded-[10px] [&_svg]:size-4',
    40: 'size-10 rounded-[12px] [&_svg]:size-5',
    44: 'size-11 rounded-[13px] [&_svg]:size-[22px]',
    48: 'size-12 rounded-[14px] [&_svg]:size-6',
    56: 'size-14 rounded-[16px] [&_svg]:size-6',
    64: 'size-16 rounded-[20px] [&_svg]:size-[30px]',
    96: 'size-24 rounded-[28px] text-[28px] [&_svg]:size-11',
};

type IconTileProps = React.ComponentProps<'span'> & {
    size?: IconTileSize;
    tone?: Tone;
    /** `soft` for information, `solid` for actions and page headers. */
    variant?: 'soft' | 'solid';
};

/** Square tile holding an icon (or initials) in a domain or status colour. */
function IconTile({
    size = 44,
    tone = 'brand',
    variant = 'soft',
    className,
    children,
    ...props
}: IconTileProps) {
    return (
        <span
            aria-hidden={props['aria-label'] ? undefined : true}
            data-slot="icon-tile"
            data-tone={tone}
            data-variant={variant}
            className={cn(
                'inline-flex shrink-0 items-center justify-center font-extrabold [&_svg]:shrink-0',
                sizeClasses[size],
                variant === 'solid'
                    ? toneClasses[tone].solid
                    : softIconClasses[tone],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}

export { IconTile };
