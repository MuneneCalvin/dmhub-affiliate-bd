<?php

use App\Http\Middleware\EnsureNetworkOwner;
use App\Jobs\SendUserCredentialsJob;
use App\Mail\UserCredentialsMail;
use App\Models\Advertiser;
use App\Models\Campaign;
use App\Models\Clicks;
use App\Models\Conversion;
use App\Models\Creative;
use App\Models\Network;
use App\Models\Offer;
use App\Models\PostbackCredential;
use App\Models\Publisher;
use App\Models\PublisherCampaigns;
use App\Models\PublisherEarning;
use App\Models\PublisherInvoice;
use App\Models\User;
use App\Models\UserNetworks;
use App\Services\Finance\EarningReviewService;
use App\Services\Finance\FundingService;
use App\Services\InvoiceService;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Symfony\Component\Process\Process;

function containmentContext(?Offer $offer = null): array
{
    if ($offer) {
        $campaign = $offer->campaign;
        $advertiser = $campaign->advertiser;
        $advertiserUser = $advertiser->user;
        $network = $advertiser->network;
    } else {
        $network = Network::forceCreate(['network_name' => fake()->company(), 'owner_email' => fake()->safeEmail(), 'status' => 'A', 'default_currency' => 'USD', 'pay_day_of_week' => 3, 'default_commission_model' => 'P', 'default_commission_value' => 0]);
        $advertiserUser = User::factory()->create(['is_advertiser' => true]);
        $advertiser = Advertiser::create(['user_id' => $advertiserUser->id, 'network_id' => $network->id, 'business_name' => 'Merchant', 'website_name' => 'https://merchant.example', 'industry' => 'retail', 'status' => 'A', 'available_budget' => 0, 'currency' => 'USD']);
        app(FundingService::class)->deposit($advertiser, '1000.00', 'USD', (string) Str::uuid(), 'Test deposit', $advertiserUser->id);
        $campaign = Campaign::create(['network_id' => $network->id, 'advertiser_id' => $advertiser->id, 'name' => 'Campaign', 'start_date' => now()->subDay(), 'end_date' => now()->addMonth(), 'campaign_status' => 'A', 'currency' => 'USD', 'total_budget' => 1000]);
        $offer = Offer::create(['campaign_id' => $campaign->id, 'network_id' => $network->id, 'name' => 'Offer', 'offer_status' => 'A', 'preview_url' => 'https://merchant.example/?click_id=old#details']);
    }
    $publisherUser = User::factory()->create(['is_publisher' => true]);
    $publisher = Publisher::create(['user_id' => $publisherUser->id, 'network_id' => $network->id, 'website_url' => 'https://publisher.example']);
    $assignment = PublisherCampaigns::create(['publisher_id' => $publisher->id, 'network_id' => $network->id, 'campaign_id' => $campaign->id, 'offer_id' => $offer->id, 'status' => 'A', 'commission_type' => 'CPL', 'commission_value' => 10, 'tracking_link' => url('/t/'.fake()->uuid())]);
    $creative = Creative::create(['campaign_id' => $campaign->id, 'offer_id' => $offer->id, 'name' => 'Creative '.fake()->uuid(), 'file_url' => 'https://publisher.example/banner.png', 'type' => 'text', 'status' => 'A']);

    return compact('network', 'advertiserUser', 'advertiser', 'campaign', 'offer', 'publisherUser', 'publisher', 'assignment', 'creative');
}

function containmentClick(array $context): Clicks
{
    return Clicks::create(['publisher_id' => $context['publisher']->id, 'network_id' => $context['network']->id, 'campaign_id' => $context['campaign']->id, 'offer_id' => $context['offer']->id, 'publisher_campaign_id' => $context['assignment']->id, 'creative_id' => $context['creative']->id, 'clicked_at' => now()]);
}

function containmentCredential(Advertiser $advertiser, array $attributes = []): array
{
    $token = Str::random(64);
    $credential = PostbackCredential::create(array_merge(['advertiser_id' => $advertiser->id, 'name' => 'test', 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addDay()], $attributes));

    return [$credential, $token];
}

