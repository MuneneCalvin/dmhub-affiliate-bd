<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RedirectIfPublisher
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && $user->is_publisher) {
            return redirect()->route('publisher.dashboard');
        }
        return $next($request);
    }
}
