<?php

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use App\Support\PendingPartners;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $mk = fn (string $name) => Network::forceCreate(['network_name' => $name, 'owner_email' => $name.'@example.nl', 'status' => 'A', 'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $this->own = $mk('own');
    $this->foreign = $mk('foreign');
    $this->operator = User::factory()->create(['is_network' => true, 'status' => 'A']);
    UserNetworks::create(['user_id' => $this->operator->id, 'network_id' => $this->own->id]);
    $this->operator->assignRoleById(Role::findByName('network_owner')->id);
    $this->admin = User::factory()->create(['is_super_admin' => true, 'status' => 'A']);
    $this->admin->assignRoleById(Role::findByName('super_admin')->id);

    $partner = fn (string $kind, ?int $network, array $partner = [], array $user = []) => ($kind === 'advertiser'
        ? Advertiser::create(array_merge(['user_id' => User::factory()->create(array_merge(['status' => 'P'], $user))->id, 'business_name' => 'X', 'website_name' => 'https://x.nl', 'industry' => 'finance', 'currency' => 'EUR', 'status' => 'P', 'is_verified' => false, 'network_id' => $network], $partner))
        : Publisher::create(array_merge(['user_id' => User::factory()->create(array_merge(['status' => 'P'], $user))->id, 'business_name' => 'X', 'website_url' => 'https://x.nl', 'is_verified' => false, 'network_id' => $network], $partner)));
    $partner('publisher', null);                       // unclaimed: everyone who approves sees it
    $partner('publisher', $this->own->id);             // own network
    $partner('publisher', $this->foreign->id);         // another network
    $partner('advertiser', null);
    $partner('advertiser', $this->foreign->id);
    $partner('publisher', $this->own->id, ['is_verified' => true]);   // already approved
    $partner('publisher', null, [], ['status' => 'R']);               // rejected: nothing left to do
});

it('counts what an approver can act on, within their own scope', function () {
    expect(PendingPartners::counts($this->operator))->toBe(['advertisers' => 1, 'publishers' => 2, 'total' => 3])
        ->and(PendingPartners::counts($this->admin))->toBe(['advertisers' => 2, 'publishers' => 3, 'total' => 5]);
});

it('leaves out only the rejected partners the pool still lists', function () {
    $counts = PendingPartners::counts($this->operator);

    // The pool lists 3 publishers and 1 advertiser for this approver; one publisher was rejected.
    $this->actingAs($this->operator)->get(route('networks.pool.publishers'))
        ->assertInertia(fn ($page) => $page->where('publishers.total', $counts['publishers'] + 1));
    $this->actingAs($this->operator)->get(route('networks.pool.advertisers'))
        ->assertInertia(fn ($page) => $page->where('advertisers.total', $counts['advertisers']));
});

it('shares the count as a sidebar badge with approvers only', function () {
    $this->actingAs($this->operator)->get(route('network.dashboard'))
        ->assertInertia(fn ($page) => $page->where('navCounts.pendingPartners', 3));

    $publisher = User::factory()->create(['is_publisher' => true, 'status' => 'A']);
    $publisher->assignRoleById(Role::findByName('publisher')->id);
    Publisher::create(['user_id' => $publisher->id, 'business_name' => 'P', 'website_url' => 'https://p.nl', 'is_verified' => true]);
    $this->actingAs($publisher)->get(route('publisher.dashboard'))
        ->assertInertia(fn ($page) => $page->where('navCounts.pendingPartners', null));
});

it('hands both dashboards the same counts', function () {
    $this->actingAs($this->operator)->get(route('network.dashboard'))
        ->assertInertia(fn ($page) => $page->where('pendingPartners', ['advertisers' => 1, 'publishers' => 2, 'total' => 3]));
    $this->actingAs($this->admin)->get(route('admin.dashboard'))
        ->assertInertia(fn ($page) => $page->where('pendingPartners', ['advertisers' => 2, 'publishers' => 3, 'total' => 5]));
});

it('lowers the count once a partner is approved', function () {
    $publisher = Publisher::where('network_id', $this->own->id)->where('is_verified', false)->firstOrFail();

    $this->actingAs($this->operator)->post(route('networks.pool.publishers.approve', $publisher->id));

    expect(PendingPartners::counts($this->operator)['publishers'])->toBe(1);
});

it('shows the awaiting page its explanation for pending and rejected partners', function () {
    $pending = User::factory()->create(['status' => 'P']);
    $rejected = User::factory()->create(['status' => 'R']);

    $this->actingAs($pending)->get('/wait-for-approval')->assertOk()
        ->assertInertia(fn ($page) => $page->component('errorpages/wait_approval')->where('status', 'P'));
    $this->actingAs($rejected)->get('/wait-for-approval')->assertOk()
        ->assertInertia(fn ($page) => $page->where('status', 'R'));
});