function containmentEventPayload(Clicks $click, array $fields = []): array
{
    return array_merge(['event_type' => 'submission', 'successful' => true,
        'spam_checks' => ['honeypot_filled' => false, 'form_duration_ms' => 5000, 'is_spam' => false],
        'click_id' => $click->id, 'external_id' => 'submission:'.$click->id,
        'occurred_at' => $click->clicked_at->toISOString(), 'amount' => '0.00', 'currency' => 'USD'], $fields);
}

function containmentConfirm($test, array $context, Clicks $click): void
{
    [, $token] = containmentCredential($context['advertiser']);
    $test->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click))->assertCreated();
}

function containmentManager(Network $network): User
{
    $user = User::factory()->create(['is_network' => true]);
    $role = Role::findByName('network_owner');
    $user->assignRoleById($role->id);
    UserNetworks::create(['user_id' => $user->id, 'network_id' => $network->id]);

    return $user;
}

beforeEach(function () {
    $this->seed(RolePermsSeeder::class);
});

it('attributes creative clicks and submissions to each of two publishers on the same offer', function () {
    $first = containmentContext();
    $second = containmentContext($first['offer']);
    foreach ([$first, $second] as $context) {
        $this->get('/c/'.$context['creative']->tracking_code.'?pc='.$context['assignment']->script_token)->assertRedirect();
        $click = Clicks::latest('id')->firstOrFail();
        expect($click->publisher_id)->toBe($context['publisher']->id);
        expect($click->publisher_campaign_id)->toBe($context['assignment']->id);
        containmentConfirm($this, $context, $click);
        $this->assertDatabaseHas('publisher_earnings', ['publisher_id' => $context['publisher']->id]);
    }
});

it('rejects unscoped creative traffic and preserves click parameters before URL fragments', function () {
    $context = containmentContext();
    $this->get('/c/'.$context['creative']->tracking_code)->assertStatus(422);
    expect(Clicks::count())->toBe(0);
    $response = $this->get($context['assignment']->tracking_link);
    $click = Clicks::firstOrFail();
    $response->assertRedirect('https://merchant.example/?click_id='.$click->id.'&referral_id='.$click->referral_id.'#details');
    [, $token] = containmentCredential($context['advertiser']);
    $this->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click, ['click_id' => null, 'tracking_code' => $context['creative']->tracking_code]))->assertUnprocessable();
    expect(Conversion::count())->toBe(0);
});

it('rejects contradictory attribution without creating conversions or earnings', function (string $identifier) {
    $context = containmentContext();
    $other = containmentContext();
    $click = containmentClick($context);
    $value = match ($identifier) {
        'script_token' => $other['assignment']->script_token,
        'tracking_code' => $other['creative']->tracking_code,
        'publisher_campaign_id' => $other['assignment']->id,
    };
    [, $token] = containmentCredential($context['advertiser']);
    $this->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click, [$identifier => $value]))->assertUnprocessable();
    expect(Conversion::count())->toBe(0);
    expect(PublisherEarning::count())->toBe(0);
})->with(['script_token', 'tracking_code', 'publisher_campaign_id']);

it('rejects another publisher script token even when campaign and offer match', function () {
    $first = containmentContext();
    $second = containmentContext($first['offer']);
    $click = containmentClick($second);
    [, $token] = containmentCredential($first['advertiser']);
    $this->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click, ['script_token' => $first['assignment']->script_token]))->assertUnprocessable();
    expect(Conversion::count())->toBe(0);
});

it('rejects sensitive or intercepted payloads at the conversion endpoint', function (array $unsafe) {
    $context = containmentContext();
    $click = containmentClick($context);
    [, $token] = containmentCredential($context['advertiser']);
    $payload = containmentEventPayload($click, $unsafe);
    $this->withToken($token)->postJson('/api/v1/events', $payload)->assertUnprocessable();
    expect(Conversion::count())->toBe(0);
})->with([
    'password' => [['password' => 'sensitive']],
    'payment data' => [['card_number' => 'sensitive']],
    'nested custom capture' => [['custom_fields' => ['answers' => ['password' => 'sensitive']]]],
    'extra capture' => [['extra' => ['private_answer' => 'sensitive']]],
    'stale interception' => [['intercepted' => true]],
]);

