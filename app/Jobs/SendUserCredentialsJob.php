<?php

namespace App\Jobs;

use App\Mail\UserCredentialsMail;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;

class SendUserCredentialsJob implements ShouldQueue
{
    use Queueable;

    public User $user;

    public ?string $networkName;

    public function __construct(User $user, ?string $networkName = null)
    {
        $this->user = $user;
        $this->networkName = $networkName;
    }

    public function handle(): void
    {
        if ($this->user->closed_at !== null) {
            return;
        }
        // Create the expiring, one-use token only while delivering the message.
        $token = Password::broker()->createToken($this->user);
        $setupUrl = url(route('password.reset', ['token' => $token, 'email' => $this->user->email], false));
        Mail::to($this->user->email)->send(
            new UserCredentialsMail($this->user, $setupUrl, $this->networkName)
        );
    }
}
