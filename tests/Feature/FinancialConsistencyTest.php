<?php

use App\Models\Advertiser;
use App\Models\Clicks;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\Finance\LedgerService;
use App\Services\Finance\NetworkSettlementService;
use App\Services\Finance\ReconciliationService;
use App\Services\InvoiceService;
use App\Support\ConversionMoney as Money;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpKernel\Exception\HttpException;

function financialEarning($test, array $f, string $external = 'order-1', string $basis = '100.00'): PublisherEarning
{
    $click = conversionClick($f);
    $test->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click,
        ['event_type' => 'purchase', 'external_id' => $external, 'amount' => $basis]))->assertCreated();

    return PublisherEarning::latest('id')->firstOrFail();
}

function financialInvoice(PublisherEarning $earning, bool $paid = false): PublisherInvoice
{
    $actor = $earning->publisher->user_id;
    app(EarningReviewService::class)->approve($earning, $actor, 'Verified merchant order');
    $invoice = app(InvoiceService::class)->createInvoice($earning->publisher);
    app(InvoiceService::class)->approveInvoice($invoice, $actor);
    if ($paid) {
        app(InvoiceService::class)->markAsPaid($invoice, 'bank-'.$invoice->id, 'Bank statement line', $actor);
    }

    return $invoice->fresh();
}

it('records verified deposits once with P/F fee snapshots and reconciles network payouts', function (string $model, string $rate, string $fee) {
    $f = conversionFixture();
    $f['network']->update(['default_commission_model' => $model, 'default_commission_value' => $rate]);
    $funding = app(FundingService::class);
    $id = $funding->deposit($f['advertiser'], '100.00', 'USD', 'bank-deposit-1', 'Statement #1', $f['advertiser']->user_id);
    $f['network']->update(['default_commission_value' => '99.00']);
    expect($funding->deposit($f['advertiser'], '100.00', 'USD', 'bank-deposit-1', 'Statement #1', $f['advertiser']->user_id))->toBe($id);
    $ledger = app(LedgerService::class);
    expect($ledger->balance($f['network']->id, 'USD', 'network_available', $f['network']->id))->toBe(Money::cents($fee));
    expect($f['advertiser']->fresh()->available_budget)->toBe(Money::decimal(110000 - Money::cents($fee)));
    expect(fn () => $funding->deposit($f['advertiser'], '101.00', 'USD', 'bank-deposit-1', 'Statement #1', $f['advertiser']->user_id))->toThrow(HttpException::class);
    $settlements = app(NetworkSettlementService::class);
    $invoice = $settlements->create($f['network'], 'USD', $f['advertiser']->user_id);
    expect(fn () => $settlements->create($f['network'], 'USD', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect(fn () => $settlements->transition($invoice, 'pay', $f['advertiser']->user_id, ['reference' => 'pay', 'evidence' => 'receipt']))->toThrow(HttpException::class);
    $settlements->transition($invoice, 'approve', $f['advertiser']->user_id);
    $settlements->transition($invoice, 'pay', $f['advertiser']->user_id, ['reference' => 'network-pay', 'evidence' => 'receipt']);
    $settlements->transition($invoice, 'pay', $f['advertiser']->user_id, ['reference' => 'network-pay', 'evidence' => 'receipt']);
    expect($ledger->balance($f['network']->id, 'USD', 'network_payable', $f['network']->id))->toBe(0);
    expect((float) DB::table('network_earnings')->sum('total_amount'))->toBe(0.0);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
})->with([['P', '10.00', '10.00'], ['F', '7.50', '7.50'], ['percentage', '12.50', '12.50'], ['fixed', '8.00', '8.00']]);

it('does not turn planned or legacy budgets into verified funding', function () {
    $f = conversionFixture('CPS');
    app(FundingService::class)->refund($f['advertiser'], '1000.00', 'USD', 'all-funds', 'Return receipt', $f['advertiser']->user_id);
    $f['advertiser']->update(['total_budget' => 100000, 'available_budget' => 100000]);
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '100.00']))->assertUnprocessable();
    expect(PublisherEarning::count())->toBe(0);
    expect(app(ReconciliationService::class)->inspect())->not->toBe([]);
});

