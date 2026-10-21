<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cookie;

class LocaleController extends Controller
{
    public function update(Request $request)
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', 'in:nl,en'],
        ]);

        $locale = $validated['locale'];

        // Update user preference if authenticated
        if ($user = $request->user()) {
            $user->update(['locale' => $locale]);
        }

        // Set session
        session(['locale' => $locale]);

        // Set locale for current request
        App::setLocale($locale);

        // Return with cookie for persistence (1 year)
        return back()->withCookie(Cookie::make('locale', $locale, 60 * 24 * 365));
    }
}
