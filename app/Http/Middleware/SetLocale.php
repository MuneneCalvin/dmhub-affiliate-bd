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
     * 4. Accept-Language header
     * 5. Application default (nl)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->detectLocale($request);

        // Validate locale against available options
        $availableLocales = array_keys(config('app.available_locales', ['nl' => [], 'en' => []]));

        if (!in_array($locale, $availableLocales)) {
            $locale = config('app.fallback_locale', 'nl');
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

        // 4. Check Accept-Language header
        $preferredLocale = $this->parseAcceptLanguage($request);
        if ($preferredLocale) {
            return $preferredLocale;
        }

        // 5. Fall back to default
        return config('app.locale', 'nl');
    }

    protected function parseAcceptLanguage(Request $request): ?string
    {
        $acceptLanguage = $request->header('Accept-Language');

        if (!$acceptLanguage) {
            return null;
        }

        $availableLocales = array_keys(config('app.available_locales', []));

        // Parse Accept-Language header
        // Example: "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7"
        $languages = [];

        foreach (explode(',', $acceptLanguage) as $part) {
            $part = trim($part);
            $quality = 1.0;

            if (str_contains($part, ';q=')) {
                [$part, $q] = explode(';q=', $part);
                $quality = (float) $q;
            }

            // Extract base language code (nl-NL -> nl)
            $lang = strtolower(substr($part, 0, 2));
            $languages[$lang] = $quality;
        }

        // Sort by quality
        arsort($languages);

        // Return first matching available locale
        foreach (array_keys($languages) as $lang) {
            if (in_array($lang, $availableLocales)) {
                return $lang;
            }
        }

        return null;
    }
}
