<?php

use App\Jobs\ProcessStoreWebhook;
use App\Models\ConversionEvent;
use App\Models\CustomerPromotion;
use App\Models\PromotionAdjustment;
use App\Models\PromotionGrant;
use App\Models\PromotionOrder;
use App\Models\PublisherEarning;
use App\Models\StoreConnection;
use App\Models\StoreWebhookDelivery;
use App\Services\Promotions\PromotionGrantService;
use App\Services\Promotions\ShopifyDiscountService;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\RolePermsSeeder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

function promotionConfig(array $overrides = []): array
{
    return array_replace(['name' => 'Partner benefit', 'type' => 'percentage', 'value' => '7.25', 'currency' => 'USD',
        'scope' => 'all', 'product_ids' => [], 'category_ids' => [], 'excluded_product_ids' => [],
        'exclude_sale_items' => false, 'minimum_subtotal' => '0', 'minimum_quantity' => 0,
        'combines_with_other_discounts' => false, 'starts_at' => now()->subHour()->toISOString(), 'ends_at' => null,
        'usage_limit' => 1, 'validity_hours' => 12, 'display' => 'bar', 'message' => '{benefit} from {offer_name}', 'applied_message' => '{saving} saved', 'commission_basis' => 'net_merchandise'], $overrides);
}
function promotionOrderPayload(PromotionGrant $grant, array $overrides = []): array
{
    return array_replace(['external_id' => 'order-42', 'grant_id' => $grant->id, 'paid_at' => now()->toISOString(), 'currency' => 'USD',
        'subtotal' => '100.00', 'discount' => '7.25', 'promotion_discount' => '7.25', 'shipping' => '5.00', 'tax' => '3.00', 'total' => '100.75'], $overrides);
}
beforeEach(function () {
    $this->freezeTime();
    $this->seed([RolePermsSeeder::class, CurrencySeeder::class]);
    $this->f = conversionFixture('CPS', '8.00');
    $this->manager = $this->f['advertiser']->user;
    $this->manager->assignRoleById(Role::findByName('advertiser')->id);
    $this->actingAs($this->manager);
    $this->token = Str::random(64);
    $this->store = StoreConnection::create(['advertiser_id' => $this->f['advertiser']->id, 'network_id' => $this->f['network']->id,
        'public_id' => (string) Str::uuid(), 'name' => 'Shop', 'platform' => 'woocommerce', 'domain' => 'test.example',
        'currency' => 'USD', 'status' => 'connected', 'token_hash' => hash('sha256', $this->token)]);
    $this->url = route('campaign.promotion.update', $this->f['offer']);
    $this->publish = fn (array $c = []) => $this->put($this->url, ['action' => 'publish', 'configuration' => promotionConfig($c), 'store_ids' => [$this->store->id]]);
    $this->grant = function () {
        ($this->publish)()->assertSessionHasNoErrors();
        $this->click = conversionClick($this->f);

        return app(PromotionGrantService::class)->issue($this->store, $this->click->referral_id, str_repeat('s', 32));
    };
});

it('keeps discounts unset until configured and versions arbitrary merchant values separately from commissions', function () {
    expect(CustomerPromotion::count())->toBe(0);
    ($this->publish)()->assertSessionHasNoErrors();
    $promotion = CustomerPromotion::sole();
    expect($promotion->published_version)->toBe(1)->and($promotion->versions()->first()->configuration['value'])->toBe('7.25');
    ($this->publish)(['type' => 'fixed_amount', 'value' => '23.40'])->assertSessionHasNoErrors();
    expect($promotion->fresh()->published_version)->toBe(2)
        ->and($promotion->versions()->oldest('id')->first()->configuration['value'])->toBe('7.25')
        ->and($this->f['assignment']->fresh()->commission_value)->toEqual('8.00');
});

it('does not change live versions or store bindings when saving a draft', function () {
    ($this->publish)();
    $this->put($this->url, ['action' => 'save', 'configuration' => promotionConfig(['value' => '31']), 'store_ids' => []])->assertSessionHasNoErrors();
    $p = CustomerPromotion::sole();
    expect($p->stores()->count())->toBe(1)->and($p->published_version)->toBe(1)->and($p->draft['value'])->toBe('31');
    $this->get(route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'offers']))
        ->assertInertia(fn (Assert $page) => $page->where('offerWorkspace.offers.0.customer_promotion.latest_published_version.configuration.value', '7.25'));
});

