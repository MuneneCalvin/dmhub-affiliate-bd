<?php

use App\Mail\PartnerApprovedMail;
use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    Mail::fake();
    $this->network = Network::forceCreate(['network_name' => 'BND', 'owner_email' => 'bnd@example.nl', 'status' => 'A', 'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $this->operator = User::factory()->create(['is_network' => true, 'status' => 'A']);
    UserNetworks::create(['user_id' => $this->operator->id, 'network_id' => $this->network->id]);
    $this->operator->assignRoleById(Role::findByName('network_owner')->id);
});

function pendingPartner(string $kind, array $user = [], array $partner = []): Advertiser|Publisher
{
    $owner = User::factory()->create(array_merge(['status' => 'P', 'locale' => 'nl'], $user));
    $base = ['user_id' => $owner->id, 'business_name' => 'Pending BV', 'is_verified' => false, 'network_id' => null];

    return $kind === 'advertiser'
        ? Advertiser::create(array_merge($base, ['website_name' => 'https://p.example.nl', 'industry' => 'finance', 'currency' => 'EUR', 'status' => 'P'], $partner))
        : Publisher::create(array_merge($base, ['website_url' => 'https://p.example.nl'], $partner));
}

it('emails a pending partner once when the pool approves them', function (string $kind) {
    $partner = pendingPartner($kind);

    $this->actingAs($this->operator)->post(route("networks.pool.{$kind}s.approve", $partner->id))->assertSessionHasNoErrors();

    Mail::assertSent(PartnerApprovedMail::class, 1);
    Mail::assertSent(PartnerApprovedMail::class, fn ($mail) => $mail->hasTo($partner->user->email));

    $this->actingAs($this->operator)->post(route("networks.pool.{$kind}s.approve", $partner->id));
    Mail::assertSent(PartnerApprovedMail::class, 1);
})->with(['advertiser', 'publisher']);

it('writes the approved email in the partner\'s language', function (string $locale, string $subject, string $text) {
    $partner = pendingPartner('publisher', ['locale' => $locale]);

    $this->actingAs($this->operator)->post(route('networks.pool.publishers.approve', $partner->id));

    Mail::assertSent(PartnerApprovedMail::class, function ($mail) use ($subject, $text) {
        $mail->assertHasSubject($subject.' '.config('app.name'));
        $mail->assertSeeInHtml($text);

        return true;
    });
})->with([
    'dutch' => ['nl', 'Uw account is goedgekeurd bij', 'Inloggen'],
    'english' => ['en', 'Your account has been approved at', 'Log in'],
]);

it('emails a publisher whose approval comes from the publisher status switch', function () {
    $admin = User::factory()->create(['is_super_admin' => true, 'status' => 'A']);
    $admin->assignRoleById(Role::findByName('super_admin')->id);
    $partner = pendingPartner('publisher', [], ['network_id' => $this->network->id]);

    $this->actingAs($admin)->post(route('publishers.change.status', $partner->id));

    Mail::assertSent(PartnerApprovedMail::class, 1);
});

it('does not email when an approved partner is deactivated and reactivated', function () {
    $admin = User::factory()->create(['is_super_admin' => true, 'status' => 'A']);
    $admin->assignRoleById(Role::findByName('super_admin')->id);
    $partner = pendingPartner('publisher', ['status' => 'A'], ['network_id' => $this->network->id, 'is_verified' => true, 'verified_at' => now()]);

    $this->actingAs($admin)->post(route('publishers.change.status', $partner->id));
    $this->actingAs($admin)->post(route('publishers.change.status', $partner->id));

    expect($partner->user->fresh()->status)->toBe('A');
    Mail::assertNothingSent();
});

it('does not email a partner an administrator created as already approved', function () {
    $partner = pendingPartner('publisher', ['status' => 'A'], ['is_verified' => true, 'verified_at' => now(), 'network_id' => $this->network->id]);

    expect($partner->exists)->toBeTrue();
    Mail::assertNothingSent();
});

it('does not email a rejected partner', function () {
    $partner = pendingPartner('publisher');

    $this->actingAs($this->operator)->post(route('networks.pool.publishers.reject', $partner->id));

    Mail::assertNothingSent();
});

it('does not email a closed account', function () {
    $partner = pendingPartner('publisher', ['closed_at' => now()]);

    $this->actingAs($this->operator)->post(route('networks.pool.publishers.approve', $partner->id));

    Mail::assertNothingSent();
});
