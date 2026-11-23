<?php

namespace App\Services\Promotions;

use App\Models\PostbackCredential;
use App\Models\PromotionAdjustment;
use App\Models\PromotionGrant;
use App\Models\PromotionOrder;
use App\Models\StoreConnection;
use App\Services\ConversionEventService;
use App\Support\ConversionMoney;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PromotionOrderService
{
    public function record(StoreConnection $store, array $input): PromotionOrder
    {
        $money = ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'];
        $data = Validator::make($input, [
            'external_id' => 'required|string|max:80|regex:/^[A-Za-z0-9_.:-]+$/D',
            'grant_id' => 'required|uuid', 'paid_at' => ['required', 'date', 'before_or_equal:now', 'regex:/(?:Z|[+-]\d{2}:\d{2})$/D'],
            'currency' => 'required|in:'.$store->currency,
            'subtotal' => $money, 'discount' => $money, 'promotion_discount' => $money,
            'shipping' => $money, 'tax' => $money, 'total' => $money,
            'taxes_included' => 'sometimes|boolean', 'shipping_tax' => ['sometimes', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'],
        ])->validate();
        foreach (['subtotal', 'discount', 'promotion_discount', 'shipping', 'tax', 'total'] as $field) {
            $data[$field] = ConversionMoney::decimal(ConversionMoney::cents($data[$field]));
        }
        $data['taxes_included'] = (bool) ($data['taxes_included'] ?? false);
        $data['shipping_tax'] = ConversionMoney::decimal(ConversionMoney::cents($data['shipping_tax'] ?? '0'));
        $data['paid_at'] = CarbonImmutable::parse($data['paid_at'])->toISOString();
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($store, $data, $hash) {
            StoreConnection::whereKey($store->id)->lockForUpdate()->firstOrFail();
            $existing = PromotionOrder::where('store_connection_id', $store->id)->where('external_id', $data['external_id'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->payload_hash, $hash), 409, 'Order identity already has different data.');

                return $existing;
            }
            $grant = PromotionGrant::whereKey($data['grant_id'])->where('store_connection_id', $store->id)->lockForUpdate()->firstOrFail();
            abort_if($grant->redeemed_at, 409, 'Grant has already been redeemed.');
            $paid = CarbonImmutable::parse($data['paid_at']);
            // A late webhook is accepted durably; commission eligibility is a separate decision.
            abort_if($paid->lt($grant->created_at), 422, 'Payment predates the grant.');
            $net = ConversionMoney::cents($data['subtotal']) - ConversionMoney::cents($data['discount']);
            $expected = $net + ConversionMoney::cents($data['shipping']) + ($data['taxes_included'] ? 0 : ConversionMoney::cents($data['tax']));
            $merchandiseTax = $data['taxes_included'] ? ConversionMoney::cents($data['tax']) - ConversionMoney::cents($data['shipping_tax']) : 0;
            $consistent = $net >= $merchandiseTax && $merchandiseTax >= 0 && $expected === ConversionMoney::cents($data['total'])
                && ConversionMoney::cents($data['promotion_discount']) > 0
                && ConversionMoney::cents($data['promotion_discount']) <= ConversionMoney::cents($data['discount']);
            $review = ! $consistent || $paid->gt($grant->expires_at);
            $order = PromotionOrder::create(['store_connection_id' => $store->id, 'promotion_grant_id' => $grant->id,
                'external_id' => $data['external_id'], 'payload_hash' => $hash, 'payload' => $data,
                'status' => $review ? 'needs_review' : 'pending', 'review_reason' => $review ? 'Order totals or payment time need review.' : null]);
            $limit = $grant->version->configuration['usage_limit'] ?? null;
            if ($limit && PromotionOrder::where('promotion_grant_id', $grant->id)->count() >= $limit) {
                $grant->update(['redeemed_at' => $paid]);
            }

            return $order;
        });
    }

    public function confirm(PromotionOrder $order): void
    {
        if ($order->status !== 'pending') {
            return;
        }
        $data = $order->payload;
        $c = $order->grant->version->configuration;
        $basis = $c['commission_basis'] === 'net_order' ? $data['total']
            : ConversionMoney::decimal(ConversionMoney::cents($data['subtotal']) - ConversionMoney::cents($data['discount']) - ($data['taxes_included'] ? ConversionMoney::cents($data['tax']) - ConversionMoney::cents($data['shipping_tax']) : 0));
        if (ConversionMoney::cents($basis) === 0) {
            $order->update(['status' => 'no_commission', 'review_reason' => 'No amount eligible for compensation.']);

            return;
        }
        try {
            $credential = PostbackCredential::firstOrCreate(['advertiser_id' => $order->store->advertiser_id, 'name' => 'promotion-store:'.$order->store_connection_id],
                ['token_hash' => hash('sha256', Str::random(64)), 'expires_at' => now()->addYear()]);
            if ($credential->expires_at->isPast() || $credential->revoked_at) {
                $order->update(['status' => 'needs_review', 'review_reason' => 'Store reporting credential requires renewal.']);

                return;
            }
            $request = Request::create('/internal/promotions/orders', 'POST');
            $request->attributes->set('postback_advertiser_id', $order->store->advertiser_id);
            $request->attributes->set('postback_credential_id', $credential->id);
            $result = app(ConversionEventService::class)->confirm([
                'event_type' => 'purchase', 'external_id' => 'promotion-order:'.$order->id,
                'referral_id' => $order->grant->click->referral_id, 'occurred_at' => $data['paid_at'], 'amount' => $basis, 'currency' => $data['currency'],
            ], $request);
            $order->update(['status' => 'confirmed', 'conversion_event_id' => $result['event']->id, 'review_reason' => null]);
        } catch (ValidationException|HttpExceptionInterface $e) {
            $order->update(['status' => 'needs_review', 'review_reason' => 'Compensation eligibility or funding requires review.']);
        }
    }

    public function adjustment(StoreConnection $store, array $input): PromotionAdjustment
    {
        $data = Validator::make($input, ['external_id' => 'required|string|max:100', 'order_external_id' => 'required|string|max:80',
            'type' => 'required|in:refund,cancellation', 'amount' => ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D'],
            'currency' => 'required|in:'.$store->currency])->validate();
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($store, $data, $hash) {
            StoreConnection::whereKey($store->id)->lockForUpdate()->firstOrFail();
            $record = PromotionAdjustment::firstOrCreate(['store_connection_id' => $store->id, 'external_id' => $data['external_id']],
                ['order_external_id' => $data['order_external_id'], 'payload' => $data, 'payload_hash' => $hash]);
            abort_unless(hash_equals($record->payload_hash, $hash), 409, 'Adjustment identity already has different data.');

            return $record;
        });
    }
}