it('validates percentages, explicit values, selected scope, currency, dates and safe messages', function (array $override, string $error) {
    ($this->publish)($override)->assertSessionHasErrors($error);
    expect(CustomerPromotion::count())->toBe(0);
})->with([
    [['value' => ''], 'value'], [['value' => '101'], 'value'], [['value' => '-4'], 'value'],
    [['scope' => 'products'], 'product_ids'], [['currency' => 'EUR'], 'currency'],
    [['validity_hours' => 0], 'validity_hours'], [['ends_at' => '2001-01-01'], 'ends_at'],
    [['message' => '<script>alert(1)</script>'], 'message'], [['message' => '{untrusted}'], 'message'],
]);

it('scopes management and store bindings to the owning advertiser', function () {
    $other = conversionFixture('CPS');
    $this->put(route('campaign.promotion.update', $other['offer']), ['action' => 'pause'])->assertNotFound();
    $this->store->update(['advertiser_id' => $other['advertiser']->id]);
    ($this->publish)()->assertSessionHasErrors('store_ids');
});

it('requires authenticated store credentials and rejects foreign referrals', function () {
    ($this->publish)();
    $click = conversionClick($this->f);
    $payload = ['referral_id' => $click->referral_id, 'session' => str_repeat('s', 32)];
    $this->postJson('/api/v1/stores/grants', $payload)->assertUnauthorized();
    $this->withToken($this->f['token'])->postJson('/api/v1/stores/grants', $payload)->assertUnauthorized();
    $this->withToken($this->token)->postJson('/api/v1/stores/grants', $payload)->assertOk()->assertJsonPath('configuration.value', '7.25');
    $foreign = conversionClick(conversionFixture('CPS'));
    $this->postJson('/api/v1/stores/grants', [...$payload, 'referral_id' => $foreign->referral_id])->assertNotFound();
});

it('issues idempotent grants, preserves versions and separates commission budget from customer eligibility', function () {
    $g = ($this->grant)();
    $this->f['advertiser']->update(['available_budget' => 0]);
    ($this->publish)(['value' => '18.50']);
    $again = app(PromotionGrantService::class)->issue($this->store, $this->click->referral_id, str_repeat('s', 32));
    expect($again->id)->toBe($g->id)->and($again->version->configuration['value'])->toBe('7.25');
    $fresh = app(PromotionGrantService::class)->issue($this->store, $this->click->referral_id, str_repeat('t', 32));
    expect($fresh->version->configuration['value'])->toBe('18.50');
});

it('pauses new grants without revoking issued grants and binds lookups to the session', function () {
    $g = ($this->grant)();
    $this->put($this->url, ['action' => 'pause'])->assertSessionHasNoErrors();
    $this->withToken($this->token)->postJson('/api/v1/stores/grants', ['referral_id' => $this->click->referral_id, 'session' => str_repeat('t', 32)])->assertUnprocessable();
    $this->postJson('/api/v1/stores/grants/'.$g->id, ['session' => str_repeat('s', 32)])->assertOk();
    $this->postJson('/api/v1/stores/grants/'.$g->id, ['session' => str_repeat('t', 32)])->assertNotFound();
    $this->travel(13)->hours();
    $this->postJson('/api/v1/stores/grants/'.$g->id, ['session' => str_repeat('s', 32)])->assertUnprocessable();
});

it('records paid orders once and commissions the configured net basis', function () {
    $g = ($this->grant)();
    $p = promotionOrderPayload($g);
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', $p)->assertAccepted()->assertJsonPath('status', 'confirmed');
    $this->postJson('/api/v1/stores/orders', $p)->assertAccepted();
    $this->postJson('/api/v1/stores/orders', [...$p, 'total' => '1.00'])->assertConflict();
    expect(PromotionOrder::count())->toBe(1)->and(PublisherEarning::count())->toBe(1)
        ->and(ConversionEvent::sole()->amount)->toBe('92.75');
});

it('retains real orders for review after funding changes or delayed callbacks', function () {
    $g = ($this->grant)();
    $payload = promotionOrderPayload($g);
    $this->travel(80)->hours();
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', $payload)->assertAccepted()->assertJsonPath('status', 'needs_review');
    expect(PromotionOrder::count())->toBe(1)->and(PublisherEarning::count())->toBe(0);
});

