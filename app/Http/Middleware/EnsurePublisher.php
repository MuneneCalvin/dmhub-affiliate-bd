<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePublisher
{
    /**
     * Ensure the user is a publisher.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || (!$user->is_publisher && !$user->is_super_admin)) {
            return redirect()->route('dashboard')->with('error', 'Access denied. Publisher privileges required.');
        }

        return $next($request);
    }
}
