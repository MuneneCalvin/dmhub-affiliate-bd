<?php

use App\Mail\UserCredentialsMail;
use App\Models\Network;
use App\Models\User;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\Models\Role;

function registrationInput(array $override = []): array
{
    return array_merge([
        'first_name' => 'Anna', 'last_name' => 'de Vries', 'role_name' => 'publisher', 'email' => 'anna@example.nl',
        'publisher_type' => 'company', 'channels' => [['type' => 'website', 'handle' => 'https://publisher.example.test']],
        'coc_number' => '12345678', 'business_name' => 'Voorbeeld BV', 'website_name' => 'https://voorbeeld.example.nl',
        'industry' => 'retail',
    ], $override);
}

function setupLink(UserCredentialsMail $mail): array
{
    parse_str(parse_url($mail->setupUrl, PHP_URL_QUERY), $query);

    return ['token' => basename(parse_url($mail->setupUrl, PHP_URL_PATH)), 'email' => $query['email']];
}

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
    Mail::fake();
    Notification::fake();
});

it('sends one setup email and no framework verification mail when a partner registers', function () {
    $this->post(route('register.store'), registrationInput())->assertSessionHasNoErrors();

    Mail::assertSent(UserCredentialsMail::class, 1);
    Mail::assertSent(UserCredentialsMail::class, fn ($mail) => $mail->hasTo('anna@example.nl'));
    Notification::assertNothingSent();
});

it('signs the partner in and shows the awaiting approval page', function () {
    $this->post(route('register.store'), registrationInput());

    $this->assertAuthenticated();
    $this->get('/dashboard')->assertStatus(403)
        ->assertInertia(fn ($page) => $page->component('errorpages/wait_approval')->where('status', 'P'));
});

it('writes the setup email in Dutch for a visitor who chose Dutch', function () {
    $this->withUnencryptedCookie('locale', 'nl')->post(route('register.store'), registrationInput());

    Mail::assertSent(UserCredentialsMail::class, function ($mail) {
        $mail->assertHasSubject('Kies uw wachtwoord voor '.config('app.name'));
        $mail->assertSeeInHtml('Wachtwoord kiezen');
        $mail->assertSeeInHtml('Wij beoordelen uw aanvraag');

        return true;
    });
});

it('writes the setup email in English for a visitor who chose English', function () {
    $this->withUnencryptedCookie('locale', 'en')->post(route('register.store'), registrationInput());

    Mail::assertSent(UserCredentialsMail::class, function ($mail) {
        $mail->assertHasSubject('Choose your password for '.config('app.name'));

        return true;
    });
    expect(User::where('email', 'anna@example.nl')->value('locale'))->toBe('en');
});

it('writes the setup email in English for a partner whose language is English', function () {
    $user = User::factory()->unverified()->create(['locale' => 'en', 'status' => 'P']);

    $user->sendEmailVerificationNotification();

    Mail::assertSent(UserCredentialsMail::class, function ($mail) {
        $mail->assertHasSubject('Choose your password for '.config('app.name'));
        $mail->assertSeeInHtml('Choose password');
        $mail->assertSeeInHtml('We are reviewing your application');

        return true;
    });
});

it('does not mention a review when an administrator created the account', function () {
    $user = User::factory()->unverified()->create(['locale' => 'nl', 'status' => 'A']);

    $user->sendEmailVerificationNotification();

    Mail::assertSent(UserCredentialsMail::class, function ($mail) {
        $mail->assertDontSeeInHtml('Wij beoordelen uw aanvraag');
        $mail->assertSeeInHtml('Wachtwoord kiezen');

        return true;
    });
});

it('verifies the address when the password is chosen from the emailed link', function () {
    $user = User::factory()->unverified()->create(['status' => 'P']);
    $token = Password::broker()->createToken($user);
    expect($user->email_verified_at)->toBeNull();

    $this->post(route('password.update'), ['token' => $token, 'email' => $user->email, 'password' => 'secure-new-password', 'password_confirmation' => 'secure-new-password'])
        ->assertSessionHasNoErrors();

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

it('keeps an existing verification time when a password is reset', function () {
    $user = User::factory()->create(['email_verified_at' => now()->subYear()]);
    $before = $user->email_verified_at;
    $token = Password::broker()->createToken($user);

    $this->post(route('password.update'), ['token' => $token, 'email' => $user->email, 'password' => 'secure-new-password', 'password_confirmation' => 'secure-new-password'])
        ->assertSessionHasNoErrors();

    expect($user->fresh()->email_verified_at->equalTo($before))->toBeTrue();
});

it('resends the setup email to an unverified partner and nothing to a verified one', function () {
    $unverified = User::factory()->unverified()->create(['status' => 'P']);

    $this->actingAs($unverified)->post(route('verification.send'));
    Mail::assertSent(UserCredentialsMail::class, 1);

    $verified = User::factory()->create();
    $this->actingAs($verified)->post(route('verification.send'));
    Mail::assertSent(UserCredentialsMail::class, 1);
    Notification::assertNothingSent();
});

it('still sends exactly one setup email when an administrator creates a publisher', function () {
    $network = Network::forceCreate(['network_name' => 'Net', 'owner_email' => 'owner@example.nl', 'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'status' => 'A']);
    $admin = User::factory()->create(['is_super_admin' => true, 'status' => 'A']);
    $admin->assignRoleById(Role::findByName('super_admin')->id);

    $this->actingAs($admin)->post(route('publishers.store'), [
        'first_name' => 'Pieter', 'last_name' => 'Jansen', 'email' => 'pieter@example.nl', 'title' => 'Owner',
        'network_id' => $network->id, 'currency_code' => 'EUR',
    ])->assertSessionHasNoErrors();

    Mail::assertSent(UserCredentialsMail::class, 1);
    Mail::assertSent(UserCredentialsMail::class, fn ($mail) => $mail->hasTo('pieter@example.nl'));
});

it('lets a partner who is still signed in open the emailed link and choose a password', function () {
    $this->post(route('register.store'), registrationInput());
    $this->assertAuthenticated();
    $link = null;
    Mail::assertSent(UserCredentialsMail::class, function ($mail) use (&$link) {
        $link = setupLink($mail);

        return true;
    });

    $this->get(route('password.reset', $link))->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/reset-password'));
    $this->assertGuest();

    $this->post(route('password.update'), $link + ['password' => 'secure-new-password', 'password_confirmation' => 'secure-new-password'])
        ->assertSessionHasNoErrors();
    expect(User::where('email', 'anna@example.nl')->first()->email_verified_at)->not->toBeNull();
});

it('leaves other signed-in pages alone', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('login'))->assertRedirect();
    $this->assertAuthenticatedAs($user);
});