it('records zero-value orders without a fabricated positive commission basis', function () {
    $g = ($this->grant)();
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', promotionOrderPayload($g, [
        'discount' => '100.00', 'promotion_discount' => '100.00', 'shipping' => '0.00', 'tax' => '0.00', 'total' => '0.00',
    ]))->assertAccepted()->assertJsonPath('status', 'no_commission');
    expect(PublisherEarning::count())->toBe(0);
});

it('retains inconsistent totals for review and rejects repeated grant redemption', function () {
    $g = ($this->grant)();
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', promotionOrderPayload($g, ['total' => '1.00']))->assertAccepted()->assertJsonPath('status', 'needs_review');
    $this->postJson('/api/v1/stores/orders', promotionOrderPayload($g, ['external_id' => 'other-order']))->assertConflict();
});

it('deduplicates refunds without changing the original financial event', function () {
    $g = ($this->grant)();
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', promotionOrderPayload($g))->assertAccepted();
    $payload = ['external_id' => 'refund:1', 'order_external_id' => 'order-42', 'type' => 'refund', 'amount' => '20.00', 'currency' => 'USD'];
    $this->postJson('/api/v1/stores/adjustments', $payload)->assertAccepted();
    $this->postJson('/api/v1/stores/adjustments', $payload)->assertAccepted();
    $this->postJson('/api/v1/stores/adjustments', [...$payload, 'amount' => '30.00'])->assertConflict();
    expect(PromotionAdjustment::count())->toBe(1)->and(ConversionEvent::sole()->amount)->toBe('92.75');
});

it('blocks unsupported Shopify rules at publication', function () {
    $this->store->update(['platform' => 'shopify', 'domain' => 'sample.myshopify.com']);
    ($this->publish)(['exclude_sale_items' => true])->assertSessionHasErrors('stores');
    ($this->publish)(['minimum_subtotal' => '10', 'minimum_quantity' => 2])->assertSessionHasErrors('stores');
});

it('deploys Shopify discounts from stored configuration and recovers existing native discounts', function () {
    $this->store->update(['platform' => 'shopify', 'domain' => 'sample.myshopify.com', 'credentials' => ['access_token' => 'secret']]);
    $g = ($this->grant)();
    Http::preventStrayRequests();
    Http::fake(['sample.myshopify.com/*' => Http::sequence()
        ->push(['data' => ['codeDiscountNodeByCode' => null]])
        ->push(['data' => ['discountCodeBasicCreate' => ['codeDiscountNode' => ['id' => 'gid://shopify/DiscountCodeNode/1'], 'userErrors' => []]]])]);
    app(ShopifyDiscountService::class)->deploy($g);
    Http::assertSent(fn ($request) => str_contains($request['query'], 'discountCodeBasicCreate')
        && $request['variables']['input']['customerGets']['value']['percentage'] === 0.0725
        && $request['variables']['input']['code'] === $g->code);
    app(ShopifyDiscountService::class)->deploy($g);
    Http::assertSentCount(2);
});

it('sends Shopify GraphQL variables as a JSON object when there are none', function () {
    $this->store->update(['platform' => 'shopify', 'domain' => 'sample.myshopify.com', 'credentials' => ['access_token' => 'secret']]);
    Http::preventStrayRequests();
    Http::fake(['sample.myshopify.com/*' => Http::response(['data' => ['shop' => ['currencyCode' => 'EUR']]])]);
    app(ShopifyDiscountService::class)->graphql($this->store, '{shop{currencyCode}}');
    Http::assertSent(fn ($request) => str_contains($request->body(), '"variables":{}'));
});

it('authenticates Shopify proxy signatures and rejects forged webhooks', function () {
    config(['promotions.shopify.client_secret' => 'test-secret']);
    $this->getJson('/api/integrations/shopify/proxy?shop=sample.myshopify.com&signature=fake')->assertForbidden();
    $this->postJson('/api/integrations/shopify/webhooks', ['id' => 10])->assertUnauthorized();
});

it('exposes settings to managers without disclosing store credentials', function () {
    $this->store->update(['credentials' => ['access_token' => 'never-show-this']]);
    ($this->publish)();
    $this->get(route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'offers']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('offerWorkspace.offers.0.customer_promotion.draft.value', '7.25')
            ->missing('offerWorkspace.stores.0.credentials')->missing('offerWorkspace.stores.0.token_hash'))
        ->assertDontSee('never-show-this');
});

