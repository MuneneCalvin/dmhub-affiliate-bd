<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Locale detection priority:
     * 1. Authenticated user preference (database)
     * 2. Session value (for guests who switched)
     * 3. Cookie value (persistent guest preference)
     * 4. Application default (nl)
     *
     * The browser's Accept-Language is deliberately not read: the platform is Dutch until someone chooses otherwise.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->detectLocale($request);

        // Validate locale against available options
        $availableLocales = array_keys(config('app.available_locales', ['nl' => [], 'en' => []]));

        if (! in_array($locale, $availableLocales)) {
            $locale = config('app.locale', 'nl');
        }

        // Set the application locale
        App::setLocale($locale);

        // Store in session for consistency
        session(['locale' => $locale]);

        return $next($request);
    }

    protected function detectLocale(Request $request): string
    {
        // 1. Check authenticated user preference
        if ($user = $request->user()) {
            if ($user->locale) {
                return $user->locale;
            }
        }

        // 2. Check session (guest who previously switched)
        if ($sessionLocale = session('locale')) {
            return $sessionLocale;
        }

        // 3. Check cookie
        if ($cookieLocale = $request->cookie('locale')) {
            return $cookieLocale;
        }

        // 4. Fall back to default
        return config('app.locale', 'nl');
    }
}
