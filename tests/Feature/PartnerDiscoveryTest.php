<?php

use App\Models\Advertiser;
use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
});

it('searches pool suggestions while preserving network boundaries and verification status', function (string $kind, string $model) {
    $network = Network::forceCreate(['network_name' => 'Own network', 'owner_email' => 'own@example.test', 'status' => 'A', 'default_currency' => 'USD', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $foreign = Network::forceCreate(['network_name' => 'Other network', 'owner_email' => 'other@example.test', 'status' => 'A', 'default_currency' => 'USD', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $operator = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $operator->id, 'network_id' => $network->id]);
    $operator->assignRoleById(Role::findByName('network_owner')->id);
    $records = collect([
        ['network_id' => null, 'is_verified' => false],
        ['network_id' => $network->id, 'is_verified' => false],
        ['network_id' => $foreign->id, 'is_verified' => false],
        ['network_id' => $network->id, 'is_verified' => true],
    ])->map(fn ($attributes) => $model::create([
        'user_id' => User::factory()->create()->id,
        'business_name' => 'Discovery Partner',
        ...($kind === 'advertisers' ? ['website_name' => 'https://partner.test', 'industry' => 'retail', 'currency' => 'USD'] : ['website_url' => 'https://partner.test']),
        ...$attributes,
    ]));

    $url = route("networks.pool.$kind");
    $response = $this->actingAs($operator)->getJson($url.'?term=Discovery')->assertOk()->assertJsonCount(2, 'suggestions');
    expect(collect($response->json('suggestions'))->pluck('id')->all())->toBe($records->take(2)->pluck('id')->all());
    $response->assertJsonPath('suggestions.0.href', route("networks.pool.$kind.show", $records[0]->id));
    expect(array_keys($response->json('suggestions.0')))->toBe(['id', 'name', 'description', 'href']);
    $this->getJson($url.'?term=no-matching-partner')->assertOk()->assertJsonCount(0, 'suggestions');
    $this->getJson($url.'?term='.urlencode($records[0]->user->email))->assertOk()->assertJsonCount(1, 'suggestions');
    $this->getJson($url.'?term[]=invalid')->assertUnprocessable();
})->with([
    ['advertisers', Advertiser::class],
    ['publishers', Publisher::class],
]);

it('limits discovery suggestions and searches beyond the initial results', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    foreach (range(1, 12) as $number) {
        Publisher::create(['user_id' => User::factory()->create()->id, 'business_name' => "Publisher $number", 'website_url' => "https://publisher-$number.test", 'is_verified' => false]);
    }
    $url = route('networks.pool.publishers');
    $this->actingAs($admin)->getJson($url)->assertOk()->assertJsonCount(8, 'suggestions');
    $this->getJson($url.'?term=publisher-12.test')->assertOk()->assertJsonCount(1, 'suggestions')->assertJsonPath('suggestions.0.name', 'Publisher 12');
});

it('does not expose discovery suggestions to partner accounts or guests', function (string $kind) {
    $url = route("networks.pool.$kind");
    $this->getJson($url)->assertUnauthorized();
    $user = User::factory()->create(['is_publisher' => true]);
    $response = $this->actingAs($user)->getJson($url);
    expect($response->status())->toBeIn([302, 403]);
})->with(['advertisers', 'publishers']);
