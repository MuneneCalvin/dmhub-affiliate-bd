<?php

namespace App\Http\Middleware;

use App\Models\StoreConnection;
use Closure;
use Illuminate\Http\Request;

class AuthenticatePromotionStore
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        $store = $token ? StoreConnection::where('token_hash', hash('sha256', $token))->where('platform', 'woocommerce')->first() : null;
        abort_unless($store && in_array($store->status, ['pending', 'connected']), 401);
        $advertiser = $store->advertiser;
        abort_unless($advertiser?->status === 'A' && $advertiser->network_id === $store->network_id
            && $advertiser->network?->status === 'A' && $advertiser->user?->status === 'A'
            && $advertiser->user?->hasVerifiedEmail() && ! $advertiser->user?->closed_at, 403);
        $request->attributes->set('promotion_store', $store);

        return $next($request);
    }
}
