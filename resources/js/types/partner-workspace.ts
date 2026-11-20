export type WorkspacePage<T> = {
    data: T[];
    total: number;
    from: number | null;
    to: number | null;
    prev_page_url: string | null;
    next_page_url: string | null;
};