it('opens the requested campaign offer in the promotion editor and scopes store management', function () {
    $campaign = $this->f['campaign'];
    $other = conversionFixture('CPS');
    ($this->publish)()->assertSessionHasNoErrors();
    $this->get(route('campaign.promotions.edit', ['campaign' => $campaign, 'offer' => $this->f['offer']->id]))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->component('advertisercampaigns/offers/promotions')
        ->where('offer.id', $this->f['offer']->id)->where('offer.customer_promotion.draft.value', '7.25')
        ->where('stores.0.id', $this->store->id)->missing('stores.0.token_hash'));
    $this->get(route('campaign.promotions.edit', $campaign))->assertInertia(fn (Assert $page) => $page->where('offer', null));
    $this->get(route('campaign.promotions.edit', ['campaign' => $campaign, 'offer' => '']))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('offer', null));
    $this->get(route('campaign.promotions.edit', ['campaign' => $campaign, 'offer' => $other['offer']->id]))->assertNotFound();
    $this->get(route('campaign.promotions.edit', $other['campaign']))->assertNotFound();
});

it('uses store setup for discount offers even before publishing and while paused', function () {
    $f = $this->f;
    $f['assignment']->update(['commission_type' => 'CPL', 'script_impressions' => 1]);
    $guide = route('campaign.tracking.offer', [$f['campaign'], $f['offer']]);
    $this->put($this->url, ['action' => 'save', 'configuration' => promotionConfig(), 'store_ids' => []])->assertSessionHasNoErrors();
    foreach (['draft', 'active', 'paused'] as $status) {
        if ($status === 'active') {
            ($this->publish)()->assertSessionHasNoErrors();
        } elseif ($status === 'paused') {
            $this->put($this->url, ['action' => 'pause'])->assertSessionHasNoErrors();
        }
        $this->get($guide)->assertInertia(fn (Assert $page) => $page
            ->where('trackingWorkspace.promotion_status', $status)->where('trackingWorkspace.setup_options', ['promotion'])
            ->where('trackingWorkspace.embed_script', null)->where('trackingWorkspace.events_url', null));
    }
});

it('shows published store connections on the tracking hub and offer guide', function () {
    ($this->publish)()->assertSessionHasNoErrors();
    $hub = route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'tracking']);
    $guide = route('campaign.tracking.offer', [$this->f['campaign'], $this->f['offer']]);
    $this->get($hub)->assertInertia(fn (Assert $page) => $page->where('trackingHub.offers.0.stores.0.id', $this->store->id));
    $this->store->update(['status' => 'disconnected']);
    $this->get($guide)->assertInertia(fn (Assert $page) => $page->where('trackingWorkspace.stores.0.status', 'disconnected'));
});

it('lets a merchant add and activate a WooCommerce store without an opt-in flag', function () {
    $this->post(route('campaign.stores.store', $this->f['campaign']), [
        'name' => 'Merchant shop', 'platform' => 'woocommerce', 'domain' => 'merchant.example',
    ])->assertRedirect()->assertSessionHasNoErrors()->assertSessionHas('store_setup.token');
    $setup = session('store_setup');
    $store = StoreConnection::where('domain', 'merchant.example')->sole();
    expect($store->status)->toBe('pending')
        ->and($store->currency)->toBe($this->f['campaign']->currency)
        ->and($store->advertiser_id)->toBe($this->f['campaign']->advertiser_id)
        ->and($store->token_hash)->toBe(hash('sha256', $setup['token']));

    $this->withToken($setup['token'])->postJson('/api/v1/stores/connect', [
        'domain' => 'merchant.example', 'currency' => $store->currency,
    ])->assertOk()->assertJsonPath('connected', true);
    expect($store->fresh()->status)->toBe('connected');
    $this->get(route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'offers']))
        ->assertOk()->assertInertia(fn (Assert $page) => $page->has('offerWorkspace.stores', 2));
});

