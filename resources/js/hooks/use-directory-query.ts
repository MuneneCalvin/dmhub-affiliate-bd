import { router, usePage } from '@inertiajs/react';

import type { DirectoryPagination } from '@/components/app/resource-directory';

type QueryValue = string | number | null | undefined;

/** Laravel's length-aware paginator as Inertia serialises it. */
export type LaravelPage<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page?: number;
    total: number;
    from: number | null;
    to: number | null;
};

/**
 * Reads the list page's query string and reloads the page from the server
 * with changed parameters (status filter, page). Other parameters are kept.
 */
export function useDirectoryQuery() {
    const { url } = usePage();
    const [path, queryString = ''] = url.split('?');
    const params = Object.fromEntries(new URLSearchParams(queryString));

    const visit = (changes: Record<string, QueryValue>) => {
        const next: Record<string, string> = { ...params };
        Object.entries(changes).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                delete next[key];
            } else {
                next[key] = String(value);
            }
        });
        router.get(path, next, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    /** Status tiles: `all` removes the filter; changing it starts at page 1. */
    const setStatus = (status: string) =>
        visit({ status: status === 'all' ? null : status, page: null });

    const pagination = (
        page: LaravelPage<unknown> | null | undefined,
    ): DirectoryPagination | undefined =>
        page
            ? {
                  page: page.current_page,
                  pageCount: page.last_page,
                  total: page.total,
                  from: page.from,
                  to: page.to,
                  onPageChange: (next) => visit({ page: next }),
              }
            : undefined;

    return { params, visit, setStatus, pagination };
}
