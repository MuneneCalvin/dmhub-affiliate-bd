<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class HandleFinanceErrors
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $response = $next($request);
        } catch (HttpExceptionInterface $exception) {
            if ($request->expectsJson() || ! in_array($exception->getStatusCode(), [409, 422], true)) {
                throw $exception;
            }

            return back()->withErrors(['finance' => $exception->getMessage()]);
        }
        // Laravel's routing pipeline may already have rendered the exception
        // before an outer middleware resumes. Keep those errors in the form too.
        $exception = $response->exception ?? null;
        if (! $request->expectsJson() && $exception instanceof HttpExceptionInterface
            && in_array($response->getStatusCode(), [409, 422], true)) {
            return back()->withErrors(['finance' => $exception->getMessage()]);
        }

        return $response;
    }
}
