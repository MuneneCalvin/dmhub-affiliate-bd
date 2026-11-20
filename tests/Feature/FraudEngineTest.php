<?php

use App\Jobs\AssessConversionFraud;
use App\Models\FraudAssessment;
use App\Models\FraudFeedback;
use App\Models\FraudPolicy;
use App\Models\FraudPolicyVersion;
use App\Models\PublisherEarning;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\ReconciliationService;
use App\Services\Fraud\FraudAssessmentService;
use App\Services\Fraud\FraudEvidenceService;
use App\Services\Fraud\FraudPolicyService;
use App\Services\Fraud\FraudReportingService;
use App\Services\Fraud\FraudRuleRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    Queue::fake();
});

function automaticFraudConfig(): array
{
    $config = app(FraudPolicyService::class)->defaults();
    $config['mode'] = 'automatic';
    $config['wait_minutes'] = ['submission' => 0, 'purchase' => 0, 'action' => 0];
    $config['limits'] = ['USD' => ['max_commission_minor' => 10000, 'daily_limit_minor' => 100000]];
    foreach ($config['rules'] as &$rule) {
        $rule['mode'] = 'off';
    }
    unset($rule);
    $config['rules']['commission_amount']['mode'] = 'enforce';

    return $config;
}

function saveFraudConfig(array $f, array $config, bool $campaign = false): FraudPolicyVersion
{
    $service = app(FraudPolicyService::class);
    $campaignId = $campaign ? $f['campaign']->id : null;
    $existing = FraudPolicy::where('scope_key', $service->scope($f['network']->id, $campaignId))->first();

    return $service->save($f['network']->id, $campaignId, $config, $f['advertiser']->user_id, 'Test policy', $existing?->active_version_id);
}

function fraudEarning($test, array $f, array $payload = []): PublisherEarning
{
    $click = conversionClick($f);
    $click->update(['ip_address' => '192.0.2.10']);
    $test->withToken($f['token'])->postJson('/api/v1/events', conversionPayload($click, ['external_id' => 'fraud:'.fake()->uuid(), ...$payload]))->assertCreated();

    return PublisherEarning::latest('id')->firstOrFail();
}

function assessFraud(PublisherEarning $earning): FraudAssessment
{
    $assessment = $earning->fraudAssessments()->latest('id')->firstOrFail();
    app(FraudAssessmentService::class)->process($assessment->id);

    return $assessment->fresh();
}

