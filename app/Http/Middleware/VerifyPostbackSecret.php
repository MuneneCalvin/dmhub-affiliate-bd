<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyPostbackSecret
{
    /**
     * Postbacks create leads and change conversion state, so they must carry the shared secret
     * (X-Postback-Secret header or `secret` parameter). Fails closed when no secret is configured.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.postback.secret');

        if ($expected === '') {
            return response()->json([
                'success' => false,
                'error' => 'Postback endpoint is not configured.',
            ], 503);
        }

        $provided = (string) ($request->header('X-Postback-Secret') ?? $request->input('secret', ''));

        if (! hash_equals($expected, $provided)) {
            return response()->json([
                'success' => false,
                'error' => 'Invalid postback secret.',
            ], 401);
        }

        return $next($request);
    }
}
