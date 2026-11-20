<?php

use App\Models\NetworkInvoice;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\InvoiceService;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
    $this->f = conversionFixture('CPS');
    $this->publisherUser = $this->f['publisher']->user;
    $this->publisherUser->assignRoleById(Role::findByName('publisher')->id);
});

/** A pending purchase earning recorded through the real conversion API. */
function redesignEarning($test, array $f, string $external): PublisherEarning
{
    $click = conversionClick($f);
    $test->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click,
        ['event_type' => 'purchase', 'external_id' => $external, 'amount' => '100.00']))->assertCreated();

    return PublisherEarning::latest('id')->firstOrFail();
}

/** One approved, invoiced earning; returns the pending invoice. */
function redesignInvoice($test, array $f, string $external = 'order-1')
{
    $earning = redesignEarning($test, $f, $external);
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');

    return app(InvoiceService::class)->createInvoice($f['publisher']);
}

function networkOwner(array $f): User
{
    $owner = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $owner->id, 'network_id' => $f['network']->id]);
    $owner->assignRoleById(Role::findByName('network_owner')->id);

    return $owner;
}

it('gives the earnings page one currency at a time with payout groups and recent invoices', function () {
    $invoice = redesignInvoice($this, $this->f);
    redesignEarning($this, $this->f, 'order-2');

    $this->actingAs($this->publisherUser)->get('/publisher/earnings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('publisher/earnings/index')
            ->where('currencies', ['USD'])
            ->where('currency', 'USD')
            ->has('earnings.data', 2)
            ->has('invoices', 1)
            ->where('invoices.0.id', $invoice->id)
            ->where('invoices.0.network.network_name', $this->f['network']->network_name)
            ->has('summary.USD.pending')
            ->has('canRequest.groups')
            ->where('payoutThreshold', $this->f['publisher']->fresh()->payout_threshold));

    // An unknown currency falls back to one the publisher has money in.
    $this->get('/publisher/earnings?currency=GBP')
        ->assertInertia(fn (Assert $page) => $page->where('currency', 'USD'));
});

it('names the liable network on payout groups for the invoice form', function () {
    $earning = redesignEarning($this, $this->f, 'order-1');
    app(EarningReviewService::class)->approve($earning, $this->f['advertiser']->user_id, 'Verified');

    $this->actingAs($this->publisherUser)->get('/publisher/invoices/create')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canRequest.groups.0.network_id', $this->f['network']->id)
            ->where('canRequest.groups.0.network_name', $this->f['network']->network_name)
            ->where('canRequest.groups.0.currency', 'USD'));
});

it('filters publisher invoices by open, paid and rejected with counts', function () {
    $invoice = redesignInvoice($this, $this->f);

    $this->actingAs($this->publisherUser)->get('/publisher/invoices')
        ->assertInertia(fn (Assert $page) => $page
            ->where('status', 'all')
            ->where('statusCounts', ['all' => 1, 'open' => 1, 'paid' => 0, 'rejected' => 0])
            ->has('invoices.data', 1));

    $this->get('/publisher/invoices?status=paid')
        ->assertInertia(fn (Assert $page) => $page->where('status', 'paid')->has('invoices.data', 0));
    $this->get('/publisher/invoices?status=open')
        ->assertInertia(fn (Assert $page) => $page->has('invoices.data', 1)->where('invoices.data.0.id', $invoice->id));
    $this->get('/publisher/invoices?status=bogus')
        ->assertInertia(fn (Assert $page) => $page->where('status', 'all'));
});

it('downloads the publisher invoice as a PDF only for its owner', function () {
    $invoice = redesignInvoice($this, $this->f);

    $response = $this->actingAs($this->publisherUser)->get("/publisher/invoices/{$invoice->id}/pdf");
    $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
    expect($response->headers->get('Content-Disposition'))->toContain('attachment')->toContain('.pdf');
    $pdf = $response->getContent();
    expect($pdf)->toStartWith('%PDF-1.4')->toContain('%%EOF')->toContain($invoice->invoice_number);

    $other = conversionFixture();
    $other['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->actingAs($other['publisher']->user)->get("/publisher/invoices/{$invoice->id}/pdf")->assertNotFound();
});

it('scopes the admin invoice PDF to the network and shares what the viewer may do', function () {
    $invoice = redesignInvoice($this, $this->f);
    $owner = networkOwner($this->f);

    $this->actingAs($owner)->get("/admin/invoices/{$invoice->id}/pdf")->assertOk()->assertHeader('Content-Type', 'application/pdf');

    // The default network_owner role cannot settle invoices: no actions are offered.
    $this->get("/admin/invoices/{$invoice->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/invoices/show')
            ->where('can.approve', false)
            ->where('can.pay', false)
            ->where('can.reject', false)
            ->where('invoice.network.network_name', $this->f['network']->network_name));
    $this->post("/admin/invoices/{$invoice->id}/approve")->assertForbidden();

    $this->get('/admin/invoices')
        ->assertInertia(fn (Assert $page) => $page
            ->where('can.approve', false)
            ->where('can.all_networks', false)
            ->where('statusCounts.all', 1)
            ->where('statusCounts.pending', 1));

    $foreign = networkOwner(conversionFixture());
    $this->actingAs($foreign)->get("/admin/invoices/{$invoice->id}/pdf")->assertNotFound();

    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->get("/admin/invoices/{$invoice->id}")
        ->assertInertia(fn (Assert $page) => $page->where('can.approve', true)->where('can.pay', true));
    $this->get('/admin/invoices')->assertInertia(fn (Assert $page) => $page->where('can.all_networks', true));
});

it('lists network invoices with status counts, per-currency totals and abilities', function () {
    NetworkInvoice::forceCreate(['invoice_number' => 'NET-1', 'network_id' => $this->f['network']->id, 'amount' => '12.50',
        'currency' => 'USD', 'status' => 'pending', 'ledger_backed' => true, 'period_start' => '2026-10-01', 'period_end' => '2026-10-31']);
    NetworkInvoice::forceCreate(['invoice_number' => 'NET-2', 'network_id' => $this->f['network']->id, 'amount' => '7.00',
        'currency' => 'EUR', 'status' => 'paid', 'ledger_backed' => true, 'period_start' => '2026-10-01', 'period_end' => '2026-10-31']);
    $owner = networkOwner($this->f);

    $this->actingAs($owner)->get('/networks/invoices')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('network_invoices/index')
            ->where('status', 'all')
            ->where('statusCounts.all', 2)
            ->where('totals.USD.pending.count', 1)
            ->where('totals.EUR.paid.count', 1)
            ->where('can.approve', false)
            ->where('can.pay', false)
            ->has('invoices.data', 2));

    $this->get('/networks/invoices?status=paid')
        ->assertInertia(fn (Assert $page) => $page->has('invoices.data', 1)->where('invoices.data.0.invoice_number', 'NET-2'));
});
