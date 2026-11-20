<?php

use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
});

function cardOperator(array $f, array $permissions): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->givePermissionTo($permissions);

    return $user;
}

it('edits advertiser business fields without touching money or the current tab', function () {
    $f = conversionFixture();
    $operator = cardOperator($f, ['view_advertisers', 'manage_advertisers']);
    $back = route('advertisers.show', ['id' => $f['advertiser']->user_id, 'tab' => 'overview']);
    $this->actingAs($operator)->from($back)->patch(route('advertisers.cards.update', ['id' => $f['advertiser']->user_id, 'card' => 'business']), [
        'business_name' => 'New business', 'website_name' => 'https://new.example', 'industry' => 'travel', 'coc_number' => '12345',
        'available_budget' => 999999, 'currency' => 'EUR', 'network_id' => 999999, 'total_budget' => 12345,
    ])->assertRedirect($back)->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->business_name)->toBe('New business')
        ->and($f['advertiser']->fresh()->available_budget)->toBe('1000.00')
        ->and($f['advertiser']->fresh()->currency)->toBe('USD')
        ->and($f['advertiser']->fresh()->network_id)->toBe($f['network']->id);
});

it('edits publisher details atomically without requiring unrelated payout fields', function () {
    $f = conversionFixture();
    $this->actingAs(cardOperator($f, ['view_publishers', 'manage_publishers']))
        ->patch(route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => 'details']), [
            'first_name' => 'New', 'last_name' => 'Name', 'business_name' => 'New publisher', 'website_url' => 'https://new.example',
            'industry' => 'travel', 'coc_number' => '34567', 'payout_threshold' => 99999, 'is_verified' => true,
        ])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->business_name)->toBe('New publisher')
        ->and($f['publisher']->user->fresh()->first_name)->toBe('New')
        ->and($f['publisher']->fresh()->payout_threshold)->toBe('0.00')
        ->and($f['publisher']->fresh()->is_verified)->toBeFalse();
});

it('allows owners with site grants to edit traffic but not business identity or another publisher', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $owner = $f['publisher']->user;
    $owner->givePermissionTo(['access_publisher_dashboard', 'manage_publisher_sites']);
    $url = fn ($card, $id = null) => route('publishers.cards.update', ['id' => $id ?? $f['publisher']->id, 'card' => $card]);
    $this->actingAs($owner)->patch($url('site'), ['website_url' => 'https://mine.example', 'business_name' => 'Injected'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->website_url)->toBe('https://mine.example')
        ->and($f['publisher']->fresh()->business_name)->not->toBe('Injected');
    $this->patch($url('traffic'), ['traffic_sources' => "Search\nEmail\nSearch\n", 'monthly_visitors' => 5000,
        'primary_verticals' => 'Travel', 'secondary_verticals' => 'Outdoors'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->traffic_sources)->toBe(['Search', 'Email'])
        ->and($f['publisher']->fresh()->monthly_visitors)->toBe(5000);
    $this->patch($url('details'), [])->assertForbidden();
    $this->patch($url('site', $foreign['publisher']->id), ['website_url' => 'https://mine.example'])->assertNotFound();
    $owner->revokePermissionTo('manage_publisher_sites');
    $this->patch($url('traffic'), [])->assertForbidden();
});

it('checks activation and deactivation grants independently when editing readiness', function () {
    $f = conversionFixture();
    $f['advertiser']->update(['status' => 'P']);
    $f['advertiser']->user->update(['status' => 'P']);
    $operator = cardOperator($f, ['view_advertisers', 'manage_advertisers']);
    $url = route('advertisers.cards.update', ['id' => $f['advertiser']->user_id, 'card' => 'readiness']);
    $this->actingAs($operator)->patch($url, ['status' => 'A'])->assertForbidden();
    $operator->givePermissionTo('approve_advertisers');
    $this->patch($url, ['status' => 'A', 'auto_approve_publishers' => true, 'require_publisher_approval' => false])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->status)->toBe('A')->and($f['advertiser']->user->fresh()->status)->toBe('A')
        ->and($f['advertiser']->fresh()->auto_approve_publishers)->toBeTrue();
    $operator->revokePermissionTo('manage_advertisers');
    $this->patch($url, ['status' => 'P'])->assertForbidden();
    $this->patch($url, ['status' => 'C'])->assertSessionHasErrors('status');
    $this->patch($url, ['status' => 'A', 'auto_approve_publishers' => false])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->auto_approve_publishers)->toBeTrue();
});

it('requires fresh email verification after a profile edit and ignores privilege fields', function () {
    $f = conversionFixture();
    $owner = $f['publisher']->user;
    $owner->assignRoleById(Role::findByName('publisher')->id);
    $url = route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => 'profile']);
    $data = ['first_name' => 'First', 'last_name' => 'Last', 'user_name' => 'new-publisher-name', 'email' => 'new@example.test',
        'title' => 'Editor', 'country_iso' => 'NLD', 'timezone' => 'Europe/Amsterdam', 'language' => 'nl',
        'is_super_admin' => true, 'email_verified_at' => now()->toISOString(), 'password' => 'injected'];
    $hash = $owner->password;
    $this->actingAs($owner)->patch($url, $data)->assertSessionHasNoErrors();
    expect($owner->fresh()->email_verified_at)->toBeNull()->and($owner->fresh()->is_super_admin)->toBeFalse()
        ->and($owner->fresh()->password)->toBe($hash)->and($owner->fresh()->user_name)->toBe('new-publisher-name');
});

it('validates card fields and rejects unauthorized and cross-network changes', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $operator = cardOperator($f, ['view_publishers', 'manage_publishers', 'view_advertisers']);
    $url = route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => 'payout']);
    $this->actingAs($operator)->patch($url, ['payout_threshold' => -1])->assertSessionHasErrors('payout_threshold');
    $this->patch($url, ['payout_threshold' => '25.50', 'payout_method' => 'bank_transfer'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->payout_threshold)->toBe('25.50');
    $this->patch(route('publishers.cards.update', ['id' => $foreign['publisher']->id, 'card' => 'payout']), [])->assertNotFound();
    $this->patch(route('advertisers.cards.update', ['id' => $f['advertiser']->user_id, 'card' => 'business']), [])->assertForbidden();
    $this->get(route('advertisers.show', $f['advertiser']->user_id))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.permissions.edit', false)->where('workspace.permissions.editProfile', false));
    $this->patch(route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => 'roles']), ['is_super_admin' => true])->assertNotFound();
});

it('allows publisher profile grants without silently granting site or payout editing', function () {
    $f = conversionFixture();
    $owner = $f['publisher']->user;
    $owner->givePermissionTo(['access_publisher_dashboard', 'manage_publisher_account']);
    $route = fn ($card) => route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => $card]);
    $this->actingAs($owner)->patch($route('details'), ['first_name' => 'Own', 'last_name' => 'Publisher',
        'business_name' => 'My business', 'website_url' => 'https://injected.example'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->business_name)->toBe('My business')
        ->and($f['publisher']->fresh()->website_url)->toBe('https://publisher.example');
    $this->patch($route('site'), [])->assertForbidden();
    $this->patch($route('payout'), [])->assertForbidden();
    $owner->givePermissionTo('manage_payouts');
    $this->patch($route('payout'), ['payout_threshold' => '30.00', 'payout_method' => 'bank_transfer'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->payout_threshold)->toBe('30.00');
});
