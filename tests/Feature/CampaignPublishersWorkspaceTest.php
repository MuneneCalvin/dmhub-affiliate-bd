<?php

use App\Models\CommissionType;
use App\Models\OfferCommission;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\PartnerEnrollmentService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture('CPS', '10.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->f['publisher']->update(['business_name' => 'Studio Living', 'traffic_sources' => ['Editorial', 'Newsletter']]);
    $this->f['assignment']->update(['status' => 'R', 'offer_id' => null]);
    $type = CommissionType::firstOrCreate(['name' => 'CPS'], ['nice_name' => 'Cost Per Sale']);
    OfferCommission::create(['offer_id' => $this->f['offer']->id, 'commission_type_id' => $type->id, 'commission_value' => 10]);
    $service = app(PartnerEnrollmentService::class);
    $this->input = ['applied_notes' => 'Weekly interior inspiration.', 'offer_id' => $this->f['offer']->id,
        'terms_accepted' => true, 'terms_version' => $service->version($service->contract($this->f['campaign'], $this->f['offer']))];
    $this->application = $service->apply($this->f['publisher'], $this->f['campaign']->id, $this->input);
    $this->workspaceUrl = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'publishers']);
    $this->reviewUrl = route('campaign.publishers.review', ['campaign' => $this->f['campaign']->id, 'application' => $this->application->id]);
    $this->actingAs($this->manager);
});

it('returns scoped applications, consent, history and review permissions to advertisers', function () {
    conversionFixture();
    $this->get($this->workspaceUrl)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('publisherWorkspace.rows', 1)->where('publisherWorkspace.can_approve', true)->where('publisherWorkspace.can_reject', true)
        ->where('publisherWorkspace.rows.0.name', 'Studio Living')->where('publisherWorkspace.rows.0.status', 'P')
        ->where('publisherWorkspace.rows.0.terms_current', true)->where('publisherWorkspace.rows.0.approval_blocker', null)
        ->where('publisherWorkspace.rows.0.sources', ['Editorial', 'Newsletter'])->has('publisherWorkspace.rows.0.history', 2)
        ->where('publisherWorkspace.rows.0.rates.0.value', fn ($value) => in_array($value, ['10', '10.00'], true)));
});

it('approves the requested offer in place and records the agreed rate and audit event', function () {
    $this->post($this->reviewUrl, ['decision' => 'approve', 'offer_id' => 999])->assertSessionHasNoErrors()
        ->assertRedirect(route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'publishers', 'group' => 'assignments', 'publisher' => $this->application->id]));
    expect($this->application->fresh()->status)->toBe('A')->and($this->application->fresh()->commission_value)->toBe('10.00');
    $this->assertDatabaseHas('partner_enrollment_events', ['publisher_campaign_id' => $this->application->id, 'action' => 'approved']);
    $this->post($this->reviewUrl, ['decision' => 'approve'])->assertSessionHasErrors('offer_id');
});

it('requires a meaningful rejection reason and stores it in history', function () {
    $this->post($this->reviewUrl, ['decision' => 'reject'])->assertSessionHasErrors('rejection_reason');
    $this->post($this->reviewUrl, ['decision' => 'reject', 'rejection_reason' => '  '])->assertSessionHasErrors('rejection_reason');
    $this->post($this->reviewUrl, ['decision' => 'reject', 'rejection_reason' => 'Please clarify sources.'])->assertSessionHasNoErrors();
    expect($this->application->fresh()->status)->toBe('R');
    $this->get($this->workspaceUrl)->assertInertia(fn (Assert $page) => $page
        ->where('publisherWorkspace.rows.0.rejection_reason', 'Please clarify sources.')
        ->where('publisherWorkspace.rows.0.history.2.reason', 'Please clarify sources.'));
});

