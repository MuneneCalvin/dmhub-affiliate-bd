import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/context/permission-context';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { initialsFrom, toneClasses, toneFromName } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { primaryRole, roleLabels } from '@/navigation/config';
import { logout } from '@/routes';
import advertiser from '@/routes/advertiser';
import { edit } from '@/routes/profile';
import { type User } from '@/types';
import { clearPermissions } from '@/utils/permissions';
import { Link, router } from '@inertiajs/react';
import { BookOpen, FileText, LogOut, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function displayName(user: User): string {
    return (
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.user_name ||
        user.email
    );
}

/** Initials avatar (or uploaded photo) in a tone derived from the name. */
export function UserAvatar({
    user,
    size = 36,
}: {
    user: User;
    size?: 36 | 40;
}) {
    const name = displayName(user);
    const sizeClass =
        size === 40 ? 'size-10 rounded-[12px]' : 'size-9 rounded-[11px]';
    if (user.avatar)
        return (
            <img
                src={user.avatar}
                alt=""
                className={cn('shrink-0 object-cover', sizeClass)}
            />
        );
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex shrink-0 items-center justify-center text-[13px] font-extrabold',
                sizeClass,
                toneClasses[toneFromName(name)].soft,
            )}
        >
            {initialsFrom(name)}
        </span>
    );
}

export function UserMenuContent({ user }: { user: User }) {
    const { hasPermission } = usePermissions();
    const cleanup = useMobileNavigation();
    const { t } = useTranslation();
    const role = primaryRole(user);

    const handleLogout = () => {
        cleanup();
        clearPermissions();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="flex items-center gap-3 p-3 font-normal">
                <UserAvatar user={user} size={40} />
                <span className="flex min-w-0 flex-col leading-tight">
                    <strong className="truncate text-sm font-bold text-ink">
                        {displayName(user)}
                    </strong>
                    <span className="truncate text-xs text-ink-muted">
                        {role ? t(roleLabels[role]) : user.email}
                    </span>
                </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild icon={<UserRound />} tone="brand">
                    <Link href={edit()} prefetch onClick={cleanup}>
                        {t('Account settings')}
                    </Link>
                </DropdownMenuItem>
                {hasPermission('manage_campaigns') && (
                    <DropdownMenuItem
                        asChild
                        icon={<FileText />}
                        tone="partners"
                    >
                        <Link href={advertiser.terms()} onClick={cleanup}>
                            {t('Campaign terms')}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild icon={<BookOpen />} tone="analytics">
                    <a href="/docs/campaign-setup">
                        {t('Account and role help')}
                    </a>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild variant="destructive" icon={<LogOut />}>
                <Link
                    href={logout()}
                    as="button"
                    className="w-full"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    {t('Log out')}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