it('records evidence in shadow mode without approving or duplicating financial entries', function () {
    $f = conversionFixture();
    $earning = fraudEarning($this, $f, ['spam_checks' => ['honeypot_filled' => true, 'form_duration_ms' => 10, 'is_spam' => true]]);
    Queue::assertPushed(AssessConversionFraud::class);
    $assessment = assessFraud($earning);
    expect($assessment->status)->toBe('completed')->and($assessment->score)->toBe(0)
        ->and($assessment->evidence['spam_checks']['honeypot_filled'])->toBeTrue()
        ->and($assessment->recommendation)->toBe('manual_review')->and($earning->fresh()->status)->toBe('pending');
    expect(collect($assessment->results)->where('outcome', 'flagged')->count())->toBeGreaterThanOrEqual(3);
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('approves through the ledger exactly once and returns the current status on event retries', function () {
    $f = conversionFixture();
    saveFraudConfig($f, automaticFraudConfig());
    $payload = conversionPayload(conversionClick($f));
    $this->withToken($f['token'])->postJson('/api/v1/events', $payload)->assertCreated();
    $earning = PublisherEarning::firstOrFail();
    $assessment = assessFraud($earning);
    expect($assessment->status)->toBe('completed')->and($assessment->last_error)->toBeNull()
        ->and($assessment->applied_at)->not->toBeNull()->and($earning->fresh()->status)->toBe('approved')
        ->and($earning->conversion->fresh()->reviewed_by)->toBe('system:fraud');
    app(FraudAssessmentService::class)->process($assessment->id);
    expect(DB::table('financial_transactions')->where('kind', 'approval')->count())->toBe(1);
    $transaction = DB::table('financial_transactions')->where('kind', 'approval')->first();
    expect($transaction->actor_id)->toBeNull()->and(json_decode($transaction->details, true)['assessment_id'])->toBe($assessment->id);
    $this->postJson('/api/v1/events', $payload)->assertOk()->assertJsonPath('commission_status', 'approved');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('makes off and monitor rules non-blocking while enforced rules affect approval', function (string $mode, string $status, int $score) {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['rules']['honeypot']['mode'] = $mode;
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f, ['spam_checks' => ['honeypot_filled' => true, 'form_duration_ms' => 5000, 'is_spam' => false]]);
    $assessment = assessFraud($earning);
    expect($earning->fresh()->status)->toBe($status)->and($assessment->score)->toBe($score);
    $rule = collect($assessment->results)->firstWhere('id', 'honeypot');
    expect($rule['outcome'])->toBe($mode === 'off' ? 'off' : 'flagged');
})->with([['off', 'approved', 0], ['monitor', 'approved', 0], ['enforce', 'pending', 20]]);

it('requires applicable enforced rules and their evidence even with a permissive score', function (string $scenario) {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['max_score'] = 900;
    $config['rules']['commission_amount']['mode'] = 'off';
    if ($scenario === 'missing_history') {
        $config['rules']['publisher_history']['mode'] = 'enforce';
    } elseif ($scenario === 'not_applicable') {
        $config['rules']['commission_amount']['mode'] = 'enforce';
        $config['rules']['commission_amount']['event_types'] = ['purchase'];
    }
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f);
    $assessment = assessFraud($earning);
    expect($earning->fresh()->status)->toBe('pending')->and($assessment->recommendation)->toBe('manual_review');
})->with(['all_off', 'missing_history', 'not_applicable']);

it('inherits individual rules and prevents campaign overrides from bypassing network stops', function (string $mode) {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['mode'] = $mode;
    saveFraudConfig($f, $config);
    saveFraudConfig($f, ['mode' => 'automatic', 'rules' => ['honeypot' => [...$config['rules']['honeypot'], 'mode' => 'enforce']]], true);
    $effective = app(FraudPolicyService::class)->effective($f['network']->id, $f['campaign']->id);
    expect($effective['configuration']['mode'])->toBe($mode)->and($effective['configuration']['rules']['commission_amount']['mode'])->toBe('enforce')
        ->and($effective['configuration']['rules']['honeypot']['mode'])->toBe('enforce');
    $earning = fraudEarning($this, $f);
    assessFraud($earning);
    expect($earning->fresh()->status)->toBe('pending');
})->with(['shadow', 'disabled']);

it('enforces network daily exposure across campaign overrides and resets at UTC midnight', function () {
    $this->travelTo(now()->utc()->startOfDay()->addHours(12));
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['limits']['USD']['daily_limit_minor'] = 1000;
    saveFraudConfig($f, $config);
    saveFraudConfig($f, ['limits' => ['USD' => ['max_commission_minor' => 100000, 'daily_limit_minor' => 100000]]], true);
    $first = fraudEarning($this, $f);
    $second = fraudEarning($this, $f);
    assessFraud($first);
    $blocked = assessFraud($second);
    expect($first->fresh()->status)->toBe('approved')->and($second->fresh()->status)->toBe('pending')
        ->and($blocked->reasons)->toContain('Network approval exposure limit is missing or exceeded.');
    $this->travel(1)->days();
    app(FraudAssessmentService::class)->request($second, true);
    assessFraud($second);
    expect($second->fresh()->status)->toBe('approved')->and(app(ReconciliationService::class)->inspect())->toBe([]);
});

it('keeps holds pending and reassesses with the latest policy when the hold expires', function () {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['wait_minutes']['submission'] = 60;
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f);
    $assessment = assessFraud($earning);
    expect($assessment->status)->toBe('waiting')->and($earning->fresh()->status)->toBe('pending');
    $config['mode'] = 'disabled';
    saveFraudConfig($f, $config);
    $this->travel(61)->minutes();
    $this->artisan('fraud:recover')->assertSuccessful();
    $latest = assessFraud($earning);
    expect($latest->id)->not->toBe($assessment->id)->and($assessment->fresh()->status)->toBe('superseded')
        ->and($earning->fresh()->status)->toBe('pending')->and($latest->policy_snapshot['configuration']['mode'])->toBe('disabled');
});

it('preserves human decisions and adjusted pending earnings', function (string $action) {
    $f = conversionFixture('CPS');
    saveFraudConfig($f, automaticFraudConfig());
    $earning = fraudEarning($this, $f, ['event_type' => 'purchase', 'amount' => '100.00']);
    $review = app(EarningReviewService::class);
    if ($action === 'approve') {
        $review->approve($earning, $f['advertiser']->user_id, 'Verified manually');
    } else {
        $review->adjust($earning, 'refund', '50.00', 'return-1', 'Ordinary return', $f['advertiser']->user_id);
    }
    $assessment = assessFraud($earning);
    expect($assessment->applied_at)->toBeNull()->and($earning->fresh()->status)->toBe($action === 'approve' ? 'approved' : 'pending');
    expect(app(ReconciliationService::class)->inspect())->toBe([]);
})->with(['approve', 'refund']);

it('supersedes an assessment if its policy changes while evidence is being collected', function () {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f);
    $collector = new FraudEvidenceService;
    $this->mock(FraudEvidenceService::class)->shouldReceive('collect')->once()->andReturnUsing(function ($earning, $configuration) use ($f, $config, $collector) {
        saveFraudConfig($f, [...$config, 'mode' => 'disabled']);

        return $collector->collect($earning, $configuration);
    });
    $assessment = assessFraud($earning);
    expect($assessment->status)->toBe('superseded')->and($earning->fresh()->status)->toBe('pending')
        ->and($earning->fraudAssessments()->count())->toBe(2);
});