it('uses the referral contract even when assignment rates change and rejects legacy referrals', function () {
    $f = conversionFixture('CPS', '12.50');
    $click = conversionClick($f);
    $f['assignment']->update(['commission_value' => '90.00']);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '99.99']))->assertCreated()->assertJsonPath('commission_amount', '12.50');
    expect(PublisherEarning::first()->commission_snapshot['value'])->toBe('12.50');
    expect(PublisherEarning::first()->currency)->toBe('USD');
    expect(fn () => DB::transaction(fn () => DB::table('clicks')->where('id', $click->id)->update(['commission_snapshot' => null])))->toThrow(QueryException::class);
    $attributes = $click->getAttributes();
    unset($attributes['id']);
    $attributes['commission_snapshot'] = null;
    $attributes['referral_id'] = (string) Str::uuid();
    $legacyId = DB::table('clicks')->insertGetId($attributes);
    $click = Clicks::findOrFail($legacyId);
    $this->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '99.99', 'external_id' => 'another']))->assertUnprocessable();
});

it('requires financial review and enforces atomic invoice transitions with payment evidence', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $invoices = app(InvoiceService::class);
    expect($invoices->createInvoice($f['publisher']))->toBeNull();
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Confirmed');
    $invoice = $invoices->createInvoice($f['publisher']);
    expect($earning->fresh()->status)->toBe('locked');
    expect($invoices->createInvoice($f['publisher']))->toBeNull();
    expect(fn () => $invoices->markAsPaid($invoice))->toThrow(HttpException::class);
    $invoices->approveInvoice($invoice, $f['advertiser']->user_id);
    expect($earning->fresh()->status)->toBe('payable');
    expect(fn () => $invoices->approveInvoice($invoice, $f['advertiser']->user_id))->toThrow(HttpException::class);
    $invoices->markAsPaid($invoice, 'bank-1', 'receipt', $f['advertiser']->user_id);
    $invoices->markAsPaid($invoice, 'bank-1', 'receipt', $f['advertiser']->user_id);
    expect($earning->fresh()->status)->toBe('paid');
    expect(fn () => $invoices->rejectInvoice($invoice, 'too late', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('rejects commissions without deleting history and restores funds and campaign budget', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $reviews = app(EarningReviewService::class);
    $reviews->adjust($earning, 'rejection', null, 'declined', 'Invalid order', $f['advertiser']->user_id);
    $reviews->adjust($earning, 'rejection', null, 'declined', 'Invalid order', $f['advertiser']->user_id);
    expect($earning->fresh()->status)->toBe('rejected')->and($earning->fresh()->amount)->toBe('10.00');
    expect($f['advertiser']->fresh()->available_budget)->toBe('1000.00');
    expect($f['campaign']->fresh()->spent_amount)->toBe('0.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('handles partial refunds with cumulative rounding and prevents over-refunds and conflicting retries', function () {
    $f = conversionFixture('Flat', '0.05');
    $earning = financialEarning($this, $f, basis: '0.03');
    $reviews = app(EarningReviewService::class);
    foreach (['a' => 2, 'b' => 3, 'c' => 5] as $reference => $expected) {
        $reviews->adjust($earning, 'refund', '0.01', $reference, 'Partial return', $f['advertiser']->user_id);
        $reviews->adjust($earning, 'refund', '0.01', $reference, 'Partial return', $f['advertiser']->user_id);
        expect($earning->fresh()->reversed_minor)->toBe($expected);
    }
    expect($earning->fresh()->status)->toBe('reversed');
    expect(fn () => $reviews->adjust($earning, 'refund', '0.02', 'a', 'Partial return', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect(fn () => $reviews->adjust($earning, 'refund', '0.01', 'd', 'Excess', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
    expect(Money::proportion(99999999999, 99999999998, 99999999999))->toBe(99999999998);
});

it('requires cancellation before refunds of reserved earnings and returns only approved earnings', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $invoice = financialInvoice($earning);
    $reviews = app(EarningReviewService::class);
    expect(fn () => $reviews->adjust($earning, 'refund', '50.00', 'return', 'Return', $f['advertiser']->user_id))->toThrow(HttpException::class);
    app(InvoiceService::class)->rejectInvoice($invoice, 'Order return before payment', $f['advertiser']->user_id);
    expect($earning->fresh()->status)->toBe('approved')->and($earning->fresh()->invoice_id)->toBeNull();
    $reviews->adjust($earning, 'refund', '50.00', 'return', 'Return', $f['advertiser']->user_id);
    $next = app(InvoiceService::class)->createInvoice($f['publisher']);
    expect($next->amount)->toBe('5.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('recovers paid chargebacks from future payouts without changing the paid invoice', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $invoice = financialInvoice($earning, true);
    app(EarningReviewService::class)->adjust($earning, 'chargeback', null, 'bank-dispute', 'Chargeback confirmed', $f['advertiser']->user_id);
    expect($invoice->fresh()->status)->toBe('paid')->and($invoice->fresh()->amount)->toBe('10.00');
    $next = financialEarning($this, $f, 'next-order', '200.00');
    app(EarningReviewService::class)->approve($next, $f['advertiser']->user_id, 'Verified');
    $nextInvoice = app(InvoiceService::class)->createInvoice($f['publisher']);
    expect($nextInvoice->amount)->toBe('10.00')->and($nextInvoice->invoice_details['recovery_minor'])->toBe(1000);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
    app(InvoiceService::class)->approveInvoice($nextInvoice, $f['advertiser']->user_id);
    app(InvoiceService::class)->markAsPaid($nextInvoice, 'second-payment', 'receipt', $f['advertiser']->user_id);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('keeps historical network ownership after publisher transfer', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $other = conversionFixture();
    $f['publisher']->update(['network_id' => $other['network']->id]);
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');
    $invoice = app(InvoiceService::class)->createInvoice($f['publisher']);
    expect($invoice->network_id)->toBe($f['network']->id);
});

it('rolls back a failed ledger posting and protects posted history from updates and deletes', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    expect(fn () => DB::transaction(fn () => DB::table('ledger_entries')->where('transaction_id', $earning->ledger_transaction_id)->delete()))->toThrow(QueryException::class);
    expect(fn () => DB::transaction(fn () => DB::table('financial_transactions')->where('id', $earning->ledger_transaction_id)->update(['kind' => 'fake'])))->toThrow(QueryException::class);
    $invoice = financialInvoice($earning);
    app(InvoiceService::class)->markAsPaid($invoice, 'same-bank-ref', 'receipt', $f['advertiser']->user_id);
    $otherEarning = financialEarning($this, $f, 'second-order');
    $otherInvoice = financialInvoice($otherEarning);
    expect(fn () => app(InvoiceService::class)->markAsPaid($otherInvoice, 'same-bank-ref', 'receipt', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect($otherInvoice->fresh()->status)->toBe('approved')->and($otherEarning->fresh()->status)->toBe('payable');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('separates currencies and networks and blocks unfunded legacy settlement', function () {
    $usd = conversionFixture('CPS');
    $earning = financialEarning($this, $usd);
    app(EarningReviewService::class)->approve($earning, $usd['advertiser']->user_id, 'Reviewed');
    $eur = conversionFixture('CPS');
    // A separate new merchant account holds EUR; funded accounts cannot change currency.
    $merchant = Advertiser::create(['user_id' => User::factory()->create(['is_advertiser' => true])->id,
        'network_id' => $eur['network']->id, 'business_name' => 'Euro merchant', 'website_name' => 'https://eur.example', 'industry' => 'retail', 'status' => 'A', 'currency' => 'EUR']);
    app(FundingService::class)->deposit($merchant, '1000.00', 'EUR', 'euro-deposit', 'receipt', $merchant->user_id);
    $eur['campaign']->update(['advertiser_id' => $merchant->id, 'currency' => 'EUR']);
    $eur['assignment']->update(['publisher_id' => $usd['publisher']->id]);
    $eur['credential']->update(['advertiser_id' => $merchant->id]);
    $usd['publisher']->update(['network_id' => $eur['network']->id]);
    $eur['publisher'] = $usd['publisher'];
    $click = conversionClick($eur);
    $this->withToken($eur['token'])->postJson('/api/v1/events', conversionPayload($click, ['event_type' => 'purchase', 'amount' => '100.00', 'currency' => 'EUR']))->assertCreated();
    $euroEarning = PublisherEarning::latest('id')->first();
    app(EarningReviewService::class)->approve($euroEarning, $merchant->user_id, 'Reviewed');
    expect(fn () => app(InvoiceService::class)->createInvoice($usd['publisher']))->toThrow(HttpException::class);
    $invoice = app(InvoiceService::class)->createInvoice($usd['publisher'], currency: 'EUR', networkId: $eur['network']->id);
    expect($invoice->currency)->toBe('EUR')->and($invoice->amount)->toBe('10.00')->and($invoice->network_id)->toBe($eur['network']->id);
    $legacy = PublisherInvoice::create(['publisher_id' => $usd['publisher']->id, 'network_id' => $usd['network']->id, 'amount' => '10.00', 'period_start' => now(), 'period_end' => now()]);
    expect(fn () => app(InvoiceService::class)->approveInvoice($legacy, $merchant->user_id))->toThrow(HttpException::class);
});

it('authorizes funding, review, adjustments and ledger reads by current permission and historical network', function () {
    $this->seed(RolePermsSeeder::class);
    $own = conversionFixture('CPS');
    $foreign = conversionFixture('CPS');
    $earning = financialEarning($this, $own);
    $foreignEarning = financialEarning($this, $foreign);
    $manager = User::factory()->create(['is_network' => true]);
    $manager->assignRole('network_owner');
    UserNetworks::create(['user_id' => $manager->id, 'network_id' => $own['network']->id]);
    $this->actingAs($manager)->postJson('/finance/earnings/'.$foreignEarning->id.'/review', ['decision' => 'approve', 'reason' => 'Verified'])->assertForbidden();
    $this->getJson('/finance/networks/'.$foreign['network']->id.'/ledger?currency=USD')->assertForbidden();
    $this->postJson('/finance/advertisers/'.$own['advertiser']->id.'/funding', ['operation' => 'deposit', 'amount' => '100.00', 'currency' => 'USD', 'reference' => 'no', 'evidence' => 'no'])->assertRedirect();
    $this->postJson('/finance/earnings/'.$earning->id.'/review', ['decision' => 'approve', 'reason' => 'Verified'])->assertOk();
    $this->postJson('/finance/earnings/'.$earning->id.'/adjust', ['kind' => 'refund', 'amount' => '20.00', 'reference' => 'return-20', 'reason' => 'Return'])->assertOk();
    $this->getJson('/finance/networks/'.$own['network']->id.'/ledger?currency=USD')->assertOk();
    Role::findByName('network_owner')->revokePermissionTo('adjust_commissions');
    $this->postJson('/finance/earnings/'.$earning->id.'/adjust', ['kind' => 'reversal', 'reference' => 'return-rest', 'reason' => 'Return'])->assertForbidden();
    UserNetworks::where('user_id', $manager->id)->delete();
    $this->getJson('/finance/earnings')->assertForbidden();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->postJson('/finance/advertisers/'.$own['advertiser']->id.'/funding', ['operation' => 'deposit', 'amount' => '100.00', 'currency' => 'USD', 'reference' => 'admin-deposit', 'evidence' => 'bank receipt'])->assertOk();
    $this->get('/finance')->assertOk();
});

it('blocks payment when a new paid refund creates debt after the next invoice was reserved', function () {
    $f = conversionFixture('CPS');
    $old = financialEarning($this, $f);
    financialInvoice($old, true);
    $next = financialEarning($this, $f, 'next');
    $nextInvoice = financialInvoice($next);
    app(EarningReviewService::class)->adjust($old, 'reversal', null, 'late-return', 'Return', $f['advertiser']->user_id);
    expect(fn () => app(InvoiceService::class)->markAsPaid($nextInvoice, 'next-pay', 'receipt', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect($nextInvoice->fresh()->status)->toBe('approved');
    app(InvoiceService::class)->rejectInvoice($nextInvoice, 'Offset new debt', $f['advertiser']->user_id);
    expect(app(InvoiceService::class)->createInvoice($f['publisher']))->toBeNull();
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('rolls back invoice and ledger writes if the final earning transition fails', function () {
    $f = conversionFixture('CPS');
    $earning = financialEarning($this, $f);
    $invoice = financialInvoice($earning);
    if (DB::getDriverName() === 'sqlite') {
        DB::unprepared("CREATE TRIGGER test_settlement_failure BEFORE UPDATE ON publisher_earnings WHEN NEW.status = 'paid' BEGIN SELECT RAISE(ABORT, 'Simulated settlement failure'); END");
    } else {
        DB::unprepared("CREATE FUNCTION test_settlement_failure() RETURNS trigger AS $$ BEGIN IF NEW.status = 'paid' THEN RAISE EXCEPTION 'Simulated settlement failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
        DB::unprepared('CREATE TRIGGER test_settlement_failure BEFORE UPDATE ON publisher_earnings FOR EACH ROW EXECUTE FUNCTION test_settlement_failure()');
    }
    try {
        expect(fn () => app(InvoiceService::class)->markAsPaid($invoice, 'failing-payment', 'receipt', $f['advertiser']->user_id))->toThrow(QueryException::class);
        expect($invoice->fresh()->status)->toBe('approved')->and($earning->fresh()->status)->toBe('payable');
        expect(DB::table('financial_transactions')->where('reference', 'bank-payment:failing-payment')->exists())->toBeFalse();
        expect(app(ReconciliationService::class)->inspect())->toBe([]);
    } finally {
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER test_settlement_failure');
        } else {
            DB::unprepared('DROP TRIGGER test_settlement_failure ON publisher_earnings');
            DB::unprepared('DROP FUNCTION test_settlement_failure()');
        }
    }
});

it('keeps post-payment merchant credits from overdrawing reconciled cash', function () {
    $f = conversionFixture('CPS');
    app(FundingService::class)->refund($f['advertiser'], '990.00', 'USD', 'unused', 'receipt', $f['advertiser']->user_id);
    $earning = financialEarning($this, $f);
    financialInvoice($earning, true);
    app(EarningReviewService::class)->adjust($earning, 'chargeback', null, 'paid-return', 'Return', $f['advertiser']->user_id);
    expect($f['advertiser']->fresh()->available_budget)->toBe('10.00');
    expect(fn () => app(FundingService::class)->refund($f['advertiser'], '10.00', 'USD', 'overdraw', 'receipt', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('returns actionable form errors for a declined financial operation without changing balances', function () {
    $f = conversionFixture();
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->from('/finance')->post('/finance/advertisers/'.$f['advertiser']->id.'/funding', [
        'operation' => 'refund', 'amount' => '1001.00', 'currency' => 'USD', 'reference' => 'over-budget', 'evidence' => 'receipt',
    ])->assertRedirect('/finance')->assertSessionHasErrors('finance');
    expect($f['advertiser']->fresh()->available_budget)->toBe('1000.00');
});

it('retains funded advertisers and prevents raw changes to funded financial ownership', function () {
    $f = conversionFixture('CPS');
    expect(fn () => DB::transaction(fn () => DB::table('advertisers')->where('id', $f['advertiser']->id)->update(['currency' => 'EUR'])))->toThrow(QueryException::class);
    $earning = financialEarning($this, $f);
    expect(fn () => DB::transaction(fn () => DB::table('campaigns')->where('id', $f['campaign']->id)->update(['currency' => 'EUR'])))->toThrow(QueryException::class);
    expect(fn () => DB::transaction(fn () => DB::table('publisher_earnings')->where('id', $earning->id)->delete()))->toThrow(QueryException::class);
    $other = Advertiser::create(['user_id' => User::factory()->create()->id, 'network_id' => $f['network']->id, 'business_name' => 'Funded with no campaign', 'website_name' => 'https://example.test', 'industry' => 'retail', 'currency' => 'USD']);
    app(FundingService::class)->deposit($other, '100.00', 'USD', 'orphan-check', 'receipt', $other->user_id);
    expect(fn () => DB::transaction(fn () => DB::table('advertisers')->where('id', $other->id)->delete()))->toThrow(QueryException::class);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});
