<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdvertiser
{
    /**
     * Ensure the user is an advertiser.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || (!$user->is_advertiser && !$user->is_super_admin)) {
            return redirect()->route('dashboard')->with('error', 'Access denied. Advertiser privileges required.');
        }

        return $next($request);
    }
}
