<?php

use App\Models\Conversion;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignFinanceService;
use App\Services\Finance\EarningReviewService;
use App\Services\InvoiceService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture('CPS', '10.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->f['publisher']->user->assignRoleById(Role::findByName('publisher')->id);
    $this->operator = User::factory()->create(['is_network' => true]);
    $this->operator->assignRoleById(Role::findByName('network_owner')->id);
    UserNetworks::create(['user_id' => $this->operator->id, 'network_id' => $this->f['network']->id]);
    $this->url = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'finance']);
    $this->export = route('campaign.finance.export', $this->f['campaign']);
    $this->actingAs($this->manager);
});

function financeOutcome(array $f, string $reference, bool $approve = true): PublisherEarning
{
    test()->travel(1)->seconds();
    $click = conversionClick($f);
    test()->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '120.00', 'external_id' => $reference]))->assertCreated();
    $earning = PublisherEarning::where('conversion_id', Conversion::where('click_id', $click->id)->sole()->id)->sole();
    if ($approve) {
        app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified outcome');
    }

    return $earning->fresh();
}

it('shows ledger-backed net totals, real history, status filters and order search', function () {
    $approved = financeOutcome($this->f, 'HH-2048');
    app(EarningReviewService::class)->adjust($approved, 'refund', '30.00', 'partial', 'Returned items', $this->manager->id);
    financeOutcome($this->f, 'HH-2051', false);
    $reversed = financeOutcome($this->f, 'reversed');
    app(EarningReviewService::class)->adjust($reversed, 'reversal', null, 'full', 'Cancelled', $this->manager->id);
    $this->get($this->url.'&earning='.$approved->id)->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.summary.pending_minor', 1200)->where('financeWorkspace.summary.approved_minor', 900)
        ->where('financeWorkspace.summary.pending_count', 1)->where('financeWorkspace.selected.original_minor', 1200)
        ->where('financeWorkspace.selected.commission_minor', 900)->has('financeWorkspace.selected.history', 3)
        ->where('financeWorkspace.selected.history.1.label', 'Commission approved')
        ->where('financeWorkspace.selected.adjust_url', null)->where('financeWorkspace.balance_minor', 97900));
    $this->get($this->url.'&status=pending&search=2051')->assertInertia(fn (Assert $p) => $p
        ->has('financeWorkspace.rows', 1)->where('financeWorkspace.rows.0.order', 'HH-2051')
        ->where('financeWorkspace.summary.approved_minor', 900));
    $this->get($this->url.'&search=absent')->assertInertia(fn (Assert $p) => $p->has('financeWorkspace.rows', 0));
});

it('shows fixed action commissions without offering an invalid sale refund', function () {
    $earning = financeOutcome($this->f, 'historical');
    $earning = $earning->replicate()->fill(['commission_type' => 'CPL', 'base_value' => '0.00', 'conversion_id' => null, 'conversion_event_id' => null, 'ledger_transaction_id' => null]);
    $earning->save();
    $this->actingAs($this->operator)->get($this->url.'&earning='.$earning->id)->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.summary.approved_minor', 1200)->where('financeWorkspace.selected.ledger_backed', false)
        ->where('financeWorkspace.selected.preview_url', null)->where('financeWorkspace.selected.adjust_url', null)
        ->where('financeWorkspace.selected.confirmed_at', null));
});

