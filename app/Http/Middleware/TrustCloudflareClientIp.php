<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Behind Cloudflare the connecting peer is a Cloudflare edge, not the visitor. CF-Connecting-IP carries the real
 * address, but it is only believed when the request actually arrived from a Cloudflare address, so a visitor
 * reaching the origin on another domain cannot spoof their IP with that header.
 */
class TrustCloudflareClientIp
{
    public function handle(Request $request, Closure $next)
    {
        $client = $request->headers->get('CF-Connecting-IP');
        if ($client && filter_var($client, FILTER_VALIDATE_IP) && IpUtils::checkIp((string) $request->ip(), config('tracking.cloudflare_ips'))) {
            $request->headers->set('X-Forwarded-For', $client);
        }

        return $next($request);
    }
}
