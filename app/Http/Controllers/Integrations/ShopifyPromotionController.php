<?php

namespace App\Http\Controllers\Integrations;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessStoreWebhook;
use App\Models\Campaign;
use App\Models\StoreConnection;
use App\Models\StoreWebhookDelivery;
use App\Services\Promotions\PromotionGrantService;
use App\Services\Promotions\PromotionOrderService;
use App\Services\Promotions\ShopifyDiscountService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ShopifyPromotionController extends Controller
{
    public function install(Request $request, StoreConnection $store)
    {
        $campaign = Campaign::visibleTo($request->user())->findOrFail($request->integer('campaign'));
        abort_unless($store->platform === 'shopify' && $campaign->advertiser_id === $store->advertiser_id && $campaign->network_id === $store->network_id, 404);
        if (! config('promotions.shopify.client_id') || ! config('promotions.shopify.client_secret')) {
            return redirect()->route('campaign.promotions.edit', $campaign)
                ->with('error', 'Shopify connection is not available yet. Contact your Brand New Day administrator.');
        }
        $state = Str::random(48);
        $request->session()->put('shopify_install', ['state' => $state, 'store' => $store->id, 'campaign' => $campaign->id, 'time' => now()->timestamp]);

        return redirect()->away('https://'.$store->domain.'/admin/oauth/authorize?'.http_build_query([
            'client_id' => config('promotions.shopify.client_id'), 'scope' => config('promotions.shopify.scopes'),
            'redirect_uri' => route('integrations.shopify.callback'), 'state' => $state,
        ]));
    }

    public function callback(Request $request, ShopifyDiscountService $api)
    {
        $pending = $request->session()->get('shopify_install');
        abort_unless($pending && hash_equals($pending['state'], (string) $request->query('state')) && now()->timestamp - $pending['time'] < 600, 403);
        $store = StoreConnection::findOrFail($pending['store']);
        $campaign = Campaign::visibleTo($request->user())->findOrFail($pending['campaign']);
        abort_unless($campaign->advertiser_id === $store->advertiser_id && $request->query('shop') === $store->domain, 403);
        $query = $request->query();
        $hmac = $query['hmac'] ?? '';
        unset($query['hmac'], $query['signature']);
        ksort($query);
        abort_unless(config('promotions.shopify.client_secret') && hash_equals(hash_hmac('sha256', http_build_query($query, '', '&', PHP_QUERY_RFC3986), config('promotions.shopify.client_secret')), $hmac), 403);
        $request->session()->forget('shopify_install');
        $token = Http::timeout(15)->asForm()->post('https://'.$store->domain.'/admin/oauth/access_token', [
            'client_id' => config('promotions.shopify.client_id'), 'client_secret' => config('promotions.shopify.client_secret'),
            'code' => $request->query('code'), 'expiring' => 1,
        ])->throw()->json();
        abort_unless(! empty($token['access_token']), 502);
        $store->update(['credentials' => [...$token, 'expires_at' => isset($token['expires_in']) ? now()->timestamp + $token['expires_in'] : null]]);
        $shop = $api->graphql($store, '{shop{currencyCode}}');
        abort_unless(($shop['shop']['currencyCode'] ?? null) === $store->currency, 422, 'Store and campaign currencies must match.');
        $store->update(['status' => 'connected', 'last_seen_at' => now()]);

        return redirect()->route('campaign.promotions.edit', $campaign)->with('success', 'Shopify connected. Enable the Brand New Day theme app embed.');
    }

    public function proxy(Request $request, PromotionGrantService $grants, ShopifyDiscountService $discounts)
    {
        abort_unless(config('promotions.shopify.client_secret'), 404);
        $query = $request->query();
        $signature = $query['signature'] ?? '';
        unset($query['signature']);
        $pairs = [];
        foreach ($query as $key => $value) {
            $pairs[] = $key.'='.(is_array($value) ? implode(',', $value) : $value);
        }
        sort($pairs, SORT_STRING);
        abort_unless(hash_equals(hash_hmac('sha256', implode('', $pairs), config('promotions.shopify.client_secret')), $signature)
            && abs(now()->timestamp - (int) ($query['timestamp'] ?? 0)) < 300, 403);
        $store = StoreConnection::where('domain', $query['shop'] ?? '')->where('platform', 'shopify')->where('status', 'connected')->firstOrFail();
        $input = $request->validate(['referral_id' => 'required|uuid', 'session' => 'required|string|min:24|max:200']);
        $grant = $grants->issue($store, $input['referral_id'], $input['session']);
        $discounts->deploy($grant);

        return response()->json($grants->payload($grant))->header('Cache-Control', 'no-store');
    }

    public function webhook(Request $request, ShopifyDiscountService $api, PromotionOrderService $orders)
    {
        $secret = config('promotions.shopify.client_secret');
        abort_unless($secret && hash_equals(base64_encode(hash_hmac('sha256', $request->getContent(), $secret, true)), (string) $request->header('X-Shopify-Hmac-Sha256')), 401);
        $store = StoreConnection::where('domain', $request->header('X-Shopify-Shop-Domain'))->where('platform', 'shopify')->first();
        if (! $store) {
            return response()->json(['received' => true]);
        }
        $topic = $request->header('X-Shopify-Topic');
        if (in_array($topic, ['app/uninstalled', 'shop/redact'])) {
            $store->update(['status' => 'disconnected', 'credentials' => null, 'token_hash' => null]);

            return response()->json(['received' => true]);
        }
        // No customer contact details or Shopify customer identifiers are retained by this integration.
        if (in_array($topic, ['customers/data_request', 'customers/redact'])) {
            return response()->json(['received' => true]);
        }
        abort_unless($store->status === 'connected', 503);
        $data = $request->json()->all();
        abort_unless(in_array($topic, ['orders/paid', 'orders/cancelled', 'refunds/create']), 422);
        // Persist only the fields needed for attribution/accounting, never contact or line-item properties.
        $safe = Arr::only($data, ['id', 'order_id', 'financial_status', 'currency', 'taxes_included', 'total_discounts', 'total_discounts_set', 'total_tax', 'total_tax_set', 'total_price', 'total_price_set']);
        $safe['discount_codes'] = array_map(fn ($d) => Arr::only($d, ['code', 'amount']), $data['discount_codes'] ?? []);
        $safe['line_items'] = array_map(fn ($d) => Arr::only($d, ['price', 'price_set', 'quantity']), $data['line_items'] ?? []);
        $safe['shipping_lines'] = array_map(function ($d) {
            $line = Arr::only($d, ['price', 'discounted_price', 'discounted_price_set']);
            $line['tax_lines'] = array_map(fn ($t) => Arr::only($t, ['price', 'price_set']), $d['tax_lines'] ?? []);

            return $line;
        }, $data['shipping_lines'] ?? []);
        $safe['transactions'] = array_map(fn ($d) => Arr::only($d, ['kind', 'status', 'amount']), $data['transactions'] ?? []);
        $hash = hash('sha256', json_encode($safe, JSON_THROW_ON_ERROR));
        $deliveryId = $request->header('X-Shopify-Webhook-Id') ?: $topic.':'.$hash;
        abort_if(strlen($deliveryId) > 100, 422);
        $delivery = StoreWebhookDelivery::firstOrCreate(['store_connection_id' => $store->id, 'delivery_id' => $deliveryId],
            ['topic' => $topic, 'payload_hash' => $hash, 'payload' => $safe]);
        abort_unless(hash_equals($delivery->payload_hash, $hash) && $delivery->topic === $topic, 409);
        if ($delivery->status === 'pending') {
            try {
                ProcessStoreWebhook::dispatch($delivery->id);
            } catch (\Throwable $e) {
                report($e);
            } // Durable inbox is recovered by the scheduler.
        }

        return response()->json(['received' => true]);
    }
}