it('blocks changed terms and allows the publisher to renew consent then be approved', function () {
    $this->f['offer']->update(['terms' => ['No paid search']]);
    $this->get($this->workspaceUrl)->assertInertia(fn (Assert $page) => $page->where('publisherWorkspace.rows.0.terms_current', false)
        ->where('publisherWorkspace.rows.0.approval_blocker', 'The publisher must accept the current terms and compensation for this offer before approval.'));
    $this->post($this->reviewUrl, ['decision' => 'approve'])->assertSessionHasErrors('offer_id');
    $this->actingAs($this->f['publisher']->user)->get(route('publishers.campaign.application', $this->f['campaign']->id))
        ->assertInertia(fn (Assert $page) => $page->where('enrollment.id', $this->application->id)->where('enrollment.applied_notes', $this->input['applied_notes']));
    $service = app(PartnerEnrollmentService::class);
    $this->input['terms_version'] = $service->version($service->contract($this->f['campaign'], $this->f['offer']->fresh()));
    $this->post(route('publishers.campaign.submit.application', $this->f['campaign']->id), $this->input)->assertSessionHasNoErrors();
    $this->actingAs($this->manager)->post($this->reviewUrl, ['decision' => 'approve'])->assertSessionHasNoErrors();
});

it('counts inactive assignments as occupied and refuses approval when full', function () {
    $this->f['campaign']->update(['max_publishers' => 1]);
    $publisher = Publisher::create(['user_id' => User::factory()->create()->id, 'network_id' => $this->f['network']->id]);
    PublisherCampaigns::create(['campaign_id' => $this->f['campaign']->id, 'publisher_id' => $publisher->id, 'network_id' => $this->f['network']->id, 'status' => 'I']);
    $this->get($this->workspaceUrl)->assertInertia(fn (Assert $page) => $page->where('publisherWorkspace.capacity', 1)->has('publisherWorkspace.rows', 2)
        ->where('publisherWorkspace.rows', fn ($rows) => $rows->firstWhere('id', $this->application->id)['approval_blocker'] === 'This campaign has no publisher slots available.'));
    $this->post($this->reviewUrl, ['decision' => 'approve'])->assertSessionHasErrors('offer_id');
});

it('supports network and admin review and denies foreign campaigns and cross-campaign applications', function () {
    $operator = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $operator->id, 'network_id' => $this->f['network']->id]);
    $operator->assignRoleById(Role::findByName('network_owner')->id);
    $this->actingAs($operator)->get($this->workspaceUrl)->assertOk()->assertInertia(fn (Assert $page) => $page->where('publisherWorkspace.can_approve', true));
    $foreign = conversionFixture();
    $this->get(route('advertiser.campaign.show', $foreign['campaign']))->assertNotFound();
    $this->post(route('campaign.publishers.review', ['campaign' => $foreign['campaign']->id, 'application' => $foreign['assignment']->id]), ['decision' => 'approve'])->assertNotFound();
    $this->post(route('campaign.publishers.review', ['campaign' => $this->f['campaign']->id, 'application' => $foreign['assignment']->id]), ['decision' => 'approve'])->assertNotFound();
    $this->actingAs(User::factory()->create(['is_super_admin' => true]))->post($this->reviewUrl, ['decision' => 'approve'])->assertSessionHasNoErrors();
});

it('keeps read-only managers from reviewing and publishers from seeing peers', function () {
    $this->manager->roles()->detach();
    $this->manager->givePermissionTo('view_campaigns');
    $this->get($this->workspaceUrl)->assertInertia(fn (Assert $page) => $page->where('publisherWorkspace.can_approve', false)->where('publisherWorkspace.can_reject', false));
    $this->post($this->reviewUrl, ['decision' => 'approve'])->assertForbidden();
    $this->actingAs($this->f['publisher']->user)->get(route('publishers.my.campaign.show', ['id' => $this->application->id, 'tab' => 'publishers']))
        ->assertInertia(fn (Assert $page) => $page->missing('publisherWorkspace')->has('ownEnrollment.rows', 1)
            ->where('ownEnrollment.can_approve', false)->where('ownEnrollment.capacity', null));
    $this->post($this->reviewUrl, ['decision' => 'approve'])->assertRedirect(route('dashboard'));
});
