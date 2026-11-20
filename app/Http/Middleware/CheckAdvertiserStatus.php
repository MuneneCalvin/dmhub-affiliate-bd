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
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($user = $request->user()) {
            abort_if($user->closed_at !== null || $user->status === 'C', 403, 'This account is closed.');
            // Pending users can still close their own account with their password.
            if ($request->routeIs('profile.destroy')) {
                return $next($request);
            }
            if ($user->status !== 'A') {
                if ($request->expectsJson()) {
                    abort(403, 'This account is not active.');
                }
                if (! $request->routeIs('waitForApproval') && ! $request->routeIs('logout')) {
                    return Inertia::render('errorpages/wait_approval', [
                        'status' => auth()->user()->status,
                        'message' => 'Your account is pending approval. Please wait while we review your application.',
                    ])->toResponse($request)->setStatusCode(403);
                }
            }
        }

        return $next($request);
    }
}
