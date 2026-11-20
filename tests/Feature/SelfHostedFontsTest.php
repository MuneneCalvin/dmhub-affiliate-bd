<?php

it('loads no fonts or stylesheets from third-party hosts', function () {
    $html = $this->get('/login')->assertOk()->getContent();

    expect($html)->not->toContain('fonts.bunny.net')
        ->and($html)->not->toContain('fonts.googleapis.com')
        ->and($html)->not->toContain('fonts.gstatic.com');
});

it('ships the interface fonts with the built assets', function () {
    $css = collect(glob(public_path('build/assets/app-*.css')))->map(fn ($file) => file_get_contents($file))->implode('');
    $fonts = collect(glob(public_path('build/assets/*.woff2')))->map(fn ($file) => basename($file));

    expect($css)->toContain('Plus Jakarta Sans')->toContain('JetBrains Mono')
        ->and($fonts->filter(fn ($name) => str_contains($name, 'plus-jakarta-sans')))->not->toBeEmpty()
        ->and($fonts->filter(fn ($name) => str_contains($name, 'jetbrains-mono')))->not->toBeEmpty();
});
