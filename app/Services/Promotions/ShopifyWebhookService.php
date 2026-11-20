<?php

namespace App\Services\Promotions;

use App\Models\PromotionGrant;
use App\Models\PromotionOrder;
use App\Models\StoreConnection;
use App\Support\ConversionMoney;

class ShopifyWebhookService
{
    public function process(StoreConnection $store, string $topic, array $data, ShopifyDiscountService $api, PromotionOrderService $orders)
    {
        if ($topic === 'refunds/create') {
            $amount = 0;
            foreach ($data['transactions'] ?? [] as $tx) {
                if (($tx['kind'] ?? '') === 'refund' && ($tx['status'] ?? '') === 'success') {
                    $amount += ConversionMoney::cents($tx['amount']);
                }
            }
            $orders->adjustment($store, ['external_id' => 'refund:'.$data['id'], 'order_external_id' => (string) $data['order_id'], 'type' => 'refund', 'amount' => ConversionMoney::decimal($amount), 'currency' => $store->currency]);

            return response()->json(['received' => true]);
        }
        if ($topic === 'orders/cancelled') {
            $orders->adjustment($store, ['external_id' => 'cancel:'.$data['id'], 'order_external_id' => (string) $data['id'], 'type' => 'cancellation', 'amount' => '0.00', 'currency' => $store->currency]);

            return response()->json(['received' => true]);
        }
        abort_unless($topic === 'orders/paid', 422);
        if (($data['financial_status'] ?? '') !== 'paid') {
            return response()->json(['received' => true]);
        }
        $grant = null;
        $promotionDiscount = 0;
        foreach ($data['discount_codes'] ?? [] as $discount) {
            $candidate = PromotionGrant::where('store_connection_id', $store->id)->where('code', $discount['code'])->first();
            if ($candidate) {
                $grant = $candidate;
                $promotionDiscount = ConversionMoney::cents($discount['amount']);
                break;
            }
        }
        if (! $grant) {
            return response()->json(['received' => true]);
        }
        // Successful payment transaction time, never order creation time or webhook delivery time.
        $existing = PromotionOrder::where('store_connection_id', $store->id)->where('external_id', (string) $data['id'])->first();
        if ($existing) {
            $orders->confirm($existing);

            return response()->json(['received' => true]);
        }
        $result = $api->graphql($store, 'query($id:ID!){order(id:$id){transactions{kind status processedAt}}}', ['id' => 'gid://shopify/Order/'.$data['id']]);
        $paidAt = collect($result['order']['transactions'] ?? [])->filter(fn ($tx) => in_array($tx['kind'], ['SALE', 'CAPTURE']) && $tx['status'] === 'SUCCESS')->pluck('processedAt')->sort()->last();
        abort_unless($paidAt, 503, 'Paid transaction is not yet available.');
        $money = fn ($field) => (string) ($data[$field.'_set']['shop_money']['amount'] ?? $data[$field] ?? '0.00');
        $subtotal = 0;
        foreach ($data['line_items'] ?? [] as $line) {
            $subtotal += ConversionMoney::cents($line['price_set']['shop_money']['amount'] ?? $line['price']) * $line['quantity'];
        }
        $shipping = 0;
        $shippingTax = 0;
        foreach ($data['shipping_lines'] ?? [] as $line) {
            foreach ($line['tax_lines'] ?? [] as $taxLine) {
                $shippingTax += ConversionMoney::cents($taxLine['price_set']['shop_money']['amount'] ?? $taxLine['price']);
            }
        }
        foreach ($data['shipping_lines'] ?? [] as $line) {
            $shipping += ConversionMoney::cents($line['discounted_price_set']['shop_money']['amount'] ?? $line['discounted_price'] ?? $line['price']);
        }
        $order = $orders->record($store, ['external_id' => (string) $data['id'], 'grant_id' => $grant->id, 'paid_at' => $paidAt,
            'currency' => $data['currency'], 'subtotal' => ConversionMoney::decimal($subtotal), 'discount' => $money('total_discounts'),
            'promotion_discount' => ConversionMoney::decimal($promotionDiscount), 'shipping' => ConversionMoney::decimal($shipping),
            'tax' => $money('total_tax'), 'total' => $money('total_price'), 'taxes_included' => (bool) ($data['taxes_included'] ?? false), 'shipping_tax' => ConversionMoney::decimal($shippingTax)]);
        $orders->confirm($order);

        return response()->json(['received' => true]);
    }
}
