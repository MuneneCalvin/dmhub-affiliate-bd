import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HeaderAccountMenu() {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    const getInitials = useInitials();
    const userName =
        [auth.user.first_name, auth.user.last_name].filter(Boolean).join(' ') ||
        auth.user.user_name ||
        auth.user.email;
    const role = auth.user.is_super_admin
        ? 'Administrator'
        : auth.user.is_network
          ? 'Network'
          : auth.user.is_advertiser
            ? 'Advertiser'
            : auth.user.is_publisher
              ? 'Publisher'
              : 'Workspace';
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="workspace-account h-auto gap-3 p-1.5 text-left"
                    aria-label={t('Account menu')}
                >
                    <Avatar className="size-10">
                        <AvatarImage src={auth.user.avatar} alt={userName} />
                        <AvatarFallback className="border-0 bg-accent text-primary">
                            {getInitials(
                                auth.user.first_name,
                                auth.user.last_name,
                                auth.user.user_name || auth.user.email,
                            )}
                        </AvatarFallback>
                    </Avatar>
                    <span className="workspace-account-label min-w-0">
                        <span className="block max-w-40 truncate text-sm font-semibold">
                            {userName}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                            {t(role)}
                        </span>
                    </span>
                    <ChevronDown className="workspace-account-label size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
