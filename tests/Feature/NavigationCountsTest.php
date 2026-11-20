<?php

use App\Models\FraudAssessment;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
});

/** One pending application and one earning flagged for manual review in the fixture's network. */
function navCountsFixture(): array
{
    $f = conversionFixture();
    $applicant = Publisher::create(['user_id' => User::factory()->create(['is_publisher' => true])->id,
        'network_id' => $f['network']->id, 'website_url' => 'https://applicant.example']);
    PublisherCampaigns::create(['publisher_id' => $applicant->id, 'network_id' => $f['network']->id,
        'campaign_id' => $f['campaign']->id, 'offer_id' => $f['offer']->id, 'status' => 'P',
        'commission_type' => 'CPL', 'commission_value' => '10.00']);
    $earning = PublisherEarning::create(['publisher_id' => $f['publisher']->id, 'network_id' => $f['network']->id,
        'publisher_campaign_id' => $f['assignment']->id, 'amount' => '25.00', 'currency' => 'USD',
        'commission_type' => 'CPL', 'status' => 'pending']);
    FraudAssessment::create(['earning_id' => $earning->id, 'network_id' => $f['network']->id,
        'campaign_id' => $f['campaign']->id, 'status' => 'completed', 'recommendation' => 'manual_review', 'currency' => 'USD']);
    // A cleared earning must not count.
    $cleared = PublisherEarning::create(['publisher_id' => $f['publisher']->id, 'network_id' => $f['network']->id,
        'publisher_campaign_id' => $f['assignment']->id, 'amount' => '5.00', 'currency' => 'USD',
        'commission_type' => 'CPL', 'status' => 'pending']);
    FraudAssessment::create(['earning_id' => $cleared->id, 'network_id' => $f['network']->id,
        'campaign_id' => $f['campaign']->id, 'status' => 'completed', 'recommendation' => 'approve', 'currency' => 'USD']);

    return $f;
}

function navCountsNetworkUser(array $f, string $role = 'network_owner'): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->assignRoleById(Role::findByName($role)->id);

    return $user;
}

function navCountsOf(User $user)
{
    return test()->actingAs($user)->get(route('profile.edit'))->assertOk();
}

it('gives network owners their own network counts', function () {
    $own = navCountsFixture();
    navCountsFixture();

    navCountsOf(navCountsNetworkUser($own))->assertInertia(fn (Assert $page) => $page
        ->where('navCounts.pendingApplications', 1)
        ->where('navCounts.fraudFlags', 1));
});

it('gives super admins platform-wide counts', function () {
    navCountsFixture();
    navCountsFixture();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $admin->assignRoleById(Role::findByName('super_admin')->id);

    navCountsOf($admin)->assertInertia(fn (Assert $page) => $page
        ->where('navCounts.pendingApplications', 2)
        ->where('navCounts.fraudFlags', 2));
});

it('hides counts from publishers and advertisers', function () {
    $f = navCountsFixture();
    $publisher = $f['publisher']->user;
    $publisher->assignRoleById(Role::findByName('publisher')->id);
    $advertiser = $f['advertiser']->user;
    $advertiser->assignRoleById(Role::findByName('advertiser')->id);

    foreach ([$publisher, $advertiser] as $user) {
        navCountsOf($user)->assertInertia(fn (Assert $page) => $page
            ->where('navCounts.pendingApplications', null)
            ->where('navCounts.fraudFlags', null));
    }
});

it('only counts what a partial network role may review', function () {
    $f = navCountsFixture();
    $role = Role::create(['name' => 'finance_reviewer', 'guard_name' => 'web']);
    $role->givePermissionTo(Permission::findByName('review_commissions'));

    navCountsOf(navCountsNetworkUser($f, 'finance_reviewer'))->assertInertia(fn (Assert $page) => $page
        ->where('navCounts.pendingApplications', null)
        ->where('navCounts.fraudFlags', 1));
});
