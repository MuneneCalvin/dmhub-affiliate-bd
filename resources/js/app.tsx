import '../css/app.css';

import { Toaster } from '@/components/ui/sonner';
import { createInertiaApp } from '@inertiajs/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import i18n, { i18nReady } from './i18n/index';

const appName = import.meta.env.VITE_APP_NAME || 'Brand New Day';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000,
        },
    },
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            // Page tests live beside pages; keep them out of the build.
            import.meta.glob(['./pages/**/*.tsx', '!./pages/**/*.test.tsx']),
        ),
    async setup({ el, App, props }) {
        // Load the server locale's bundle before the first render so there is
        // no language flash.
        const locale = props.initialPage.props.locale as
            | { current?: string }
            | undefined;
        await i18nReady;
        if (locale?.current) {
            await i18n.changeLanguage(locale.current);
            document.documentElement.lang = locale.current;
        }
        const root = createRoot(el);
        root.render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App {...props} />
                    <Toaster />
                </QueryClientProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#5B3DF5',
    },
});

initializeTheme();
