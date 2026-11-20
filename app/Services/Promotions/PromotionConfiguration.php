<?php

namespace App\Services\Promotions;

use App\Models\StoreConnection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PromotionConfiguration
{
    public static function validate(array $input, string $currency): array
    {
        $money = ['required', 'regex:/^\d{1,9}(?:\.\d{1,2})?$/D', 'numeric', 'min:0'];
        $data = Validator::make($input, [
            'name' => 'required|string|max:120',
            'type' => 'required|in:percentage,fixed_amount',
            'value' => [...$money, 'gt:0'],
            'currency' => 'required|in:'.$currency,
            'scope' => 'required|in:all,products,categories',
            'product_ids' => 'present|array|max:100',
            'product_ids.*' => 'string|regex:/^[0-9]+$/D|distinct',
            'category_ids' => 'present|array|max:100',
            'category_ids.*' => 'string|regex:/^[0-9]+$/D|distinct',
            'excluded_product_ids' => 'present|array|max:100',
            'excluded_product_ids.*' => 'string|regex:/^[0-9]+$/D|distinct',
            'exclude_sale_items' => 'required|boolean',
            'minimum_subtotal' => $money,
            'minimum_quantity' => 'required|integer|min:0|max:100000',
            'combines_with_other_discounts' => 'required|boolean',
            'starts_at' => ['required', 'date', 'regex:/(?:Z|[+-]\d{2}:\d{2})$/D'],
            'ends_at' => ['nullable', 'date', 'after:starts_at', 'regex:/(?:Z|[+-]\d{2}:\d{2})$/D'],
            'usage_limit' => 'nullable|integer|min:1|max:1000000',
            'background_color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/D'],
            'text_color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/D'],
            'message_nl' => 'nullable|string|max:300',
            'applied_message_nl' => 'nullable|string|max:300',
            'validity_hours' => 'required|integer|min:1|max:8760',
            'display' => 'required|in:bar,popup,none',
            'message' => 'required|string|max:300',
            'applied_message' => 'required|string|max:300',
            'commission_basis' => 'required|in:net_merchandise,net_order',
        ])->validate();
        if ($data['type'] === 'percentage' && (float) $data['value'] > 100) {
            throw ValidationException::withMessages(['value' => 'Percentage must not exceed 100.']);
        }
        foreach (['products' => 'product_ids', 'categories' => 'category_ids'] as $scope => $key) {
            if ($data['scope'] === $scope && ! count($data[$key])) {
                throw ValidationException::withMessages([$key => 'Select at least one item for this scope.']);
            }
        }
        foreach (['message', 'applied_message', 'message_nl', 'applied_message_nl'] as $key) {
            if (empty($data[$key])) {
                continue;
            }
            if ($data[$key] !== strip_tags($data[$key]) || preg_match('/\{(?!benefit\}|offer_name\}|saving\})[^}]*\}/', $data[$key])) {
                throw ValidationException::withMessages([$key => 'Use plain text and {benefit}, {offer_name}, or {saving} placeholders.']);
            }
        }

        return $data;
    }

    public static function assertSupported(array $config, StoreConnection $store): void
    {
        $errors = [];
        if ($store->status !== 'connected') {
            $errors[] = 'Connect the store before publishing.';
        }
        if ($store->currency !== $config['currency']) {
            $errors[] = 'Store and campaign currencies must match.';
        }
        if ($store->platform === 'shopify') {
            if ($config['exclude_sale_items'] || count($config['excluded_product_ids'])) {
                $errors[] = 'Shopify native discount links do not support sale-item or product exclusions. Select eligible products or collections instead.';
            }
            if ((float) $config['minimum_subtotal'] > 0 && $config['minimum_quantity'] > 0) {
                $errors[] = 'Shopify supports a minimum spend or a minimum quantity, not both for this discount type.';
            }
        }
        if ($errors) {
            throw ValidationException::withMessages(['stores' => implode(' ', $errors)]);
        }
    }
}