it('does not observe forms and sends only explicitly allowed fields from the served script', function () {
    $context = containmentContext();
    $response = $this->get($context['assignment']->getScriptUrl())->assertOk();
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
    $process = new Process(['node', base_path('tests/js/publisher-script.mjs')]);
    $process->setInput($response->getContent());
    $process->mustRun();
    expect(trim($process->getOutput()))->toBe('ok');
});

it('blocks suspended accounts across tracking, scripts, and submission events', function (string $actor) {
    $context = containmentContext();
    $click = containmentClick($context);
    $context[$actor]->update(['status' => 'P']);
    $this->get($context['assignment']->tracking_link)->assertForbidden();
    $this->get($context['assignment']->getScriptUrl())->assertForbidden();
    [, $token] = containmentCredential($context['advertiser']);
    expect($this->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click))->status())->toBeIn([401, 403]);
    expect(Conversion::count())->toBe(0);
})->with(['publisherUser', 'advertiserUser', 'network']);

it('scopes submission events to the credential advertiser', function () {
    $own = containmentContext();
    $other = containmentContext();
    $ownClick = containmentClick($own);
    $otherClick = containmentClick($other);
    [, $ownToken] = containmentCredential($own['advertiser']);
    [, $otherToken] = containmentCredential($other['advertiser']);
    $this->withToken($otherToken)->postJson('/api/v1/events', containmentEventPayload($otherClick))->assertCreated();
    $this->withToken($ownToken)->postJson('/api/v1/events', containmentEventPayload($otherClick))->assertNotFound();
    $this->postJson('/api/v1/events', containmentEventPayload($ownClick))->assertCreated();
    expect(Conversion::count())->toBe(2);
});

it('rejects expired and revoked credentials while allowing an independent rotation key', function () {
    $context = containmentContext();
    $click = containmentClick($context);
    [$old, $oldToken] = containmentCredential($context['advertiser']);
    [, $newToken] = containmentCredential($context['advertiser']);
    $old->update(['revoked_at' => now()]);
    $this->withToken($oldToken)->postJson('/api/v1/events', ['click_id' => $click->id])->assertUnauthorized();
    $old->update(['revoked_at' => null, 'expires_at' => now()->subSecond()]);
    $this->postJson('/api/v1/events', ['click_id' => $click->id])->assertUnauthorized();
    $this->withToken($newToken)->postJson('/api/v1/events', containmentEventPayload($click))->assertCreated();
    $this->getJson('/api/v1/events?click_id='.$click->id)->assertStatus(405);
    $this->getJson('/api/postback/lead/info')->assertNotFound();
    $this->postJson('/api/v1/events?click_id='.$click->id)->assertUnprocessable();
    expect($old->getAttributes())->not->toHaveKey('token');
    expect($old->token_hash)->toBe(hash('sha256', $oldToken));
});

it('fails closed for removed membership and isolates application reads and writes', function () {
    $own = containmentContext();
    $other = containmentContext();
    $user = containmentManager($own['network']);
    $this->actingAs($user)->get('/applications/index?status=all')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->has('applications.data', 1)->where('applications.data.0.id', $own['assignment']->id));
    $this->get('/applications/show/'.$other['assignment']->id)->assertNotFound();
    $this->post('/applications/approve/'.$other['assignment']->id, ['offer_id' => $other['offer']->id])->assertNotFound();
    $this->post('/applications/reject/'.$other['assignment']->id, ['rejection_reason' => 'No'])->assertNotFound();
    UserNetworks::where('user_id', $user->id)->delete();
    $this->get('/applications/index')->assertForbidden();
    $this->get('/applications/show/'.$other['assignment']->id)->assertForbidden();
    $this->post('/applications/approve/'.$other['assignment']->id, ['offer_id' => $other['offer']->id])->assertForbidden();
    $this->post('/applications/reject/'.$other['assignment']->id, ['rejection_reason' => 'No'])->assertForbidden();
    expect($other['assignment']->fresh()->status)->toBe('A');
});

