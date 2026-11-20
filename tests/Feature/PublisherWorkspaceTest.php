<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\LedgerService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
});

function publisherWorkspaceOwner(array $f): User
{
    $user = $f['publisher']->user;
    $user->assignRoleById(Role::findByName('publisher')->id);

    return $user;
}

function publisherWorkspaceOperator(array $f): User
{
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->assignRoleById(Role::findByName('network_owner')->id);

    return $user;
}

function publisherWorkspaceInvoice(array $f, array $overrides = []): PublisherInvoice
{
    return PublisherInvoice::create(['publisher_id' => $f['publisher']->id, 'network_id' => $f['network']->id,
        'amount' => '25.00', 'currency' => 'USD', 'status' => 'pending',
        'period_start' => now()->subMonth()->toDateString(), 'period_end' => now()->toDateString(),
        ...$overrides]);
}

function publisherWorkspaceEarning(array $f, array $overrides = []): PublisherEarning
{
    $recorded = ! array_key_exists('ledger_transaction_id', $overrides) || $overrides['ledger_transaction_id'] !== null;
    $earning = PublisherEarning::create(['publisher_id' => $f['publisher']->id, 'network_id' => $f['network']->id,
        'publisher_campaign_id' => $f['assignment']->id, 'amount' => '25.00', 'currency' => 'USD',
        'commission_type' => 'CPL', 'status' => 'pending', ...$overrides]);
    if ($recorded) {
        $minor = (int) round((float) $earning->amount * 100) - $earning->reversed_minor;
        $transaction = app(LedgerService::class)->post($earning->network_id, $earning->currency, 'workspace:'.Str::uuid(),
            'commission', 'earning', $earning->id, null, [],
            [['advertiser', $f['advertiser']->id, -$minor], [$earning->status === 'approved' ? 'publisher_available' : 'publisher_pending', $earning->publisher_id, $minor]]);
        $earning->update(['ledger_transaction_id' => $transaction]);
    }

    return $earning;
}

it('opens the owner workspace with authorized tools and only their records', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $user = publisherWorkspaceOwner($own);
    publisherWorkspaceEarning($own);
    publisherWorkspaceEarning($foreign);
    $invoice = publisherWorkspaceInvoice($own);
    publisherWorkspaceInvoice($foreign);
    $url = route('publishers.show', $own['publisher']);
    $this->actingAs($user)->get(route('publisher.account'))->assertRedirect($url);
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page->component('publishers/show')
        ->where('workspace.permissions.owner', true)->where('workspace.permissions.edit', false)
        ->where('workspace.permissions.requestPayout', true)->where('workspace.permissions.settings', true)
        ->where('workspace.permissions.changeNetwork', false)->where('workspace.summary.activeCampaigns', 1)
        ->missing('publisher.password')->missing('publisher.two_factor_secret')->missing('publisher.total_earnings')
        ->has('networks', 0)->has('currencies', 0));
    $this->get($url.'?tab=campaigns')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.assignments.data', 1)->where('workspace.assignments.data.0.id', $own['assignment']->id)
        ->where('workspace.assignments.data.0.campaign_href', route('publishers.my.campaign.show', $own['assignment'])));
    $this->get($url.'?tab=tracking')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.assignments.data.0.tracking_href', route('publisher.scripts.show', $own['assignment']))
        ->missing('workspace.assignments.data.0.script_token'));
    $this->get($url.'?tab=earnings')->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.earnings.data', 1));
    $this->get($url.'?tab=invoices')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.invoices.data', 1)->where('workspace.invoices.data.0.href', route('publisher.invoices.show', $invoice)));
    $this->get(route('publishers.show', $foreign['publisher']))->assertNotFound();
});

