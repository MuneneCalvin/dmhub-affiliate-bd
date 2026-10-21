<?php

namespace App\Jobs;

use App\Mail\UserCredentialsMail;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendUserCredentialsJob implements ShouldQueue
{
    use Queueable;

    public User $user;
    public string $password;
    public ?string $networkName;

    public function __construct(User $user, string $password, ?string $networkName = null)
    {
        $this->user = $user;
        $this->password = $password;
        $this->networkName = $networkName;
    }

    public function handle(): void
    {
        Mail::to($this->user->email)->send(
            new UserCredentialsMail($this->user, $this->password, $this->networkName)
        );
    }
}
