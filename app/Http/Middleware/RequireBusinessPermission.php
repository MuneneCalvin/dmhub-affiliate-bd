<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireBusinessPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        abort_unless($user && $user->status === 'A' && $user->closed_at === null, 403);
        // Super admins retain explicit platform-wide authority. Every other user needs
        // both the route's account category/tenant checks and a current permission grant.
        abort_unless($user->is_super_admin || $user->roles()
            ->whereHas('permissions', fn ($query) => $query->where('name', $permission))->exists()
            || $user->permissions()->where('name', $permission)->exists(), 403);

        return $next($request);
    }
}
