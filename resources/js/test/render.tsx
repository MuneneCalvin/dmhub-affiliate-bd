import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { setPageProps } from './inertia';

type Options = RenderOptions & {
    /** Inertia page props merged over the defaults (auth.user, locale, flash…). */
    pageProps?: Record<string, unknown>;
    /** The current Inertia URL, for active-link logic. */
    url?: string;
};

/** Render a component with the providers the app uses, plus a userEvent instance. */
export function renderWithApp(
    ui: ReactElement,
    { pageProps, url, ...options }: Options = {},
) {
    if (pageProps || url) setPageProps(pageProps ?? {}, url);
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { user: userEvent.setup(), ...render(ui, { wrapper, ...options }) };
}

export { router, setPageProps } from './inertia';