it('scopes network staff to their own network including historical records on the same publisher', function () {
    $own = conversionFixture();
    $foreign = conversionFixture();
    $foreignAssignment = $foreign['assignment']->replicate();
    $foreignAssignment->publisher_id = $own['publisher']->id;
    $foreignAssignment->tracking_link = null;
    $foreignAssignment->script_token = null;
    $foreignAssignment->save();
    publisherWorkspaceEarning($own);
    publisherWorkspaceEarning($foreign, ['publisher_id' => $own['publisher']->id, 'publisher_campaign_id' => $foreignAssignment->id]);
    $invoice = publisherWorkspaceInvoice($own);
    publisherWorkspaceInvoice($foreign, ['publisher_id' => $own['publisher']->id]);
    $operator = publisherWorkspaceOperator($own);
    $url = route('publishers.show', $own['publisher']);
    $this->actingAs($operator)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.permissions.owner', false)->where('workspace.permissions.edit', true)
        ->where('workspace.permissions.requestPayout', false)->where('workspace.permissions.changeNetwork', false)
        ->where('workspace.summary.activeCampaigns', 1)->has('networks', 0));
    $this->get($url.'?tab=campaigns')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.assignments.data', 1)->where('workspace.assignments.data.0.campaign_href', route('advertiser.campaign.show', $own['campaign'])));
    $this->get($url.'?tab=applications')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.assignments.data', 1)->where('workspace.assignments.data.0.application_href', route('applications.show', $own['assignment'])));
    $this->get($url.'?tab=earnings')->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.earnings.data', 1)
        ->where('workspace.earningsSummary.0.amount', fn ($amount) => (float) $amount === 25.0));
    $this->get($url.'?tab=invoices')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.invoices.data', 1)->where('workspace.invoices.data.0.href', route('admin.invoices.show', $invoice))
        ->where('workspace.payoutEligibility', null));
    $this->get(route('publishers.show', $foreign['publisher']))->assertNotFound();
    // Owners keep access to their own historical records in every network.
    $this->actingAs(publisherWorkspaceOwner($own))->get($url.'?tab=invoices')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('workspace.invoices.data', 2));
});

it('hides data and rejects direct and partial requests for tabs without grants', function () {
    $f = conversionFixture();
    $user = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $f['network']->id]);
    $user->givePermissionTo('view_publishers');
    $url = route('publishers.show', $f['publisher']);
    $this->actingAs($user)->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.tabs', 3)->where('workspace.summary.activeCampaigns', null)
        ->where('workspace.summary.clicks', null)->where('workspace.earningsSummary', null)
        ->missing('publisher.payout_threshold')->missing('publisher.payout_method')->missing('publisher.by_currency')
        ->where('workspace.assignments', null)->where('workspace.invoices', null)->has('currencies', 0));
    foreach (['campaigns', 'applications', 'tracking', 'earnings', 'invoices', 'settings'] as $tab) {
        $this->get($url.'?tab='.$tab)->assertForbidden();
    }
    $this->get($url.'?tab=earnings', ['X-Inertia' => 'true', 'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'publishers/show', 'X-Inertia-Partial-Data' => 'workspace'])->assertForbidden();
    $user->givePermissionTo('view_campaigns');
    $this->get($url.'?tab=campaigns')->assertOk();
    $user->revokePermissionTo('view_campaigns');
    $this->get($url.'?tab=campaigns')->assertForbidden();
});

it('keeps currencies separate and excludes unrecorded commissions from financial totals', function () {
    $f = conversionFixture();
    publisherWorkspaceEarning($f, ['amount' => '25.00', 'reversed_minor' => 500]);
    publisherWorkspaceEarning($f, ['currency' => 'EUR', 'amount' => '12.00']);
    publisherWorkspaceEarning($f, ['amount' => '999.00', 'ledger_transaction_id' => null]);
    $this->actingAs(publisherWorkspaceOwner($f))->get(route('publishers.show', ['id' => $f['publisher']->id, 'tab' => 'earnings']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.earnings.data', 2)
        ->has('workspace.earningsSummary', 2)->where('workspace.earningsSummary.0.currency', 'EUR')
        ->where('workspace.earningsSummary.0.amount', fn ($amount) => (float) $amount === 12.0)
        ->where('workspace.earningsSummary.1.currency', 'USD')
        ->where('workspace.earningsSummary.1.amount', fn ($amount) => (float) $amount === 20.0));
});

it('shows pending applications without requiring an assigned offer', function () {
    $f = conversionFixture();
    $f['assignment']->update(['status' => 'P', 'requested_offer_id' => $f['offer']->id, 'offer_id' => null]);
    $url = route('publishers.show', $f['publisher']);
    $this->actingAs(publisherWorkspaceOwner($f))->get($url.'?tab=applications')->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('workspace.assignments.data', 1)
            ->where('workspace.assignments.data.0.offer_name', null)->where('workspace.assignments.data.0.requested_offer_name', 'Offer')
            ->where('workspace.assignments.data.0.tracking_href', null));
    $this->get($url.'?tab=tracking')->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.assignments.data', 0));
});

