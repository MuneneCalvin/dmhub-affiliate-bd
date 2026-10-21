import React, { ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { usePermissions } from '@/context/permission-context';
import { Permission } from '@/utils/permissions';

interface ProtectedRouteProps {
    children: ReactNode;
    permissions: Permission[];
    matchAll?: boolean;
    fallback?: ReactNode;
    redirectTo?: string;
}

/**
 * ProtectedRoute - Wraps content that requires specific permissions
 *
 * @param permissions - Array of required permissions
 * @param matchAll - If true, user must have ALL permissions. If false (default), ANY permission grants access
 * @param fallback - Optional component to render when access is denied (instead of redirect)
 * @param redirectTo - Optional route to redirect to when access is denied (default: dashboard)
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    permissions,
    matchAll = false,
    fallback,
    redirectTo = '/dashboard',
}) => {
    const { hasAnyPermission, hasAllPermissions } = usePermissions();

    const hasAccess = matchAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);

    if (!hasAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }
        // Redirect using Inertia
        router.visit(redirectTo, { replace: true });
        return null;
    }

    return <>{children}</>;
};

interface PermissionGateProps {
    children: ReactNode;
    permissions: Permission[];
    matchAll?: boolean;
    fallback?: ReactNode;
}

/**
 * PermissionGate - Conditionally renders content based on permissions
 * Does NOT redirect, only shows/hides content
 *
 * Use this for hiding sidebar items, buttons, or UI elements
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    children,
    permissions,
    matchAll = false,
    fallback = null,
}) => {
    const { hasAnyPermission, hasAllPermissions } = usePermissions();

    const hasAccess = matchAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);

    if (!hasAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

/**
 * Hook for checking permissions in components
 */
export function useHasPermission(
    permissions: Permission[],
    matchAll = false
): boolean {
    const { hasAnyPermission, hasAllPermissions } = usePermissions();
    return matchAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
}
