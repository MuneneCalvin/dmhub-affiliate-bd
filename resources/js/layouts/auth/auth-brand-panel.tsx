import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Link2, Megaphone, Network, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Workspace name and logo: the tenant's branding when the page has it, otherwise Brand New Day. */
export function useAuthBrand() {
    const { networkBranding } = usePage<SharedData>().props;
    return {
        name: networkBranding?.network_name || 'Brand New Day',
        // Same mark as the app sidebar: made for a coloured tile.
        logoUrl: networkBranding?.sidebar_logo_url || null,
    };
}

/** Logo tile + workspace name, linking home. `inverse` is for the navy panel. */
export function AuthBrandMark({ inverse = false }: { inverse?: boolean }) {
    const { name, logoUrl } = useAuthBrand();
    const [logoFailed, setLogoFailed] = useState(false);
    return (
        <Link
            href="/"
            className="flex min-h-11 w-fit items-center gap-3 rounded-control"
        >
            <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-brand text-white"
            >
                {logoUrl && !logoFailed ? (
                    <img
                        src={logoUrl}
                        alt=""
                        className="size-full object-contain p-1.5"
                        onError={() => setLogoFailed(true)}
                    />
                ) : (
                    <Link2 className="size-[22px]" strokeWidth={2.4} />
                )}
            </span>
            <span
                className={
                    inverse
                        ? 'text-[19px] font-extrabold text-white'
                        : 'text-[17px] font-extrabold text-ink'
                }
            >
                {name}
            </span>
        </Link>
    );
}

function RoleTile({
    icon,
    label,
    className,
}: {
    icon: ReactNode;
    label: string;
    className: string;
}) {
    return (
        <div
            className={`flex flex-col gap-7 rounded-[20px] p-[18px] text-white ${className}`}
        >
            <span className="flex size-10 items-center justify-center rounded-[12px] bg-white/20 [&_svg]:size-5">
                {icon}
            </span>
            <strong className="text-[15px] font-bold">{label}</strong>
        </div>
    );
}

/** Navy panel beside the auth forms (hidden below `lg`). */
export function AuthBrandPanel() {
    const { t } = useTranslation();
    const { name } = useAuthBrand();

    return (
        <section
            aria-label={t('About {{name}}', { name })}
            className="relative hidden min-w-0 flex-[1_1_520px] flex-col gap-10 overflow-hidden bg-sidebar px-12 py-10 text-white lg:flex"
        >
            <AuthBrandMark inverse />

            <div className="flex max-w-[520px] flex-col gap-3.5">
                <p className="text-[44px] leading-[1.08] font-extrabold tracking-[-0.03em]">
                    {t('Advertisers, publishers and networks,')}{' '}
                    <span className="text-finance-nav">
                        {t('in one workspace.')}
                    </span>
                </p>
                <p className="text-base text-sidebar-text">
                    {t(
                        'Run campaigns, approve partners and settle invoices from one place.',
                    )}
                </p>
            </div>

            <div
                aria-hidden="true"
                className="grid max-w-[560px] grid-cols-3 gap-3.5"
            >
                <RoleTile
                    icon={<Megaphone />}
                    label={t('Advertisers')}
                    className="-rotate-3 bg-brand"
                />
                <RoleTile
                    icon={<Users />}
                    label={t('Publishers')}
                    className="mt-7 bg-partners-strong"
                />
                <RoleTile
                    icon={<Network />}
                    label={t('Networks')}
                    className="rotate-3 bg-finance-strong"
                />
            </div>

            <span
                aria-hidden="true"
                className="absolute -right-[60px] -bottom-[60px] size-[220px] rounded-full bg-admin opacity-85"
            />
            <span
                aria-hidden="true"
                className="absolute right-[150px] bottom-[60px] size-[54px] rounded-[16px] bg-analytics"
            />
        </section>
    );
}
