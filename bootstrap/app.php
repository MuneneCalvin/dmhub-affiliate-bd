<?php

use App\Http\Middleware\CheckAdvertiserStatus;
use App\Http\Middleware\EnsureAdvertiser;
use App\Http\Middleware\EnsureCampaignManager;
use App\Http\Middleware\EnsureNetworkOwner;
use App\Http\Middleware\EnsurePublisher;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectByRole;
use App\Http\Middleware\RedirectIfPublisher;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\VerifyPostbackSecret;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'locale']);

        // Comma-separated proxy IPs/CIDRs (or '*') from TRUSTED_PROXIES. Set to your load balancer in production.
        $trusted = env('TRUSTED_PROXIES', '*');
        $middleware->trustProxies(at: $trusted === '*' ? '*' : array_values(array_filter(array_map('trim', explode(',', (string) $trusted)))));

        $middleware->web(append: [
            HandleAppearance::class,
            SetLocale::class,
            SecurityHeaders::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            // Status check
            'check.advertiser.status' => CheckAdvertiserStatus::class,

            // Role-based redirects
            'redirect.by.role' => RedirectByRole::class,
            'not.publisher' => RedirectIfPublisher::class,

            // Role enforcement middlewares
            'ensure.admin' => EnsureSuperAdmin::class,
            'ensure.network' => EnsureNetworkOwner::class,
            'ensure.advertiser' => EnsureAdvertiser::class,
            'ensure.campaign.manager' => EnsureCampaignManager::class,
            'ensure.publisher' => EnsurePublisher::class,

            // Shared-secret check for external postbacks
            'postback.secret' => VerifyPostbackSecret::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