it('keeps errors pending and recovers abandoned workers without applying stale results', function () {
    $f = conversionFixture();
    saveFraudConfig($f, automaticFraudConfig());
    $earning = fraudEarning($this, $f);
    $this->mock(FraudEvidenceService::class)->shouldReceive('collect')->once()->andThrow(new RuntimeException('provider unavailable'));
    $assessment = assessFraud($earning);
    expect($assessment->status)->toBe('error')->and($assessment->last_error)->not->toContain('provider unavailable')
        ->and($earning->fresh()->status)->toBe('pending')->and($assessment->next_attempt_at->isFuture())->toBeTrue();
    $assessment->update(['status' => 'running', 'updated_at' => now()->subMinutes(11)]);
    $this->artisan('fraud:recover')->assertSuccessful();
    expect($assessment->fresh()->status)->toBe('error');
    Queue::assertPushed(AssessConversionFraud::class);
});

it('uses visitor IP counts and allows distinct orders below configured repetition limits', function () {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['rules']['repetition']['mode'] = 'enforce';
    $config['rules']['repetition']['settings']['ip_limit'] = 1;
    saveFraudConfig($f, $config);
    $first = fraudEarning($this, $f);
    $second = fraudEarning($this, $f);
    $firstAssessment = assessFraud($first);
    $secondAssessment = assessFraud($second);
    expect($firstAssessment->evidence['repetition']['ip'])->toBe(1)->and($secondAssessment->evidence['repetition']['ip'])->toBe(2)
        ->and($first->fresh()->status)->toBe('approved')->and($second->fresh()->status)->toBe('pending');
});

