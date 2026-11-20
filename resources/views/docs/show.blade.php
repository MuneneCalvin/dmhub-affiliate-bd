<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="{{ $description }}">
    <title>{{ $title }} · DM Hub guides</title>
    <link rel="stylesheet" href="{{ asset('css/documentation.css') }}">
</head>
<body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="docs-header">
        <a class="brand" href="{{ route('public.docs.index') }}"><span class="brand-mark">dm</span> DM Hub <span class="brand-label">/ Guides</span></a>
        <a class="account-link" href="{{ route('home') }}">Open platform <span aria-hidden="true">↗</span></a>
    </header>
    <div class="docs-layout">
        <nav class="docs-nav" aria-label="Documentation">
            <p class="nav-intro">CAMPAIGNS & INTEGRATIONS</p>
            @foreach (collect($guides)->groupBy('group', preserveKeys: true) as $group => $items)
                <div class="nav-group">
                    <h2>{{ $group }}</h2>
                    @foreach ($items as $slug => $item)
                        <a href="{{ route('public.docs.show', $slug) }}" @if ($activeGuide === $slug) aria-current="page" @endif>{{ $item['title'] }}</a>
                    @endforeach
                </div>
            @endforeach
            <p class="nav-note">Share these guides with your developer. No account required.</p>
        </nav>
        <main id="content" tabindex="-1">
            <div class="page-tools"><span>DM HUB DOCUMENTATION</span><a href="{{ $downloadUrl }}" download>Download Markdown <span aria-hidden="true">↓</span></a></div>
            <article class="prose">{!! $html !!}</article>
            <footer class="docs-footer">Need to check a request? <a href="{{ route('public.docs.show', 'api-reference') }}">API & troubleshooting →</a></footer>
        </main>
    </div>
</body>
</html>
