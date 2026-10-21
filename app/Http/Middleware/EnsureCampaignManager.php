<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCampaignManager
{
    /**
     * Campaigns, offers, creatives and their terms are managed by advertisers,
     * network owners and super admins. Publishers never reach them.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || (! $user->is_super_admin && ! $user->is_network && ! $user->is_advertiser)) {
            return redirect()->route('dashboard')->with('error', 'Access denied.');
        }

        return $next($request);
    }
}
