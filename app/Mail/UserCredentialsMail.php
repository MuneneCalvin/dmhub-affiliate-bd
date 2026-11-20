<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;

    public string $setupUrl;

    public ?string $networkName;

    public function __construct(User $user, string $setupUrl, ?string $networkName = null)
    {
        $this->user = $user;
        $this->setupUrl = $setupUrl;
        $this->networkName = $networkName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Set up your account',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.user-credentials',
            with: [
                'user' => $this->user,
                'networkName' => $this->networkName,
                'setupUrl' => $this->setupUrl,
                'expiresInMinutes' => config('auth.passwords.users.expire'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
