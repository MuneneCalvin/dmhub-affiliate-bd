<?php

use App\Mail\UserCredentialsMail;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

// Partners confirm their address by choosing a password from one setup email, not a separate verification mail.
test('sends the setup email instead of a separate verification notification', function () {
    Notification::fake();
    Mail::fake();

    $user = User::factory()->create([
        'email_verified_at' => null,
    ]);

    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertRedirect(route('home'));

    Mail::assertSent(UserCredentialsMail::class, fn ($mail) => $mail->hasTo($user->email));
    Notification::assertNotSentTo($user, VerifyEmail::class);
});

test('does not send verification notification if email is verified', function () {
    Notification::fake();
    Mail::fake();

    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertRedirect(route('dashboard', absolute: false));

    Notification::assertNothingSent();
    Mail::assertNothingSent();
});