it('rejects malformed rule configuration and stale policy edits', function () {
    $f = conversionFixture();
    $service = app(FraudPolicyService::class);
    foreach ([['rules' => ['invented' => []]], ['rules' => ['honeypot' => ['mode' => 'enforce']]], ['limits' => ['XXX' => ['max_commission_minor' => 1, 'daily_limit_minor' => 1]]], ['wait_minutes' => ['purchase' => -1]]] as $invalid) {
        expect(fn () => $service->validate($invalid, $f['network']->id, null))->toThrow(ValidationException::class);
    }
    $version = saveFraudConfig($f, automaticFraudConfig());
    expect(fn () => $service->save($f['network']->id, null, [], $f['advertiser']->user_id, 'Stale', null))->toThrow(HttpException::class);
    expect(fn () => $version->update(['reason' => 'rewrite']))->toThrow(LogicException::class);
});

it('previews changed rules with missing evidence without writing decisions', function () {
    $f = conversionFixture();
    saveFraudConfig($f, [...automaticFraudConfig(), 'mode' => 'shadow']);
    $earning = fraudEarning($this, $f);
    assessFraud($earning);
    $proposal = automaticFraudConfig();
    $proposal['rules']['velocity']['mode'] = 'enforce';
    $preview = app(FraudReportingService::class)->preview($f['network']->id, null, $proposal);
    expect($preview['sample_size'])->toBe(1)->and($preview['current_eligible'])->toBe(1)->and($preview['proposed_eligible'])->toBe(0)
        ->and($preview['rows'][0]['missing_evidence'])->toContain('Conversion velocity')
        ->and($earning->fresh()->status)->toBe('pending')->and(FraudAssessment::count())->toBe(1);
});

it('separates reviewer disagreement from confirmed legitimate outcomes and ordinary returns', function () {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    $config['rules']['honeypot']['mode'] = 'enforce';
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f, ['spam_checks' => ['honeypot_filled' => true, 'form_duration_ms' => 5000, 'is_spam' => false]]);
    assessFraud($earning);
    app(EarningReviewService::class)->approve($earning, $f['advertiser']->user_id, 'Manual override');
    $report = fn () => collect(app(FraudReportingService::class)->statistics($f['network']->id, null)['rules'])->firstWhere('id', 'honeypot');
    expect($report()['reviewer_disagreements'])->toBe(1)->and($report()['confirmed_legitimate'])->toBe(0);
    foreach (['legitimate', 'ordinary_return'] as $outcome) {
        FraudFeedback::create(['earning_id' => $earning->id, 'network_id' => $earning->network_id, 'actor_id' => $f['advertiser']->user_id,
            'outcome' => $outcome, 'reason' => 'Verified outcome', 'created_at' => now()]);
        expect($report()['confirmed_legitimate'])->toBe($outcome === 'legitimate' ? 1 : 0)->and($report()['confirmed_fraud'])->toBe(0);
    }
});

it('authorizes policy changes and assessment evidence by permission and network', function () {
    $f = conversionFixture();
    $foreign = conversionFixture();
    $earning = fraudEarning($this, $f);
    $otherEarning = fraudEarning($this, $foreign);
    $owner = User::factory()->create(['is_network' => true]);
    UserNetworks::create(['user_id' => $owner->id, 'network_id' => $f['network']->id, 'status' => 'A']);
    foreach (['review_commissions', 'manage_fraud_rules'] as $permission) {
        $owner->givePermissionTo(Permission::findOrCreate($permission, 'web'));
    }
    $this->actingAs($owner)->get('/finance/fraud')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/fraud/index')->where('networkId', $f['network']->id));
    $this->get('/finance/earnings/'.$earning->id.'/fraud')->assertOk();
    $this->getJson('/finance/earnings/'.$otherEarning->id.'/fraud')->assertForbidden();
    $this->postJson('/finance/fraud/policy', ['network_id' => $foreign['network']->id, 'configuration' => [], 'expected_version' => null, 'reason' => 'Foreign'])->assertForbidden();
    $this->postJson('/finance/fraud/policy', ['network_id' => $f['network']->id, 'campaign_id' => $foreign['campaign']->id, 'configuration' => [], 'expected_version' => null, 'reason' => 'Foreign'])->assertNotFound();
    $this->post('/finance/fraud/policy', ['network_id' => $f['network']->id, 'configuration' => automaticFraudConfig(), 'expected_version' => null, 'reason' => 'Enable pilot'])->assertRedirect()->assertSessionHasNoErrors();
    $owner->revokePermissionTo('manage_fraud_rules');
    $this->postJson('/finance/fraud/policy', ['network_id' => $f['network']->id, 'configuration' => [], 'expected_version' => 1, 'reason' => 'No permission'])->assertForbidden();
    $this->get('/finance/earnings/'.$earning->id.'/fraud')->assertOk();
});