it('saves publisher settings with the user ID and preserves network ownership for staff', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $url = route('publishers.update', $f['publisher']->user_id);
    $input = ['first_name' => 'Updated', 'last_name' => 'Publisher', 'email' => $f['publisher']->user->email,
        'network_id' => $foreign['network']->id, 'website_url' => 'https://publisher.example', 'payout_threshold' => '50.00', 'currency' => 'USD'];
    $this->actingAs(publisherWorkspaceOperator($f))->post($url, $input)->assertSessionHasNoErrors()
        ->assertRedirect(route('publishers.show', ['id' => $f['publisher']->id, 'tab' => 'settings']));
    expect($f['publisher']->fresh()->network_id)->toBe($f['network']->id)
        ->and($f['publisher']->user->fresh()->first_name)->toBe('Updated');
    $this->actingAs(publisherWorkspaceOwner($f))->post($url, $input)->assertRedirect(route('dashboard'));
});

it('requires the correct account category entry permission and active membership', function () {
    $f = conversionFixture();
    $url = route('publishers.show', $f['publisher']);
    $this->get($url)->assertRedirect(route('login'));
    $this->actingAs($f['advertiser']->user)->get($url)->assertForbidden();
    $this->actingAs($f['publisher']->user)->get($url)->assertForbidden();
    $operator = publisherWorkspaceOperator($f);
    $f['network']->update(['status' => 'I']);
    $this->actingAs($operator)->get($url)->assertForbidden();
    $this->actingAs(User::factory()->create(['is_super_admin' => true]))->get($url)->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('workspace.permissions.changeNetwork', true));
});

it('uses actual payout eligibility and rechecks it when the threshold changes', function () {
    $f = conversionFixture();
    $f['publisher']->update(['payout_threshold' => '50.00']);
    publisherWorkspaceEarning($f, ['status' => 'approved']);
    $url = route('publishers.show', ['id' => $f['publisher']->id, 'tab' => 'invoices']);
    $this->actingAs(publisherWorkspaceOwner($f))->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.payoutEligibility.can_request', false)
        ->where('workspace.payoutEligibility.groups.0.remaining', '25.00'));
    $f['publisher']->update(['payout_threshold' => '20.00']);
    $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.payoutEligibility.can_request', true)
        ->where('workspace.payoutEligibility.groups.0.available_amount', '25.00'));
    $this->get(route('publisher.invoices.create'))->assertOk();
});

it('offers script tools without granting campaign browsing or exposing script credentials', function () {
    $f = conversionFixture();
    $user = $f['publisher']->user;
    $user->givePermissionTo(['access_publisher_dashboard', 'view_embeded_scripts']);
    $url = route('publishers.show', $f['publisher']);
    $this->actingAs($user)->get($url.'?tab=tracking')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('workspace.permissions.campaigns', false)->where('workspace.assignments.data.0.campaign_href', null)
        ->where('workspace.assignments.data.0.tracking_href', route('publisher.scripts.show', $f['assignment']))
        ->missing('workspace.assignments.data.0.script_token')->where('workspace.earningsSummary', null));
    $this->get($url.'?tab=campaigns')->assertForbidden();
});

it('keeps publisher and tab context across pagination', function () {
    $f = conversionFixture();
    for ($i = 0; $i < 15; $i++) {
        publisherWorkspaceInvoice($f);
    }
    $url = route('publishers.show', ['id' => $f['publisher']->id, 'tab' => 'invoices']);
    publisherWorkspaceInvoice($f);
    $this->actingAs(publisherWorkspaceOwner($f))->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('workspace.invoices.data', 15)->where('workspace.invoices.total', 16)
        ->where('workspace.invoices.next_page_url', fn ($value) => str_contains($value, '/publishers/show/'.$f['publisher']->id.'?') && str_contains($value, 'tab=invoices') && str_contains($value, 'page=2')));
    $this->get($url.'&page=2')->assertOk()->assertInertia(fn (Assert $page) => $page->has('workspace.invoices.data', 1));
});
