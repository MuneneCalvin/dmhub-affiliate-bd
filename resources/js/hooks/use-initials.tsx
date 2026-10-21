import { useCallback } from 'react';
export function useInitials() {
    return useCallback(
        (
            firstName?: string | null,
            lastName?: string | null,
            userName?: string | null
        ): string => {
            const f = firstName?.trim();
            const l = lastName?.trim();
            const u = userName?.trim();
            if (f && l) {
                return `${f[0]}${l[0]}`.toUpperCase();
            }
            if (f) {
                return f[0].toUpperCase();
            }
            if (u) {
                return u[0].toUpperCase();
            }
            return '';
        },
        []
    );
}
