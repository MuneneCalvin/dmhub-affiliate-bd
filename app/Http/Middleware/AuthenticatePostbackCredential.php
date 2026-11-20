<?php

namespace App\Http\Middleware;

use App\Models\PostbackCredential;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatePostbackCredential
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if($request->query->count() > 0, 422, 'Postback data must be sent in the request body.');
        // Body/query credentials and the former global secret are never accepted.
        $token = $request->bearerToken();
        $credential = $token ? PostbackCredential::where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')->where('expires_at', '>', now())
            ->with(['advertiser.user', 'advertiser.network'])->first() : null;
        if (! $credential) {
            return response()->json(['success' => false, 'error' => 'Invalid postback credential.'], 401);
        }
        $advertiser = $credential->advertiser;
        abort_unless($advertiser?->status === 'A' && $advertiser->user?->status === 'A'
            && $advertiser->user?->closed_at === null && $advertiser->user?->hasVerifiedEmail()
            && $advertiser->network?->status === 'A', 403);
        $request->attributes->set('postback_advertiser_id', $advertiser->id);
        $request->attributes->set('postback_credential_id', $credential->id);

        return $next($request);
    }
}
