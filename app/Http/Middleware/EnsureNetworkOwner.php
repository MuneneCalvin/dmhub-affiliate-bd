<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNetworkOwner
{
    /**
     * Ensure the user is a network owner.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || (!$user->is_network && !$user->is_super_admin)) {
            return redirect()->route('dashboard')->with('error', 'Access denied. Network owner privileges required.');
        }

        return $next($request);
    }
}
