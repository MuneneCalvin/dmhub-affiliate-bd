import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';

const appName = import.meta.env.VITE_APP_NAME || 'Brand New Day';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) =>
            resolvePageComponent(
                `./pages/${name}.tsx`,
                // Page tests live beside pages; keep them out of the build.
                import.meta.glob([
                    './pages/**/*.tsx',
                    '!./pages/**/*.test.tsx',
                ]),
            ),
        setup: ({ App, props }) => {
            return <App {...props} />;
        },
    }),
);