it('enforces verification and status even for super admins and settings access', function () {
    $user = User::factory()->unverified()->create(['is_super_admin' => true]);
    $this->actingAs($user)->get('/admin/dashboard')->assertRedirect(route('verification.notice'));
    $user->forceFill(['email_verified_at' => now(), 'status' => 'P'])->save();
    $this->getJson('/admin/dashboard')->assertForbidden();
    $this->getJson('/settings/profile')->assertForbidden();
});

it('scopes applications even if the network route guard is bypassed', function () {
    $context = containmentContext();
    $user = containmentManager($context['network']);
    UserNetworks::where('user_id', $user->id)->delete();
    $this->withoutMiddleware(EnsureNetworkOwner::class)->actingAs($user);
    $this->get('/applications/index?status=all')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->has('applications.data', 0));
    $this->get('/applications/show/'.$context['assignment']->id)->assertNotFound();
    $this->post('/applications/approve/'.$context['assignment']->id, ['offer_id' => $context['offer']->id])->assertNotFound();
    $this->post('/applications/reject/'.$context['assignment']->id, ['rejection_reason' => 'No'])->assertNotFound();
});

it('synchronizes built-in account category flags when the administrator assigns a role', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $user = User::factory()->create();
    $role = Role::findByName('network_owner');
    $this->actingAs($admin)->post('/system/settings/users/'.$user->id.'/assign-roles', ['role_id' => $role->id])->assertRedirect();
    expect($user->fresh()->is_network)->toBeTrue();
    $this->assertDatabaseHas('user_roles', ['user_id' => $user->id, 'role_id' => $role->id]);
    // A role assignment alone cannot fabricate network membership.
    $this->actingAs($user->fresh())->get('/applications/index')->assertForbidden();
});

it('serves the same explicit integration contract in public and publisher guides', function () {
    $context = containmentContext();
    $this->get('/docs/script/'.$context['assignment']->script_token)->assertOk()->assertSee('DMHub.getReferral')->assertDontSee('DMHub.show()');
    $markdown = $this->get('/docs/script/'.$context['assignment']->script_token.'/download')->assertOk()->getContent();
    expect($markdown)->toContain('getReferral()')->not->toContain('interception active');
    $context['publisherUser']->assignRoleById(Role::findByName('publisher')->id);
    $this->actingAs($context['publisherUser'])->get('/publisher/scripts/'.$context['assignment']->id.'/docs')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->where('documentation.troubleshooting.issues.0.solutions.0', fn ($value) => str_contains($value, 'active publisher assignment')));
});

it('allows a pending user to close access and rejects closed account login', function () {
    $user = User::factory()->withoutTwoFactor()->create(['status' => 'P']);
    $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])->assertRedirect('/');
    $user->refresh()->update(['password' => 'new-password']);
    $this->post('/login', ['email' => $user->email, 'password' => 'new-password'])->assertSessionHasErrors('email');
    $this->assertGuest();
});

it('issues and revokes credentials through the operational command', function () {
    $context = containmentContext();
    $this->artisan('postback:credentials', ['advertiser' => $context['advertiser']->id, '--name' => 'merchant', '--days' => 7])->assertSuccessful();
    $credential = PostbackCredential::firstOrFail();
    expect($credential->name)->toBe('merchant');
    expect($credential->expires_at->isAfter(now()->addDays(6)))->toBeTrue();
    $this->artisan('postback:credentials', ['advertiser' => $context['advertiser']->id, '--revoke' => $credential->id])->assertSuccessful();
    expect($credential->fresh()->revoked_at)->not->toBeNull();
    $this->artisan('postback:credentials', ['advertiser' => $context['advertiser']->id, '--days' => 0])->assertFailed();
});

