import React, { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import {
    Permission,
    savePermissions,
    loadPermissions,
    clearPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
} from '@/utils/permissions';

interface PermissionContextType {
    permissions: Permission[];
    hasPermission: (permission: Permission) => boolean;
    hasAnyPermission: (permissions: Permission[]) => boolean;
    hasAllPermissions: (permissions: Permission[]) => boolean;
    clearPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
    children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
    // Get permissions from Inertia page props (server-provided)
    const { auth } = usePage().props as { auth?: { permissions?: Permission[] } };
    const serverPermissions = useMemo(() => auth?.permissions ?? [], [auth?.permissions]);

    // On mount, sync server permissions to localStorage (only when we have valid server permissions)
    useEffect(() => {
        if (serverPermissions.length > 0) {
            savePermissions(serverPermissions);
        }
    }, [serverPermissions]);

    // Use server permissions if available, otherwise fall back to localStorage
    const permissions = useMemo(() => {
        if (serverPermissions.length > 0) {
            return serverPermissions;
        }
        // Fallback to cached permissions (useful during initial load or offline)
        return loadPermissions() ?? [];
    }, [serverPermissions]);

    const value = useMemo<PermissionContextType>(
        () => ({
            permissions,
            hasPermission: (permission: Permission) => hasPermission(permissions, permission),
            hasAnyPermission: (perms: Permission[]) => hasAnyPermission(permissions, perms),
            hasAllPermissions: (perms: Permission[]) => hasAllPermissions(permissions, perms),
            clearPermissions,
        }),
        [permissions]
    );

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

/**
 * Hook to access permission context
 */
export const usePermissions = (): PermissionContextType => {
    const context = useContext(PermissionContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
};

/**
 * Higher-order component to wrap components with permission check
 */
export function withPermission<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    requiredPermissions: Permission[],
    matchAll = false
): React.FC<P> {
    return function PermissionWrapper(props: P) {
        const { hasAnyPermission, hasAllPermissions } = usePermissions();

        const hasAccess = matchAll
            ? hasAllPermissions(requiredPermissions)
            : hasAnyPermission(requiredPermissions);

        if (!hasAccess) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };
}