it('lets a merchant add and authorize Shopify from their campaign', function () {
    config(['promotions.shopify.client_id' => 'test-client', 'promotions.shopify.client_secret' => 'test-secret']);
    $this->post(route('campaign.stores.store', $this->f['campaign']), [
        'name' => 'Shopify shop', 'platform' => 'shopify', 'domain' => 'merchant.myshopify.com',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $store = StoreConnection::where('domain', 'merchant.myshopify.com')->sole();
    expect($store->status)->toBe('pending')->and($store->token_hash)->toBeNull();
    $response = $this->get(route('integrations.shopify.install', ['store' => $store, 'campaign' => $this->f['campaign']->id]))
        ->assertRedirect();
    $location = $response->headers->get('Location');
    expect(parse_url($location, PHP_URL_HOST))->toBe('merchant.myshopify.com');
    parse_str(parse_url($location, PHP_URL_QUERY), $authorization);
    expect($authorization['client_id'])->toBe('test-client');

    Http::preventStrayRequests();
    Http::fake([
        'https://merchant.myshopify.com/admin/oauth/access_token' => Http::response(['access_token' => 'merchant-secret']),
        'https://merchant.myshopify.com/admin/api/*' => Http::response(['data' => ['shop' => ['currencyCode' => 'USD']]]),
    ]);
    $query = ['shop' => $store->domain, 'state' => $authorization['state'], 'code' => 'approved-code'];
    ksort($query);
    $query['hmac'] = hash_hmac('sha256', http_build_query($query, '', '&', PHP_QUERY_RFC3986), 'test-secret');
    $this->get(route('integrations.shopify.callback', $query))
        ->assertRedirect(route('campaign.promotions.edit', $this->f['campaign']));
    expect($store->fresh()->status)->toBe('connected')->and($store->fresh()->credentials['access_token'])->toBe('merchant-secret');
    $this->get(route('advertiser.campaign.show', ['id' => $this->f['campaign']->id, 'tab' => 'offers']))
        ->assertOk()->assertDontSee('merchant-secret');
});

it('reports Shopify setup problems within the campaign and validates the canonical domain', function () {
    $this->post(route('campaign.stores.store', $this->f['campaign']), [
        'name' => 'Shopify shop', 'platform' => 'shopify', 'domain' => 'custom.example',
    ])->assertSessionHasErrors('domain');
    config(['promotions.shopify.client_id' => null, 'promotions.shopify.client_secret' => null]);
    $this->store->update(['platform' => 'shopify', 'domain' => 'merchant.myshopify.com']);
    $this->get(route('integrations.shopify.install', ['store' => $this->store, 'campaign' => $this->f['campaign']->id]))
        ->assertRedirect(route('campaign.promotions.edit', $this->f['campaign']))
        ->assertSessionHas('error', 'Shopify connection is not available yet. Contact your DM Hub administrator.');
});

it('supports configurable usage limits and unlimited redemption without hard-coded discount rules', function () {
    ($this->publish)(['usage_limit' => 2, 'value' => '13.85']);
    $click = conversionClick($this->f);
    $g = app(PromotionGrantService::class)->issue($this->store, $click->referral_id, str_repeat('s', 32));
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', promotionOrderPayload($g))->assertAccepted();
    expect($g->fresh()->redeemed_at)->toBeNull();
    $this->postJson('/api/v1/stores/orders', promotionOrderPayload($g, ['external_id' => 'second-order']))->assertAccepted();
    expect($g->fresh()->redeemed_at)->not->toBeNull();
    $this->postJson('/api/v1/stores/orders', promotionOrderPayload($g, ['external_id' => 'third-order']))->assertConflict();
});

it('calculates net merchandise commissions for tax-inclusive stores', function () {
    $g = ($this->grant)();
    $this->withToken($this->token)->postJson('/api/v1/stores/orders', promotionOrderPayload($g, [
        'subtotal' => '120.00', 'discount' => '12.00', 'promotion_discount' => '12.00', 'shipping' => '6.00',
        'tax' => '19.00', 'total' => '114.00', 'taxes_included' => true, 'shipping_tax' => '1.00',
    ]))->assertAccepted()->assertJsonPath('status', 'confirmed');
    expect(ConversionEvent::sole()->amount)->toBe('90.00');
});

it('requires a matching store handshake and hides disconnected connections from grant issuance', function () {
    $this->store->update(['status' => 'pending']);
    $this->withToken($this->token)->postJson('/api/v1/stores/connect', ['domain' => 'other.example', 'currency' => 'USD'])->assertUnprocessable();
    $this->postJson('/api/v1/stores/connect', ['domain' => 'test.example', 'currency' => 'USD'])->assertOk();
    $this->put(route('campaign.stores.update', [$this->f['campaign'], $this->store]), ['action' => 'disconnect'])->assertSessionHasNoErrors();
    $this->postJson('/api/v1/stores/connect', ['domain' => 'test.example', 'currency' => 'USD'])->assertUnauthorized();
});

it('keeps a configured customer promotion link usable without commission funds', function () {
    ($this->publish)();
    $this->f['advertiser']->update(['available_budget' => 0]);
    $this->get($this->f['assignment']->tracking_link)->assertRedirect();
});

it('persists authenticated Shopify webhooks without personal data and processes a paid order once', function () {
    Queue::fake();
    config(['promotions.shopify.client_secret' => 'webhook-test-secret']);
    $this->store->update(['platform' => 'shopify', 'domain' => 'native.myshopify.com', 'credentials' => ['access_token' => 'test-token']]);
    $g = ($this->grant)();
    $data = ['id' => 42, 'financial_status' => 'paid', 'currency' => 'USD', 'email' => 'never-store@example.test',
        'customer' => ['first_name' => 'Private'], 'discount_codes' => [['code' => $g->code, 'amount' => '7.25']],
        'line_items' => [['price' => '100.00', 'quantity' => 1, 'properties' => ['personal' => 'private']]],
        'shipping_lines' => [['price' => '5.00', 'discounted_price' => '5.00']], 'total_discounts' => '7.25', 'total_tax' => '3.00', 'total_price' => '100.75'];
    $body = json_encode($data);
    $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SHOPIFY_SHOP_DOMAIN' => $this->store->domain,
        'HTTP_X_SHOPIFY_TOPIC' => 'orders/paid', 'HTTP_X_SHOPIFY_WEBHOOK_ID' => 'delivery-42',
        'HTTP_X_SHOPIFY_HMAC_SHA256' => base64_encode(hash_hmac('sha256', $body, 'webhook-test-secret', true))];
    $this->call('POST', '/api/integrations/shopify/webhooks', [], [], [], $headers, $body)->assertOk();
    $this->call('POST', '/api/integrations/shopify/webhooks', [], [], [], $headers, $body)->assertOk();
    $delivery = StoreWebhookDelivery::sole();
    expect(json_encode($delivery->payload))->not->toContain('never-store')->not->toContain('Private')->not->toContain('personal');
    Http::preventStrayRequests();
    Http::fake(['native.myshopify.com/*' => Http::response(['data' => ['order' => ['transactions' => [['kind' => 'SALE', 'status' => 'SUCCESS', 'processedAt' => now()->toISOString()]]]]])]);
    $job = new ProcessStoreWebhook($delivery->id);
    app()->call([$job, 'handle']);
    app()->call([$job, 'handle']);
    expect(PromotionOrder::count())->toBe(1)->and($delivery->fresh()->status)->toBe('processed');
    Http::assertSentCount(1);
});

it('verifies a signed Shopify proxy and derives its discount exclusively from the stored version', function () {
    config(['promotions.shopify.client_secret' => 'proxy-secret']);
    $this->store->update(['platform' => 'shopify', 'domain' => 'proxy.myshopify.com', 'credentials' => ['access_token' => 'test-token']]);
    ($this->publish)(['type' => 'fixed_amount', 'value' => '19.80']);
    $click = conversionClick($this->f);
    Http::fake(['proxy.myshopify.com/*' => Http::sequence()->push(['data' => ['codeDiscountNodeByCode' => null]])
        ->push(['data' => ['discountCodeBasicCreate' => ['codeDiscountNode' => ['id' => 'gid://shopify/DiscountCodeNode/2'], 'userErrors' => []]]])]);
    $query = ['shop' => $this->store->domain, 'timestamp' => (string) now()->timestamp, 'referral_id' => $click->referral_id, 'session' => str_repeat('q', 32), 'value' => '99'];
    ksort($query);
    $signature = hash_hmac('sha256', implode('', array_map(fn ($k, $v) => $k.'='.$v, array_keys($query), $query)), 'proxy-secret');
    $this->getJson('/api/integrations/shopify/proxy?'.http_build_query([...$query, 'signature' => $signature]))->assertOk()->assertJsonPath('configuration.value', '19.80');
});