it('uses invoice snapshot amounts and protects full invoices and evidence from advertisers', function () {
    $earning = financeOutcome($this->f, 'HH-2048');
    $other = conversionFixture('CPS', '10.00');
    $other['campaign']->update(['network_id' => $this->f['network']->id, 'advertiser_id' => $this->f['advertiser']->id]);
    $other['offer']->update(['network_id' => $this->f['network']->id]);
    $assignment = PublisherCampaigns::create(['campaign_id' => $other['campaign']->id, 'network_id' => $this->f['network']->id,
        'publisher_id' => $this->f['publisher']->id, 'offer_id' => $other['offer']->id, 'status' => 'A', 'commission_type' => 'CPS', 'commission_value' => '10.00']);
    financeOutcome([...$this->f, 'campaign' => $other['campaign'], 'offer' => $other['offer'], 'assignment' => $assignment], 'other-campaign');
    $this->f['publisher']->update(['payout_threshold' => 0]);
    $invoices = app(InvoiceService::class);
    $invoice = $invoices->createInvoice($this->f['publisher'], currency: 'USD', networkId: $this->f['network']->id);
    $this->get($this->url.'&status=invoiced')->assertInertia(fn (Assert $p) => $p->where('financeWorkspace.rows.0.status', 'locked'));
    $invoices->approveInvoice($invoice, $this->operator->id);
    $invoices->markAsPaid($invoice->fresh(), 'BANK-8821', 'Verified bank receipt', $this->operator->id);
    app(EarningReviewService::class)->adjust($earning->fresh(), 'refund', '30.00', 'paid-refund', 'Returned items', $this->operator->id);
    $this->get($this->url.'&earning='.$earning->id)->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.selected.invoice.campaign_minor', 1200)->where('financeWorkspace.selected.invoice.total_minor', null)
        ->where('financeWorkspace.selected.invoice.evidence', null)->where('financeWorkspace.selected.invoice.url', null));
    $this->actingAs($this->operator)->get($this->url.'&earning='.$earning->id)->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.selected.invoice.total_minor', 2400)->where('financeWorkspace.selected.invoice.other_campaigns', true)
        ->where('financeWorkspace.selected.invoice.payment_reference', 'BANK-8821')->has('financeWorkspace.selected.history', 6));
    $this->actingAs($this->f['publisher']->user)->get(route('publishers.my.campaign.show', ['id' => $this->f['assignment']->id, 'tab' => 'finance', 'earning' => $earning->id]))
        ->assertInertia(fn (Assert $p) => $p->where('financeWorkspace.balance_minor', -300)->where('financeWorkspace.payout_url', null)
            ->where('financeWorkspace.selected.invoice.evidence', 'Verified bank receipt')->where('financeWorkspace.selected.preview_url', null));
});

it('scopes publisher data, details and exports to the current assignment', function () {
    $own = financeOutcome($this->f, 'own');
    $other = conversionFixture('CPS', '10.00');
    $foreign = financeOutcome($other, 'foreign');
    $url = route('publishers.my.campaign.show', ['id' => $this->f['assignment']->id, 'tab' => 'finance']);
    $export = route('publisher.finance.export', $this->f['assignment']);
    $this->actingAs($this->f['publisher']->user)->get($url.'&earning='.$own->id)->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.publisher_view', true)->has('financeWorkspace.rows', 1)->where('financeWorkspace.balance_minor', 1200)
        ->where('financeWorkspace.selected.review_url', null)->where('financeWorkspace.selected.adjust_url', null));
    $this->get($url.'&earning='.$foreign->id)->assertNotFound();
    $this->get(route('publisher.finance.export', $other['assignment']).'?format=csv')->assertNotFound();
    $csv = $this->get($export.'?format=csv')->assertOk()->streamedContent();
    expect($csv)->toContain('own')->toContain('Your assignment only')->not->toContain('foreign');
});

it('enforces advertiser network and admin visibility on exports and earning details', function () {
    $other = conversionFixture('CPS', '10.00');
    $earning = financeOutcome($other, 'foreign');
    $foreignExport = route('campaign.finance.export', $other['campaign']).'?format=csv';
    $this->get($foreignExport)->assertNotFound();
    $this->get($this->url.'&earning='.$earning->id)->assertNotFound();
    $this->actingAs($this->operator)->get($foreignExport)->assertNotFound();
    $this->get($this->export.'?format=csv')->assertOk();
    $this->actingAs(User::factory()->create(['is_super_admin' => true]))->get($foreignExport)->assertOk();
});

it('previews exact cumulative refunds and requires an authorized reviewed adjustment', function () {
    $earning = financeOutcome($this->f, 'refund');
    $previewUrl = route('campaign.finance.preview', [$this->f['campaign'], $earning]);
    $adjustUrl = route('campaign.finance.adjust', [$this->f['campaign'], $earning]);
    $preview = $this->postJson($previewUrl, ['amount' => '30.00'])->assertOk()->assertJson(['reversal_minor' => 300, 'remaining_minor' => 900, 'recovery' => false])->json();
    $payload = ['amount' => '30.00', 'reference' => 'REF-2048-PR', 'reason' => 'Partial refund (return)', 'version' => $preview['version']];
    $this->postJson($adjustUrl, $payload)->assertForbidden();
    $this->actingAs($this->operator)->from($this->url.'&earning='.$earning->id)->post($adjustUrl, $payload)->assertRedirect();
    expect($earning->fresh()->reversed_minor)->toBe(300);
    $this->post($adjustUrl, $payload)->assertRedirect();
    expect($earning->fresh()->reversed_minor)->toBe(300);
    $this->postJson($adjustUrl, [...$payload, 'reference' => 'stale'])->assertStatus(409);
    $this->postJson($previewUrl, ['amount' => '100.00'])->assertUnprocessable();
    $this->postJson($previewUrl, ['amount' => '0.00'])->assertUnprocessable();
    $this->postJson($previewUrl, ['amount' => '0.001'])->assertUnprocessable();
    $new = $this->postJson($previewUrl, ['amount' => '90.00'])->assertOk()->assertJson(['reversal_minor' => 900, 'remaining_minor' => 0])->json();
    $this->post($adjustUrl, [...$payload, 'amount' => '90.00', 'reference' => 'remainder', 'version' => $new['version']])->assertRedirect();
    expect($earning->fresh()->status)->toBe('reversed');
});

