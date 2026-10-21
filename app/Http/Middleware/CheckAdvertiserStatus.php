<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckAdvertiserStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
       if (auth()->check() && (auth()->user()->is_publisher === true || auth()->user()->is_advertiser === true || auth()->user()->is_network === true)) {
            if (auth()->user()->status !== 'A') {
                if (!$request->routeIs('waitForApproval') && !$request->routeIs('logout')) {
                    return Inertia::render('errorpages/wait_approval', [
                        'status' => auth()->user()->status,
                        'message' => 'Your account is pending approval. Please wait while we review your application.'
                    ])->toResponse($request);
                }
            }
        }
         return $next($request);
    }
}