it('evaluates rule thresholds inclusively without redistributing disabled weights', function (string $id, array $evidence, string $outcome) {
    $registry = app(FraudRuleRegistry::class);
    $rules = $registry->defaults();
    foreach ($rules as &$rule) {
        $rule['mode'] = 'off';
    }
    unset($rule);
    $rules[$id]['mode'] = 'enforce';
    $result = $registry->evaluate($rules, ['event_type' => 'submission', ...$evidence], 0);
    expect(collect($result['results'])->firstWhere('id', $id)['outcome'])->toBe($outcome)
        ->and($result['score'])->toBe($outcome === 'flagged' ? 20 : 0)
        ->and($result['recommendation'])->toBe($outcome === 'passed' ? 'approve' : 'manual_review');
})->with([
    ['honeypot', ['spam_checks' => ['honeypot_filled' => false]], 'passed'],
    ['honeypot', ['spam_checks' => ['honeypot_filled' => true]], 'flagged'],
    ['merchant_spam', ['spam_checks' => ['is_spam' => true]], 'flagged'],
    ['submission_timing', ['spam_checks' => ['form_duration_ms' => 1000]], 'passed'],
    ['submission_timing', ['spam_checks' => ['form_duration_ms' => 999]], 'flagged'],
    ['conversion_timing', ['click_to_conversion_seconds' => 2], 'passed'],
    ['conversion_timing', ['click_to_conversion_seconds' => 1], 'flagged'],
    ['velocity', ['velocity' => ['window_minutes' => 60, 'publisher' => 100, 'assignment' => 50]], 'passed'],
    ['velocity', ['velocity' => ['window_minutes' => 60, 'publisher' => 101, 'assignment' => 1]], 'flagged'],
    ['velocity', ['velocity' => ['window_minutes' => 60, 'publisher' => 1, 'assignment' => 51]], 'flagged'],
    ['velocity', ['velocity' => ['window_minutes' => 10, 'publisher' => 1, 'assignment' => 1]], 'unavailable'],
    ['repetition', ['repetition' => ['window_minutes' => 60, 'referral' => 5, 'ip' => 20]], 'passed'],
    ['repetition', ['repetition' => ['window_minutes' => 60, 'referral' => 6, 'ip' => 1]], 'flagged'],
    ['repetition', ['repetition' => ['window_minutes' => 60, 'referral' => 1, 'ip' => null]], 'unavailable'],
    ['commission_amount', ['commission_minor' => 10000], 'passed'],
    ['commission_amount', ['commission_minor' => 10001], 'flagged'],
    ['publisher_history', ['publisher_history' => ['maturity_days' => 30, 'classified' => 20, 'fraud' => 1]], 'passed'],
    ['publisher_history', ['publisher_history' => ['maturity_days' => 30, 'classified' => 20, 'fraud' => 2]], 'flagged'],
    ['publisher_history', ['publisher_history' => ['maturity_days' => 30, 'classified' => 19, 'fraud' => 0]], 'unavailable'],
    ['traffic_evidence', ['traffic' => ['source' => 'search', 'device' => 'desktop']], 'passed'],
    ['traffic_evidence', ['traffic' => ['source' => null, 'device' => 'unknown']], 'flagged'],
]);

it('does not collect evidence when assessment is disabled', function () {
    $f = conversionFixture();
    saveFraudConfig($f, ['mode' => 'disabled']);
    $earning = fraudEarning($this, $f);
    $this->mock(FraudEvidenceService::class)->shouldNotReceive('collect');
    expect(assessFraud($earning)->results)->toBeNull()->and($earning->fresh()->status)->toBe('pending');
});

