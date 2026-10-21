<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectByRole
{
    /**
     * Redirect users to their appropriate dashboard based on role.
     * Used on generic routes like /dashboard to send users to their role-specific dashboard.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // Priority order: Super Admin > Network Owner > Advertiser > Publisher
        if ($user->is_super_admin) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->is_network) {
            return redirect()->route('network.dashboard');
        }

        if ($user->is_advertiser) {
            return redirect()->route('advertiser.dashboard');
        }

        if ($user->is_publisher) {
            return redirect()->route('publisher.dashboard');
        }

        return $next($request);
    }
}
