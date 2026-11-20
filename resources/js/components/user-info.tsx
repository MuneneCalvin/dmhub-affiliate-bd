import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();
    const initials = getInitials(
        user?.first_name,
        user?.last_name,
        user?.user_name,
    );

    const displayName =
        user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.user_name;
    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full bg-sidebar-accent text-sidebar-foreground">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {showEmail && (
                    <span className="truncate text-xs opacity-70">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