it('requires currency limits and eligible event and assignment scopes', function (string $scenario) {
    $f = conversionFixture();
    $config = automaticFraudConfig();
    if ($scenario === 'missing_currency') {
        $config['limits'] = [];
    } elseif ($scenario === 'amount_limit') {
        $config['limits']['USD']['max_commission_minor'] = 999;
    } elseif ($scenario === 'event') {
        $config['event_types'] = ['purchase'];
    } else {
        $other = $f['assignment']->replicate(['script_token']);
        $publisher = $f['publisher']->replicate();
        $publisher->user_id = User::factory()->create(['is_publisher' => true])->id;
        $publisher->save();
        $other->publisher_id = $publisher->id;
        $other->save();
        $config['assignment_ids'] = [$other->id];
    }
    saveFraudConfig($f, $config);
    $earning = fraudEarning($this, $f);
    expect(assessFraud($earning)->recommendation)->toBe('manual_review')->and($earning->fresh()->status)->toBe('pending');
})->with(['missing_currency', 'amount_limit', 'event', 'assignment']);

it('restores a previous configuration as a new audited version', function () {
    $f = conversionFixture();
    $first = saveFraudConfig($f, automaticFraudConfig());
    $second = saveFraudConfig($f, ['mode' => 'disabled']);
    $admin = User::factory()->create(['is_super_admin' => true]);
    $this->actingAs($admin)->post('/finance/fraud/restore', ['network_id' => $f['network']->id, 'expected_version' => $second->id,
        'version_id' => $first->id, 'reason' => 'Restore tested settings'])->assertRedirect()->assertSessionHasNoErrors();
    $third = FraudPolicyVersion::latest('id')->first();
    expect($third->version)->toBe(3)->and($third->configuration)->toBe($first->configuration)
        ->and($third->actor_id)->toBe($admin->id)->and($third->reason)->toBe('Restore tested settings');
    expect($first->fresh()->configuration)->toBe($first->configuration);
});

it('preserves campaign exceptions in a network-wide policy preview', function () {
    $f = conversionFixture();
    $configuration = automaticFraudConfig();
    $configuration['mode'] = 'shadow';
    saveFraudConfig($f, $configuration);
    saveFraudConfig($f, ['rules' => ['honeypot' => [...$configuration['rules']['honeypot'], 'mode' => 'enforce']]], true);
    $earning = fraudEarning($this, $f, ['spam_checks' => ['honeypot_filled' => true, 'form_duration_ms' => 5000, 'is_spam' => false]]);
    assessFraud($earning);
    $preview = app(FraudReportingService::class)->preview($f['network']->id, null, $configuration);
    expect($preview['current_eligible'])->toBe(0)->and($preview['proposed_eligible'])->toBe(0);
    $campaignPreview = app(FraudReportingService::class)->preview($f['network']->id, $f['campaign']->id, []);
    expect($campaignPreview['proposed_eligible'])->toBe(1);
});

it('keeps a conversion classified as fraud pending until its outcome is corrected', function () {
    $f = conversionFixture();
    saveFraudConfig($f, automaticFraudConfig());
    $earning = fraudEarning($this, $f);
    FraudFeedback::create(['earning_id' => $earning->id, 'network_id' => $earning->network_id, 'actor_id' => $f['advertiser']->user_id,
        'outcome' => 'fraud', 'reason' => 'Verified fraudulent submission', 'created_at' => now()]);
    expect(assessFraud($earning)->recommendation)->toBe('manual_review')->and($earning->fresh()->status)->toBe('pending');
    FraudFeedback::create(['earning_id' => $earning->id, 'network_id' => $earning->network_id, 'actor_id' => $f['advertiser']->user_id,
        'outcome' => 'legitimate', 'reason' => 'Correction after investigation', 'created_at' => now()]);
    app(FraudAssessmentService::class)->request($earning, true);
    expect(assessFraud($earning)->applied_at)->not->toBeNull();
});
