import { IconTile, PageHeader } from '@/components/app';
import { type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { company } from '@/routes/settings';
import { show as showTwoFactor } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    LockKeyhole,
    Moon,
    ShieldCheck,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export type SettingsSection = {
    key: string;
    title: string;
    href: string;
    icon: LucideIcon;
    tone: Tone;
};

type SettingsSectionsProp = { company?: boolean } | null | undefined;

/**
 * Account settings sections the user has, in menu order. Company details only
 * exist for advertiser / publisher accounts that may edit their company
 * (`settingsSections.company`, shared by the server on settings pages).
 */
export function settingsSections(
    available: SettingsSectionsProp,
): SettingsSection[] {
    return [
        {
            key: 'profile',
            title: 'Profile',
            href: editProfile().url,
            icon: UserRound,
            tone: 'brand' as const,
        },
        ...(available?.company
            ? [
                  {
                      key: 'company',
                      title: 'Company details',
                      href: company().url,
                      icon: Building2,
                      tone: 'partners' as const,
                  },
              ]
            : []),
        {
            key: 'password',
            title: 'Password',
            href: editPassword().url,
            icon: LockKeyhole,
            tone: 'admin' as const,
        },
        {
            key: 'two-factor',
            title: 'Two-factor',
            href: showTwoFactor().url,
            icon: ShieldCheck,
            tone: 'success' as const,
        },
        {
            key: 'appearance',
            title: 'Appearance',
            href: editAppearance().url,
            icon: Moon,
            tone: 'analytics' as const,
        },
    ];
}

const currentRow: Partial<Record<Tone, string>> = {
    brand: 'bg-brand-soft',
    partners: 'bg-partners-soft',
    admin: 'bg-admin-soft',
    success: 'bg-success-soft',
    analytics: 'bg-analytics-soft',
};

/**
 * Account settings frame: page header, a section menu with tinted icon tiles
 * (a horizontal scroller on small screens) and the section's cards.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation();
    const { url, props } = usePage<{
        settingsSections?: SettingsSectionsProp;
    }>();
    const currentPath = url.split('?')[0];
    const sections = settingsSections(props.settingsSections);

    return (
        <div className="workspace-page flex flex-col gap-6">
            <PageHeader
                title={t('Account settings')}
                description={t(
                    'Manage your profile, security and how Brand New Day looks for you',
                )}
                breadcrumbs={[
                    { title: t('Account'), href: editProfile().url },
                    { title: t('Settings'), href: currentPath },
                ]}
            />
            <div className="flex flex-col items-start gap-[22px] lg:flex-row">
                <nav
                    aria-label={t('Settings sections')}
                    className="flex w-full max-w-full shrink-0 gap-0.5 overflow-x-auto rounded-card border border-border bg-surface p-2.5 shadow-card lg:w-[260px] lg:flex-col"
                >
                    {sections.map((section) => {
                        const current = section.href === currentPath;
                        const Icon = section.icon;
                        return (
                            <Link
                                key={section.key}
                                href={section.href}
                                aria-current={current ? 'page' : undefined}
                                className={cn(
                                    'flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-2.5 py-2 text-sm whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
                                    current &&
                                        cn(
                                            'font-bold text-ink hover:text-ink',
                                            currentRow[section.tone],
                                        ),
                                )}
                            >
                                <IconTile
                                    size={32}
                                    tone={section.tone}
                                    variant={current ? 'solid' : 'soft'}
                                >
                                    <Icon />
                                </IconTile>
                                {t(section.title)}
                            </Link>
                        );
                    })}
                </nav>
                <div className="flex w-full min-w-0 flex-1 flex-col gap-[18px]">
                    {children}
                </div>
            </div>
        </div>
    );
}
