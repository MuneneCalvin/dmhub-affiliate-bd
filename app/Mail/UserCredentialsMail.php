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
    public string $password;
    public ?string $networkName;

    public function __construct(User $user, string $password, ?string $networkName = null)
    {
        $this->user = $user;
        $this->password = $password;
        $this->networkName = $networkName;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Account Credentials',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.user-credentials',
            with: [
                'user' => $this->user,
                'password' => $this->password,
                'networkName' => $this->networkName,
                'loginUrl' => config('app.url') . '/login',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
