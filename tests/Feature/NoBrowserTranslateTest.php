<?php

// Chrome's page translation rewrites the text of a React page and crashes it (a blank screen). The platform
// already speaks Dutch and English itself, so browsers are told not to translate it.
it('tells browsers not to translate the app', function (string $path) {
    $html = $this->get($path)->assertOk()->getContent();

    expect($html)->toContain('<meta name="google" content="notranslate">')
        ->and($html)->toMatch('/<html[^>]*\btranslate="no"/');
})->with(['/login', '/register']);
