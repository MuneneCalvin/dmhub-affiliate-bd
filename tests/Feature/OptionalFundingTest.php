<?php

use App\Models\Network;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\CampaignOverviewService;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\Finance\ReconciliationService;
use App\Services\InvoiceService;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

function unfundedFixture(): array
{
    $f = conversionFixture();
    $f['network']->update(['requires_prepaid_funding' => false]);
    app(FundingService::class)->refund($f['advertiser'], '1000.00', 'USD', 'return-initial', 'Return receipt', $f['advertiser']->user_id);
    $f['advertiser']->refresh();
    $f['advertiser']->update(['credit_limit' => '1000.00']);

    return $f;
}

it('defaults new networks to optional prepayment and accepts the schema default fee model', function () {
    $network = Network::create(['network_name' => 'New network', 'owner_email' => 'new@example.test', 'default_currency' => 'USD', 'pay_day_of_week' => 1])->fresh();
    expect($network->requires_prepaid_funding)->toBeFalse()->and($network->default_commission_model)->toBe('0');
    $f = conversionFixture();
    expect($f['advertiser']->credit_limit)->toBe('0.00');
    $f['network']->update(['default_commission_model' => $network->default_commission_model]);
    $funding = app(FundingService::class);
    $id = $funding->deposit($f['advertiser'], '20.00', 'USD', 'legacy-zero', 'Receipt', $f['advertiser']->user_id);
    expect($funding->deposit($f['advertiser'], '20.00', 'USD', 'legacy-zero', 'Receipt', $f['advertiser']->user_id))->toBe($id)
        ->and($f['advertiser']->fresh()->available_budget)->toBe('1020.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('rejects ambiguous or unsupported fee models without posting money', function (string $model, string $rate) {
    $f = conversionFixture();
    $f['network']->update(['default_commission_model' => $model, 'default_commission_value' => $rate]);
    expect(fn () => app(FundingService::class)->deposit($f['advertiser'], '20.00', 'USD', 'invalid-fee', 'Receipt', $f['advertiser']->user_id))->toThrow(ValidationException::class);
    expect(DB::table('financial_transactions')->where('reference', 'funding:invalid-fee')->exists())->toBeFalse();
})->with([['0', '5.00'], ['invalid', '0.00']]);

it('allows unfunded traffic and repeated commissions while reconciling debt and repayments', function () {
    $f = unfundedFixture();
    $this->get($f['assignment']->tracking_link)->assertRedirect();
    $click = conversionClick($f);
    $payload = conversionPayload($click);
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $this->postJson('/api/v1/events', $payload)->assertOk();
    $this->postJson('/api/v1/events', conversionPayload($click, ['external_id' => 'second']))->assertCreated();
    expect(PublisherEarning::count())->toBe(2)->and($f['advertiser']->fresh()->available_budget)->toBe('-20.00');
    foreach ([null, $f['assignment']->fresh()] as $assignment) {
        $overview = app(CampaignOverviewService::class)->build($f['campaign']->fresh(), $f['advertiser']->user, $assignment);
        expect($overview['traffic_eligible'])->toBeTrue()->and(array_column($overview['alerts'], 'code'))->not->toContain('funding');
    }
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
    $funding = app(FundingService::class);
    $funding->deposit($f['advertiser'], '5.00', 'USD', 'partial', 'Receipt', $f['advertiser']->user_id);
    expect($f['advertiser']->fresh()->available_budget)->toBe('-15.00');
    app(EarningReviewService::class)->adjust(PublisherEarning::first(), 'reversal', null, 'cancel', 'Cancelled order', $f['advertiser']->user_id);
    expect($f['advertiser']->fresh()->available_budget)->toBe('-5.00');
    $funding->deposit($f['advertiser'], '10.00', 'USD', 'remaining', 'Receipt', $f['advertiser']->user_id);
    expect($f['advertiser']->fresh()->available_budget)->toBe('5.00');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('keeps prepaid requirements and campaign spending caps effective', function (string $cap) {
    $f = unfundedFixture();
    if ($cap === 'prepaid') {
        $f['network']->update(['requires_prepaid_funding' => true]);
    } else {
        $f['campaign']->update([$cap => '5.00']);
    }
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload(conversionClick($f)))->assertUnprocessable();
    expect(PublisherEarning::count())->toBe(0)->and($f['advertiser']->fresh()->available_budget)->toBe('0.00');
})->with(['prepaid', 'total_budget', 'daily_budget']);

it('caps unpaid commissions across campaigns and restores credit after repayment', function () {
    $f = unfundedFixture();
    $f['advertiser']->update(['credit_limit' => '15.00']);
    $click = conversionClick($f);
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click))->assertCreated();
    $secondCampaign = $f['campaign']->replicate()->fill(['name' => 'Second campaign']);
    $secondCampaign->save();
    $secondOffer = $f['offer']->replicate()->fill(['campaign_id' => $secondCampaign->id]);
    $secondOffer->save();
    $secondAssignment = $f['assignment']->replicate(['script_token'])->fill(['campaign_id' => $secondCampaign->id, 'offer_id' => $secondOffer->id, 'tracking_link' => url('/t/second-campaign')]);
    $secondAssignment->save();
    $secondClick = conversionClick(array_replace($f, ['campaign' => $secondCampaign, 'offer' => $secondOffer, 'assignment' => $secondAssignment]));
    $payload = conversionPayload($secondClick, ['external_id' => 'second-campaign']);
    $this->postJson('/api/v1/events', $payload)->assertUnprocessable();
    expect(PublisherEarning::count())->toBe(1)->and($secondCampaign->fresh()->spent_amount)->toBe('0.00');
    app(FundingService::class)->deposit($f['advertiser'], '5.00', 'USD', 'restore-credit', 'Receipt', $f['advertiser']->user_id);
    $this->postJson('/api/v1/events', $payload)->assertCreated();
    expect($f['advertiser']->fresh()->available_budget)->toBe('-15.00');
    $overview = app(CampaignOverviewService::class)->build($f['campaign']->fresh(), $f['advertiser']->user);
    expect($overview['traffic_eligible'])->toBeFalse()->and(array_column($overview['alerts'], 'code'))->toContain('credit_limit');
    $this->get($f['assignment']->tracking_link)->assertUnprocessable();
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('requires an assigned credit limit before unfunded commissions can accrue', function () {
    $f = unfundedFixture();
    $f['advertiser']->update(['credit_limit' => '0.00']);
    $payload = conversionPayload(conversionClick($f));
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertUnprocessable();
    $f['advertiser']->update(['credit_limit' => '10.00']);
    $this->postJson('/api/v1/events', $payload)->assertCreated();
});

it('requires recorded cash to pay postpaid commissions', function () {
    $f = unfundedFixture();
    $this->withToken($f['token'])->postJson('/api/v1/events', conversionPayload(conversionClick($f)))->assertCreated();
    $earning = PublisherEarning::firstOrFail();
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Verified');
    $invoices = app(InvoiceService::class);
    $invoice = $invoices->createInvoice($f['publisher']);
    $invoices->approveInvoice($invoice, $f['advertiser']->user_id);
    expect(fn () => $invoices->markAsPaid($invoice, 'payout', 'Receipt', $f['advertiser']->user_id))->toThrow(HttpException::class);
    expect($invoice->fresh()->status)->toBe('approved');
    app(FundingService::class)->deposit($f['advertiser'], '10.00', 'USD', 'settle', 'Receipt', $f['advertiser']->user_id);
    $invoices->markAsPaid($invoice, 'payout', 'Receipt', $f['advertiser']->user_id);
    expect($invoice->fresh()->status)->toBe('paid')->and(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('allows only authorized operators in the owning network to manage credit', function () {
    $this->seed(RolePermsSeeder::class);
    $f = conversionFixture();
    $foreign = conversionFixture();
    $operator = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $operator->id, 'network_id' => $f['network']->id]);
    $operator->givePermissionTo(['view_advertisers', 'manage_advertisers']);
    $url = route('advertisers.cards.update', ['id' => $f['advertiser']->user_id, 'card' => 'credit']);
    $this->actingAs($operator)->patch($url, ['credit_limit' => '250.50'])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->credit_limit)->toBe('250.50');
    foreach (['', null, '-1', '1.001', 'abc', '1000000000'] as $value) {
        $this->patch($url, ['credit_limit' => $value])->assertSessionHasErrors('credit_limit');
    }
    $this->patch($url, [])->assertSessionHasErrors('credit_limit');
    expect($f['advertiser']->fresh()->credit_limit)->toBe('250.50');
    $this->patch($url, ['credit_limit' => '0'])->assertSessionHasNoErrors();
    expect($f['advertiser']->fresh()->credit_limit)->toBe('0.00');
    $this->patch(route('advertisers.cards.update', ['id' => $foreign['advertiser']->user_id, 'card' => 'credit']), ['credit_limit' => '1'])->assertNotFound();
    $operator->revokePermissionTo('manage_advertisers');
    $this->patch($url, ['credit_limit' => '1'])->assertForbidden();
    $owner = $f['advertiser']->user;
    $owner->givePermissionTo(['access_advertiser_dashboard', 'manage_advertisers']);
    $this->actingAs($owner)->patch($url, ['credit_limit' => '1'])->assertForbidden();
});

it('persists the optional network funding policy and rejects unsupported fee model edits', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $data = ['network_name' => 'Optional network', 'owner_email' => 'optional@example.test',
        'default_currency' => 'USD', 'default_commission_model' => 'P', 'default_commission_value' => '0',
        'min_payment_threshold' => '0', 'payment_frequency' => 'M', 'pay_day_of_month' => 1,
        'pay_day_of_week' => 1, 'country_iso' => 'USA'];
    $this->actingAs($admin)->post(route('networks.store'), $data)->assertSessionHasNoErrors()->assertSessionHas('success');
    $network = Network::where('owner_email', $data['owner_email'])->firstOrFail();
    expect($network->requires_prepaid_funding)->toBeFalse();
    $url = route('networks.update', $network);
    $this->post($url, [...$data, 'requires_prepaid_funding' => true])->assertSessionHasNoErrors();
    expect($network->fresh()->requires_prepaid_funding)->toBeTrue();
    $this->post($url, [...$data, 'default_commission_model' => 'invalid'])->assertSessionHasErrors('default_commission_model');
    expect($network->fresh()->default_commission_model)->toBe('P');
    $this->post($url, [...$data, 'requires_prepaid_funding' => false])->assertSessionHasNoErrors();
    expect($network->fresh()->requires_prepaid_funding)->toBeFalse();
});
