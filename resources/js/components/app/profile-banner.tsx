import * as React from 'react';

import { initialsFrom, toneClasses, type DomainTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type ProfileChip = {
    label: React.ReactNode;
    /** Domain colour; omit for the neutral tint chip. */
    tone?: DomainTone;
    icon?: React.ReactNode;
};

type ProfileBannerProps = Omit<React.ComponentProps<'section'>, 'title'> & {
    name: string;
    logoUrl?: string | null;
    /** A StatusBadge (or similar) next to the name. */
    status?: React.ReactNode;
    chips?: ProfileChip[];
    /** Buttons on the right (Message, Change network, Edit). */
    actions?: React.ReactNode;
    tone?: DomainTone;
    /** Content below the identity row, behind a divider (e.g. tabs). */
    footer?: React.ReactNode;
};

const bannerArt: Record<DomainTone, string> = {
    brand: 'bg-brand [background-image:radial-gradient(circle_at_88%_20%,var(--brand-nav)_0_80px,transparent_81px),radial-gradient(circle_at_72%_130%,var(--partners-base)_0_70px,transparent_71px),radial-gradient(circle_at_97%_100%,var(--finance-nav)_0_34px,transparent_35px)]',
    partners:
        'bg-partners [background-image:radial-gradient(circle_at_88%_20%,var(--partners-nav)_0_80px,transparent_81px),radial-gradient(circle_at_72%_130%,var(--brand-base)_0_70px,transparent_71px),radial-gradient(circle_at_97%_100%,var(--finance-nav)_0_34px,transparent_35px)]',
    finance:
        'bg-finance [background-image:radial-gradient(circle_at_88%_20%,var(--finance-nav)_0_80px,transparent_81px),radial-gradient(circle_at_72%_130%,var(--brand-base)_0_70px,transparent_71px)]',
    admin: 'bg-admin [background-image:radial-gradient(circle_at_88%_20%,var(--admin-nav)_0_80px,transparent_81px),radial-gradient(circle_at_72%_130%,var(--brand-base)_0_70px,transparent_71px)]',
    analytics:
        'bg-analytics [background-image:radial-gradient(circle_at_88%_20%,var(--analytics-nav)_0_80px,transparent_81px),radial-gradient(circle_at_72%_130%,var(--brand-base)_0_70px,transparent_71px)]',
};

/**
 * Partner detail header: coloured banner, overlapping logo tile, the name as
 * the page's h1 with its status, chips and actions.
 */
function ProfileBanner({
    name,
    logoUrl,
    status,
    chips = [],
    actions,
    tone = 'partners',
    footer,
    className,
    ...props
}: ProfileBannerProps) {
    const [logoFailed, setLogoFailed] = React.useState(false);
    return (
        <section
            data-slot="profile-banner"
            aria-label={name}
            className={cn(
                'overflow-hidden rounded-hero border border-border bg-surface shadow-card',
                className,
            )}
            {...props}
        >
            <div
                aria-hidden="true"
                className={cn('h-[120px]', bannerArt[tone])}
            />
            <div className="flex flex-wrap items-end justify-between gap-5 px-6 pb-[22px]">
                <div className="flex min-w-0 flex-wrap items-end gap-[18px]">
                    {logoUrl && !logoFailed ? (
                        <img
                            src={logoUrl}
                            alt=""
                            onError={() => setLogoFailed(true)}
                            className="-mt-[46px] size-[92px] shrink-0 rounded-[26px] border-[5px] border-surface bg-surface object-contain"
                        />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="-mt-[46px] inline-flex size-[92px] shrink-0 items-center justify-center rounded-[26px] border-[5px] border-surface bg-brand text-[28px] font-extrabold text-white"
                        >
                            {initialsFrom(name)}
                        </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-1.5 pt-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-[24px] leading-tight font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere] text-ink sm:text-[28px]">
                                {name}
                            </h1>
                            {status}
                        </div>
                        {chips.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {chips.map((chip, index) => (
                                    <li
                                        key={index}
                                        className={cn(
                                            'inline-flex h-[30px] items-center gap-1.5 rounded-full px-2.5 text-xs font-bold [&_svg]:size-3.5',
                                            chip.tone
                                                ? toneClasses[chip.tone].soft
                                                : 'bg-surface-tint font-semibold text-ink',
                                        )}
                                    >
                                        {chip.icon}
                                        {chip.label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex max-w-full flex-wrap gap-2.5">
                        {actions}
                    </div>
                )}
            </div>
            {footer && (
                <div className="border-t border-border px-4">{footer}</div>
            )}
        </section>
    );
}

export { ProfileBanner };
