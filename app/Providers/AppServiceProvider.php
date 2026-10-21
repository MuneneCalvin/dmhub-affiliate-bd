<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void {}

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force https in production when the public URL is https (an http:// APP_URL, e.g. an IP-only
        // staging box, keeps working over plain HTTP).
        if ($this->app->environment('production') && str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
        Scramble::configure()
            ->routes(function (Route $route) {
                return ! in_array('GET', $route->methods());
            });
    }
}
