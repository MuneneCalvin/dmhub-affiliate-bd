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

it('keeps an advertiser verified and listed when it is deactivated from the readiness card', function () {
    $this->withoutVite();
    $f = conversionFixture();
    $f['advertiser']->update(['is_verified' => true]);
    $operator = cardOperator($f, ['view_advertisers', 'manage_advertisers', 'approve_advertisers']);
    $url = route('advertisers.cards.update', ['id' => $f['advertiser']->user_id, 'card' => 'readiness']);
    $this->actingAs($operator)->patch($url, ['status' => 'P'])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh())->status->toBe('P')->is_verified->toBeTrue();
    $this->get(route('advertisers.index'))->assertOk()->assertInertia(fn ($page) => $page
        ->has('advrts.data', 1)->where('advrts.data.0.id', $f['advertiser']->id)->where('advrts.data.0.status', 'D'));
    $this->patch($url, ['status' => 'A'])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh())->status->toBe('A')->is_verified->toBeTrue();
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
    $this->patch($route('site'), ['business_name' => 'Updated company', 'website_url' => 'https://injected.example'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->business_name)->toBe('Updated company')
        ->and($f['publisher']->fresh()->website_url)->toBe('https://publisher.example');
    $this->patch($route('payout'), [])->assertForbidden();
    $owner->givePermissionTo('manage_payouts');
    $this->patch($route('payout'), ['payout_threshold' => '30.00', 'payout_method' => 'bank_transfer'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->payout_threshold)->toBe('30.00');
});

it('lets advertisers edit their own company without administrative privileges', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $owner = $f['advertiser']->user;
    $owner->assignRoleById(Role::findByName('advertiser')->id);
    $url = route('advertisers.cards.update', ['id' => $owner->id, 'card' => 'business']);
    $back = route('profile.edit');
    $data = ['business_name' => 'My updated company', 'industry' => 'Travel',
        'website_name' => 'https://company.example', 'coc_number' => '12345678',
        'network_id' => $foreign['network']->id, 'available_budget' => 99999,
        'is_verified' => true, 'status' => 'P', 'credit_limit' => 99999];
    $this->actingAs($owner)->from($back)->patch($url, $data)->assertRedirect($back)->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->business_name)->toBe('My updated company')
        ->and($f['advertiser']->fresh()->coc_number)->toBe('12345678')
        ->and($f['advertiser']->fresh()->network_id)->toBe($f['network']->id)
        ->and($f['advertiser']->fresh()->available_budget)->toBe('1000.00')
        ->and($f['advertiser']->fresh()->status)->toBe('A')
        ->and($f['advertiser']->fresh()->credit_limit)->toBe('0.00');
    $this->patch(route('advertisers.cards.update', ['id' => $foreign['advertiser']->user_id, 'card' => 'business']), $data)->assertNotFound();
    $this->patch(route('advertisers.cards.update', ['id' => $owner->id, 'card' => 'readiness']), ['status' => 'P'])->assertForbidden();
    $this->patch($url, [...$data, 'website_name' => 'javascript:alert(1)', 'coc_number' => str_repeat('1', 11)])
        ->assertSessionHasErrors(['website_name', 'coc_number']);
});

it('exposes company editing in profile settings for both partner roles', function (string $kind) {
    $f = conversionFixture();
    $owner = $f[$kind]->user;
    $owner->assignRoleById(Role::findByName($kind)->id);
    $id = $kind === 'advertiser' ? $owner->id : $f[$kind]->id;
    $url = route($kind.'s.cards.update', ['id' => $id, 'card' => 'business']);
    $this->actingAs($owner)->get(route('settings.company'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('settings/company')->has('companies', 1)
        ->where('companies.0.kind', $kind)->where('companies.0.updateUrl', $url));
    $data = ['business_name' => 'Company from settings', 'industry' => 'Travel', 'coc_number' => '98765432',
        $kind === 'advertiser' ? 'website_name' : 'website_url' => 'https://company.example'];
    $this->from(route('profile.edit'))->patch($url, $data)->assertRedirect(route('profile.edit'))->assertSessionHasNoErrors();
    $this->actingAs($owner->fresh())->get(route('settings.company'))->assertInertia(fn (Assert $page) => $page
        ->where('companies.0.business_name', 'Company from settings')->where('companies.0.website', 'https://company.example'));
    $foreign = conversionFixture();
    $foreign[$kind]->update(['coc_number' => '11111111']);
    $this->patch($url, [...$data, 'business_name' => 'Must not save', 'coc_number' => '11111111'])->assertSessionHasErrors('coc_number');
    expect($f[$kind]->fresh()->business_name)->toBe('Company from settings');
})->with(['advertiser', 'publisher']);

it('keeps deactivated publishers in the list so they can be found and reactivated', function () {
    $this->withoutVite();
    $f = conversionFixture();
    $f['publisher']->update(['is_verified' => true]);
    $admin = User::factory()->create(['is_super_admin' => true]);
    $inactive = fn ($page) => $page->where('statusCounts.inactive', 1)->has('pbshers.data', 1)
        ->where('pbshers.data.0.id', $f['publisher']->id)->where('pbshers.data.0.status', 'P');
    $this->actingAs($admin)->post(route('publishers.deactivate', $f['publisher']->id))->assertSessionHas('success');
    expect($f['publisher']->fresh())->is_verified->toBeTrue()->and($f['publisher']->user->fresh()->status)->toBe('P');
    $this->get(route('publishers.index'))->assertOk()->assertInertia($inactive);
    $this->get(route('publishers.index', ['status' => 'inactive']))->assertInertia($inactive);
    $this->post(route('publishers.activate', $f['publisher']->id))->assertSessionHas('success');
    $this->get(route('publishers.index'))->assertInertia(fn ($page) => $page->where('statusCounts.active', 1)->where('statusCounts.inactive', 0));
    // The status toggle and the readiness card must behave the same way.
    $this->post(route('publishers.change.status', $f['publisher']->id))->assertSessionHas('success');
    expect($f['publisher']->fresh()->is_verified)->toBeTrue()->and($f['publisher']->user->fresh()->status)->toBe('P');
    $this->get(route('publishers.index'))->assertInertia($inactive);
    $this->post(route('publishers.change.status', $f['publisher']->id))->assertSessionHas('success');
    expect($f['publisher']->user->fresh()->status)->toBe('A');
    $this->patch(route('publishers.cards.update', ['id' => $f['publisher']->id, 'card' => 'readiness']), ['status' => 'P'])->assertSessionHasNoErrors();
    expect($f['publisher']->fresh()->is_verified)->toBeTrue();
    $this->get(route('publishers.index'))->assertInertia($inactive);
});
