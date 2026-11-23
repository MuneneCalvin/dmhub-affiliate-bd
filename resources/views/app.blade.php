<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" translate="no" @class(['dark' => ($appearance ?? 'light') === 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- The app speaks Dutch and English itself; browser translation rewrites its text and blanks the page. --}}
        <meta name="google" content="notranslate">
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
                background-color: #f6f5ff;
            }
            html.dark {
                background-color: #0f0c24;
            }
        </style>
        <title inertia>{{ config('app.name', 'Brand New Day') }}</title>

        @php
            $faviconUrl = $page['props']['networkBranding']['favicon_url'] ?? '/favicon.png';
        @endphp
        <link rel="icon" href="{{ $faviconUrl }}" sizes="any">
        <link rel="icon" href="{{ $faviconUrl }}" type="image/svg+xml">
        <link rel="apple-touch-icon" href="{{ $faviconUrl }}">

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
