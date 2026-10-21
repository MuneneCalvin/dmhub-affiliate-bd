const PERMISSIONS_KEY = 'user_permissions';
const PERMISSIONS_TIMESTAMP_KEY = 'user_permissions_timestamp';
const PERMISSIONS_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export type Permission = string;

/**
 * Save permissions to LocalStorage
 */
export function savePermissions(permissions: Permission[]): void {
    try {
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
        localStorage.setItem(PERMISSIONS_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
        console.error('Failed to save permissions to localStorage:', error);
    }
}

/**
 * Load permissions from LocalStorage
 * Returns null if permissions are expired or not found
 */
export function loadPermissions(): Permission[] | null {
    try {
        const stored = localStorage.getItem(PERMISSIONS_KEY);
        const timestamp = localStorage.getItem(PERMISSIONS_TIMESTAMP_KEY);

        if (!stored || !timestamp) {
            return null;
        }

        // Check if permissions have expired
        const storedTime = parseInt(timestamp, 10);
        if (Date.now() - storedTime > PERMISSIONS_TTL) {
            clearPermissions();
            return null;
        }

        return JSON.parse(stored) as Permission[];
    } catch (error) {
        console.error('Failed to load permissions from localStorage:', error);
        return null;
    }
}

/**
 * Clear permissions from LocalStorage (call on logout)
 */
export function clearPermissions(): void {
    try {
        localStorage.removeItem(PERMISSIONS_KEY);
        localStorage.removeItem(PERMISSIONS_TIMESTAMP_KEY);
    } catch (error) {
        console.error('Failed to clear permissions from localStorage:', error);
    }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
    permissions: Permission[],
    permission: Permission
): boolean {
    return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
    permissions: Permission[],
    requiredPermissions: Permission[]
): boolean {
    return requiredPermissions.some((p) => permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
    permissions: Permission[],
    requiredPermissions: Permission[]
): boolean {
    return requiredPermissions.every((p) => permissions.includes(p));
}
