<?php

use App\Models\PublisherCampaigns;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
    $this->fixture = conversionFixture();
    $this->user = $this->fixture['publisher']->user;
    $this->user->givePermissionTo(['access_publisher_dashboard', 'view_embeded_scripts']);
    $this->actingAs($this->user);
});

function scriptsPageAssignment(array $fixture, string $status): PublisherCampaigns
{
    $campaign = $fixture['campaign']->replicate(['name']);
    $campaign->name = fake()->uuid();
    $campaign->save();
    $offer = $fixture['offer']->replicate();
    $offer->campaign_id = $campaign->id;
    $offer->save();

    return PublisherCampaigns::create([...$fixture['assignment']->only(['publisher_id', 'network_id',
        'commission_type', 'commission_value']), 'campaign_id' => $campaign->id, 'offer_id' => $offer->id,
        'status' => $status, 'tracking_link' => url('/t/'.fake()->uuid())]);
}

it('lists active scripts oldest first with install status and real usage', function () {
    $assignment = $this->fixture['assignment'];
    $second = scriptsPageAssignment($this->fixture, 'A');
    scriptsPageAssignment($this->fixture, 'P');
    $assignment->forceFill(['script_impressions' => 3])->save();
    conversionClick($this->fixture);
    $click = conversionClick($this->fixture);

    $this->get(route('publisher.scripts'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('publisher/scripts/index')
        ->has('campaigns', 2)
        ->where('campaigns.0.id', $assignment->id)
        ->where('campaigns.0.install_status', 'installed')
        ->where('campaigns.0.script_loads', 3)
        ->where('campaigns.0.clicks', 2)
        ->where('campaigns.0.last_click_at', $click->clicked_at->toIso8601String())
        ->where('campaigns.0.tracking_link', $assignment->tracking_link)
        ->has('campaigns.0.embed_tag')
        ->where('campaigns.1.id', $second->id)
        ->where('campaigns.1.install_status', 'not_seen')
        ->where('campaigns.1.clicks', 0)
        ->where('campaigns.1.last_click_at', null));
});

it('shows one script with the same status data and hides other publishers scripts', function () {
    $assignment = $this->fixture['assignment'];
    $this->get(route('publisher.scripts.show', $assignment->id))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('publisher/scripts/show')
        ->where('script.id', $assignment->id)
        ->where('script.install_status', 'not_seen')
        ->where('script.script_loads', 0)
        ->has('script.sdk_config'));

    $foreign = conversionFixture();
    $this->get(route('publisher.scripts.show', $foreign['assignment']->id))->assertRedirect(route('publisher.scripts'));
});
