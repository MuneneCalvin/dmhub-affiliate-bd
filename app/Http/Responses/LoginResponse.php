<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $user = Auth::user();
        if ($user->is_super_admin) {
            return redirect()->intended('/admin/dashboard');
        }

        if ($user->is_network) {
            return redirect()->intended('/network/dashboard');
        }

        if ($user->is_advertiser) {
            return redirect()->intended('/advertiser/dashboard');
        }

        if ($user->is_publisher) {
            return redirect()->intended('/publisher_dashboard/dashboard');
        }

        return redirect()->intended(config('fortify.home'));
    }
}
