<?php

use App\Models\Network;
use App\Models\Publisher;
use App\Models\User;
use App\Models\UserNetworks;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->network = Network::forceCreate(['network_name' => 'BND', 'owner_email' => 'bnd@example.nl', 'status' => 'A', 'default_currency' => 'EUR', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => '0.00']);
    $this->operator = User::factory()->create(['is_network' => true, 'status' => 'A']);
    UserNetworks::create(['user_id' => $this->operator->id, 'network_id' => $this->network->id]);
    $this->operator->assignRoleById(Role::findByName('network_owner')->id);
});

function individualPublisher(array $channels): Publisher
{
    $publisher = Publisher::create([
        'user_id' => User::factory()->create(['is_publisher' => true, 'status' => 'P', 'first_name' => 'Anna', 'last_name' => 'de Vries'])->id,
        'publisher_type' => 'individual', 'is_verified' => false,
    ]);
    foreach ($channels as $type => $handle) {
        $publisher->channels()->create(['type' => $type, 'handle' => $handle]);
    }

    return $publisher;
}

it('shows an approver how a new publisher registered and where they promote', function () {
    $publisher = individualPublisher(['instagram' => '@anna.spaart', 'tiktok' => 'https://www.tiktok.com/@anna']);

    $this->actingAs($this->operator)->get(route('networks.pool.publishers.show', $publisher->id))->assertOk()
        ->assertInertia(fn ($page) => $page->component('pool/publisher-show')
            ->where('publisher.publisher_type', 'individual')
            ->where('publisher.business_name', null)
            ->has('publisher.channels', 2)
            ->where('publisher.channels.0.type', 'instagram')
            ->where('publisher.channels.0.handle', '@anna.spaart')
            ->where('publisher.channels.1.type', 'tiktok'));
});

it('gives the publisher workspace the type and the channels too', function () {
    $publisher = individualPublisher(['youtube' => '@anna']);
    $publisher->update(['network_id' => $this->network->id, 'is_verified' => true]);

    $this->actingAs($this->operator)->get(route('publishers.show', $publisher->id))->assertOk()
        ->assertInertia(fn ($page) => $page->where('publisher.publisher_type', 'individual')
            ->where('publisher.channels', [['type' => 'youtube', 'handle' => '@anna']]));
});

it('lists a publisher without a company name or website without breaking anything', function () {
    $publisher = individualPublisher(['instagram' => '@anna']);
    $publisher->update(['network_id' => $this->network->id, 'is_verified' => true]);

    $this->actingAs($this->operator)->get(route('publishers.index'))->assertOk();
    $this->actingAs($this->operator)->get(route('publishers.index', ['term' => 'Anna']))->assertOk();
    $this->actingAs($this->operator)->get(route('networks.pool.publishers'))->assertOk();
});