it('previews using cumulative integer rounding rather than rounding each refund independently', function () {
    $earning = financeOutcome($this->f, 'rounding');
    $earning->fill(['amount' => '0.01', 'base_value' => '0.03', 'refunded_basis_minor' => 1, 'reversed_minor' => 0]);
    expect(app(CampaignFinanceService::class)->preview($earning, '0.01')['reversal_minor'])->toBe(1);
});

it('blocks invoice locked adjustments and offers pending review only to permitted operators', function () {
    $earning = financeOutcome($this->f, 'pending', false);
    $review = route('campaign.finance.review', [$this->f['campaign'], $earning]);
    $this->postJson($review, ['decision' => 'approve', 'reason' => 'Verified'])->assertForbidden();
    $this->actingAs($this->operator)->get($this->url.'&earning='.$earning->id)->assertInertia(fn (Assert $p) => $p
        ->where('financeWorkspace.selected.review_url', $review));
    $this->post($review, ['decision' => 'approve', 'reason' => 'Verified'])->assertRedirect();
    expect($earning->fresh()->status)->toBe('approved');
    $this->f['publisher']->update(['payout_threshold' => 0]);
    app(InvoiceService::class)->createInvoice($this->f['publisher'], currency: 'USD', networkId: $this->f['network']->id);
    $this->postJson(route('campaign.finance.preview', [$this->f['campaign'], $earning]), ['amount' => '10.00'])->assertStatus(409);
    $this->get($this->url.'&earning='.$earning->id)->assertInertia(fn (Assert $p) => $p->where('financeWorkspace.selected.adjust_url', null)->where('financeWorkspace.selected.preview_url', null));
});

it('exports all matching pages and protects CSV and Excel cells from formula injection', function () {
    $earning = financeOutcome($this->f, 'export');
    $this->f['publisher']->user->update(['first_name' => '=HYPERLINK("https://a.test")']);
    for ($i = 0; $i < 22; $i++) {
        $copy = $earning->replicate();
        $copy->conversion_event_id = null;
        $copy->ledger_transaction_id = null;
        $copy->conversion_id = null;
        $copy->save();
    }
    $this->get($this->url)->assertInertia(fn (Assert $p) => $p->has('financeWorkspace.rows', 20)->where('financeWorkspace.pagination.total', 23));
    $csv = $this->get($this->export.'?format=csv&status=approved&page=2')->assertOk()->streamedContent();
    expect($csv)->toContain("'=HYPERLINK")->toContain('Earning #'.$copy->id);
    $filtered = $this->get($this->export.'?format=csv&search=export')->assertOk()->streamedContent();
    expect($filtered)->not->toContain('Earning #');
    $response = $this->get($this->export.'?format=xlsx&search=export')->assertOk();
    Cell::setValueBinder(new DefaultValueBinder);
    $book = IOFactory::load($response->baseResponse->getFile()->getPathname());
    $sheet = $book->getSheetByName('Earnings');
    $last = $sheet->getHighestDataRow();
    expect($sheet->getCell('B'.$last)->getDataType())->toBe(DataType::TYPE_STRING)
        ->and($sheet->getCell('D'.$last)->getValue())->toEqual(12);
    $book->disconnectWorksheets();
});

it('validates filters and enforces permissions on finance exports and adjustments', function () {
    $this->get($this->url.'&status=invalid')->assertSessionHasErrors('status');
    $this->get($this->export.'?format=csv&page=-1')->assertSessionHasErrors('page');
    $this->get($this->export.'?format=pdf')->assertSessionHasErrors('format');
    $earning = financeOutcome($this->f, 'private');
    $this->operator->syncRoles([]);
    $this->actingAs($this->operator)->get($this->export.'?format=csv')->assertForbidden();
    $this->postJson(route('campaign.finance.preview', [$this->f['campaign'], $earning]), ['amount' => '1.00'])->assertForbidden();
    $this->manager->syncRoles([]);
    $this->actingAs($this->manager)->get($this->url)->assertForbidden();
    $this->get($this->export.'?format=csv')->assertForbidden();
});
