<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A new partner is signed in as soon as they register, then opens the emailed link in the same browser.
 * Fortify's reset routes are guest-only and would bounce them away, so following a reset link ends the session first.
 */
class LogOutForPasswordLink
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('password.reset', 'password.update') && Auth::check()) {
            Auth::guard()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $next($request);
    }
}
