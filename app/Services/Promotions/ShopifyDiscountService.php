<?php

namespace App\Services\Promotions;

use App\Models\PromotionGrant;
use App\Models\StoreConnection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ShopifyDiscountService
{
    public function graphql(StoreConnection $store, string $query, array $variables = []): array
    {
        abort_unless(preg_match('/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/D', $store->domain), 422);
        $credentials = $store->credentials ?? [];
        if (! empty($credentials['expires_at']) && now()->addMinute()->timestamp >= $credentials['expires_at']) {
            return Cache::lock('shopify-refresh:'.$store->id, 30)->block(10, function () use ($store, $query, $variables) {
                $store->refresh();
                $c = $store->credentials;
                if (now()->addMinute()->timestamp >= $c['expires_at']) {
                    $token = Http::timeout(15)->asForm()->post('https://'.$store->domain.'/admin/oauth/access_token', [
                        'client_id' => config('promotions.shopify.client_id'), 'client_secret' => config('promotions.shopify.client_secret'),
                        'grant_type' => 'refresh_token', 'refresh_token' => $c['refresh_token'] ?? '',
                    ])->throw()->json();
                    $store->update(['credentials' => [...$c, ...$token, 'expires_at' => now()->timestamp + $token['expires_in']]]);
                }

                return $this->send($store, $query, $variables);
            });
        }

        return $this->send($store, $query, $variables);
    }

    private function send(StoreConnection $store, string $query, array $variables): array
    {
        $result = Http::timeout(15)->withHeaders(['X-Shopify-Access-Token' => $store->credentials['access_token']])
            ->post('https://'.$store->domain.'/admin/api/'.config('promotions.shopify.api_version').'/graphql.json', ['query' => $query, 'variables' => $variables ?: new \stdClass])->throw()->json();
        abort_if(! empty($result['errors']), 502, 'Shopify could not complete the request.');

        return $result['data'] ?? [];
    }

    public function deploy(PromotionGrant $grant): void
    {
        Cache::lock('promotion-deploy:'.$grant->id, 60)->block(10, function () use ($grant) {
            $grant->refresh();
            if ($grant->platform_discount_id) {
                return;
            }
            $store = $grant->store;
            $c = $grant->version->configuration;
            PromotionConfiguration::assertSupported($c, $store);
            // Recover an ambiguous API timeout by looking up our stable, random code before retrying creation.
            $lookup = $this->graphql($store, 'query($code:String!){codeDiscountNodeByCode(code:$code){id}}', ['code' => $grant->code]);
            if (! empty($lookup['codeDiscountNodeByCode']['id'])) {
                $grant->update(['platform_discount_id' => $lookup['codeDiscountNodeByCode']['id']]);

                return;
            }
            $items = match ($c['scope']) {
                'products' => ['products' => ['productsToAdd' => array_map(fn ($id) => 'gid://shopify/Product/'.$id, $c['product_ids'])]],
                'categories' => ['collections' => ['add' => array_map(fn ($id) => 'gid://shopify/Collection/'.$id, $c['category_ids'])]],
                default => ['all' => true],
            };
            $input = ['title' => $c['name'], 'code' => $grant->code, 'startsAt' => $grant->created_at->toISOString(),
                'endsAt' => $grant->expires_at->toISOString(), 'customerSelection' => ['all' => true],
                'usageLimit' => $c['usage_limit'] ?? null, 'appliesOncePerCustomer' => false,
                'combinesWith' => ['orderDiscounts' => (bool) $c['combines_with_other_discounts'],
                    'productDiscounts' => (bool) $c['combines_with_other_discounts'], 'shippingDiscounts' => (bool) $c['combines_with_other_discounts']],
                'customerGets' => ['items' => $items, 'value' => $c['type'] === 'percentage'
                    ? ['percentage' => (float) $c['value'] / 100]
                    : ['discountAmount' => ['amount' => (string) $c['value'], 'appliesOnEachItem' => false]]],
            ];
            if ((float) $c['minimum_subtotal'] > 0) {
                $input['minimumRequirement'] = ['subtotal' => ['greaterThanOrEqualToSubtotal' => (string) $c['minimum_subtotal']]];
            } elseif ($c['minimum_quantity'] > 0) {
                $input['minimumRequirement'] = ['quantity' => ['greaterThanOrEqualToQuantity' => (string) $c['minimum_quantity']]];
            }
            $data = $this->graphql($store, 'mutation($input:DiscountCodeBasicInput!){discountCodeBasicCreate(basicCodeDiscount:$input){codeDiscountNode{id} userErrors{field message}}}', ['input' => $input]);
            abort_if(! empty($data['discountCodeBasicCreate']['userErrors']) || empty($data['discountCodeBasicCreate']['codeDiscountNode']['id']), 422, 'Shopify rejected the discount configuration. Check product IDs and combination rules.');
            $grant->update(['platform_discount_id' => $data['discountCodeBasicCreate']['codeDiscountNode']['id']]);
        });
    }
}
