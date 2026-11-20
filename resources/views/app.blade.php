<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'light') === 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script>
            (function() {
                 const appearance = '{{ $appearance ?? 'light' }}';
                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>
        <style>
            html {
                background-color: #f5f7fb;
            }
            html.dark {
                background-color: #0e1625;
            }
        </style>
        <title inertia>{{ config('app.name', 'DM Hub') }}</title>

        @php
            $faviconUrl = $page['props']['networkBranding']['favicon_url'] ?? '/favicon.png';
        @endphp
        <link rel="icon" href="{{ $faviconUrl }}" sizes="any">
        <link rel="icon" href="{{ $faviconUrl }}" type="image/svg+xml">
        <link rel="apple-touch-icon" href="{{ $faviconUrl }}">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
