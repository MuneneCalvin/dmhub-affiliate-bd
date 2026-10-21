<?php

it('sends baseline security headers', function () {
    $response = $this->get('/login');

    $response->assertHeader('X-Content-Type-Options', 'nosniff');
    $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    $response->assertHeader('Permissions-Policy');
    $response->assertHeaderMissing('Strict-Transport-Security');
});

it('adds HSTS only on secure production requests', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->get('https://localhost/login')->assertHeader('Strict-Transport-Security');
    $this->get('http://localhost/login')->assertHeaderMissing('Strict-Transport-Security');
});

it('does not block embedding of public lead and script endpoints', function () {
    $this->get('/login')->assertHeaderMissing('X-Frame-Options');
});
