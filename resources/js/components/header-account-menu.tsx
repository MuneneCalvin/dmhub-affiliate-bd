import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    displayName,
    UserAvatar,
    UserMenuContent,
} from '@/components/user-menu-content';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Avatar, name and email; opens settings, campaign terms and log out. */
export function HeaderAccountMenu() {
    const { auth } = usePage<SharedData>().props;
    const { t } = useTranslation();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-11 w-11 justify-center gap-2.5 px-0 text-left shadow-none xl:w-auto xl:justify-start xl:px-1 xl:pr-2.5"
                >
                    <UserAvatar user={auth.user} />
                    <span className="hidden min-w-0 flex-col leading-tight xl:flex">
                        <strong className="max-w-40 truncate text-sm font-bold">
                            {displayName(auth.user)}
                        </strong>
                        <span className="max-w-40 truncate text-xs font-medium text-ink-muted">
                            {auth.user.email}
                        </span>
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className="hidden size-4 text-ink-muted xl:block"
                    />
                    {/* Named by the visible name/email plus this label. */}
                    <span className="sr-only">{t('Account menu')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-64 rounded-[20px] p-2"
                align="end"
            >
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