it('requires live invoice approval permissions despite the network role flag', function () {
    $context = containmentContext();
    $user = containmentManager($context['network']);
    $permission = Permission::findByName('approve_network_invoices');
    $role = Role::findByName('network_owner');
    $role->givePermissionTo($permission);
    $click = containmentClick($context);
    containmentConfirm($this, $context, $click);
    $earning = PublisherEarning::latest('id')->firstOrFail();
    app(EarningReviewService::class)->approve($earning, $user->id, 'Reviewed');
    $invoice = app(InvoiceService::class)->createInvoice($context['publisher']);
    $this->actingAs($user)->post('/admin/invoices/'.$invoice->id.'/approve')->assertRedirect();
    expect($invoice->fresh()->status)->toBe('approved');
    $role->revokePermissionTo($permission);
    $this->post('/admin/invoices/'.$invoice->id.'/approve')->assertForbidden();
    expect($invoice->fresh()->status)->toBe('approved');
});

it('closes accounts without removing invoices earnings conversions or clicks', function (string $actor) {
    $context = containmentContext();
    $click = containmentClick($context);
    containmentConfirm($this, $context, $click);
    $invoice = PublisherInvoice::create(['invoice_number' => 'TEST-1', 'publisher_id' => $context['publisher']->id, 'network_id' => $context['network']->id, 'amount' => 10, 'period_start' => now()->subMonth(), 'period_end' => now()]);
    PublisherEarning::firstOrFail()->update(['invoice_id' => $invoice->id]);
    [$credential, $token] = containmentCredential($context['advertiser']);
    $user = $context[$actor];
    $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])->assertRedirect('/');
    $this->assertGuest();
    expect($user->fresh()->status)->toBe('C');
    expect($user->fresh()->closed_at)->not->toBeNull();
    expect(Conversion::count())->toBe(1);
    expect(Clicks::count())->toBe(1);
    expect(PublisherEarning::count())->toBe(1);
    expect(PublisherInvoice::count())->toBe(1);
    $this->get($context['assignment']->tracking_link)->assertForbidden();
    $this->withToken($token)->postJson('/api/v1/events', containmentEventPayload($click))->assertStatus($actor === 'advertiserUser' ? 401 : 200);
    $user->refresh()->update(['status' => 'A']);
    expect($user->fresh()->status)->toBe('C');
    $this->actingAs($user->fresh())->getJson('/settings/profile')->assertForbidden();
})->with(['publisherUser', 'advertiserUser']);

it('restricts database deletion along every retained account and financial dependency', function () {
    $context = containmentContext();
    $click = containmentClick($context);
    containmentConfirm($this, $context, $click);
    foreach (['publishers', 'advertisers', 'publisher_campaigns', 'clicks', 'publisher_earnings', 'publisher_invoices', 'network_earnings', 'network_invoices'] as $table) {
        foreach (Schema::getForeignKeys($table) as $key) {
            expect(strtolower($key['on_delete']))->toBe('restrict');
        }
    }
    // A nested transaction keeps PostgreSQL usable after the expected FK violation.
    expect(fn () => DB::transaction(fn () => DB::table('users')->where('id', $context['publisherUser']->id)->delete()))->toThrow(QueryException::class);
    expect(PublisherEarning::count())->toBe(1);
    expect(Clicks::count())->toBe(1);
});

it('issues one-use password setup links without putting passwords in queued jobs', function () {
    Mail::fake();
    $user = User::factory()->unverified()->create();
    $job = new SendUserCredentialsJob($user);
    expect(get_object_vars($job))->not->toHaveKey('password');
    $job->handle();
    Mail::assertSent(UserCredentialsMail::class, function ($mail) use ($user) {
        parse_str(parse_url($mail->setupUrl, PHP_URL_QUERY), $query);
        $token = basename(parse_url($mail->setupUrl, PHP_URL_PATH));
        expect($query['email'])->toBe($user->email);
        expect(Password::broker()->tokenExists($user, $token))->toBeTrue();
        $this->post(route('password.update'), ['token' => $token, 'email' => $user->email, 'password' => 'secure-new-password', 'password_confirmation' => 'secure-new-password'])->assertSessionHasNoErrors();
        expect(Password::broker()->tokenExists($user, $token))->toBeFalse();

        return true;
    });
});
