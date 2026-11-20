import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { usePermissions } from '@/context/permission-context';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import advertiser from '@/routes/advertiser';
import { edit } from '@/routes/profile';
import { type User } from '@/types';
import { clearPermissions } from '@/utils/permissions';
import { Link, router } from '@inertiajs/react';
import { BookOpen, FileText, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const { hasPermission } = usePermissions();
    const cleanup = useMobileNavigation();
    const { t } = useTranslation();

    const handleLogout = () => {
        cleanup();
        clearPermissions();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {hasPermission('manage_campaigns') && (
                    <DropdownMenuItem asChild>
                        <Link href={advertiser.terms()} onClick={cleanup}>
                            <FileText className="mr-2 size-4" />
                            {t('My Terms')}
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full"
                        href={edit()}
                        as="button"
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href="/docs/campaign-setup">
                        <BookOpen className="mr-2 size-4" />
                        {t('Account and role help')}
                    </a>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
