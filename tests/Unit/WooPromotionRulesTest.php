<?php

// Exercise the packaged plugin's rule filtering without requiring a WordPress installation.
if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__);
}
if (! function_exists('add_action')) {
    function add_action(...$args) {}
}
if (! function_exists('wc_get_product_cat_ids')) {
    function wc_get_product_cat_ids($id)
    {
        return $id === 11 ? [4, 5] : [9];
    }
}
require_once __DIR__.'/../../integrations/woocommerce/dmhub-promotions/dmhub-promotions.php';

function wooPromotionProduct(int $id, bool $sale = false, int $parent = 0): object
{
    return new class($id, $sale, $parent)
    {
        public function __construct(private int $id, private bool $sale, private int $parent) {}

        public function get_id()
        {
            return $this->id;
        }

        public function get_parent_id()
        {
            return $this->parent;
        }

        public function is_on_sale()
        {
            return $this->sale;
        }
    };
}

it('restricts fixed-cart allocation to selected eligible products including variation parents', function () {
    $config = ['scope' => 'products', 'product_ids' => ['11'], 'excluded_product_ids' => ['13'], 'category_ids' => [], 'exclude_sale_items' => true];
    $coupon = new class($config)
    {
        public function __construct(private array $config) {}

        public function get_meta($key)
        {
            return $key === '_dmhub_grant' ? 'grant' : $this->config;
        }
    };
    $items = array_map(fn ($p) => (object) ['product' => $p], [wooPromotionProduct(11), wooPromotionProduct(12), wooPromotionProduct(13, false, 11), wooPromotionProduct(14, true, 11), wooPromotionProduct(15, false, 11)]);
    $eligible = DMHub_Promotions::discount_items($items, $coupon, null);
    expect(array_map(fn ($i) => $i->product->get_id(), $eligible))->toBe([11, 15]);
});

it('preserves unrelated coupons and filters configured categories', function () {
    $items = [(object) ['product' => wooPromotionProduct(11)], (object) ['product' => wooPromotionProduct(12)]];
    $unrelated = new class
    {
        public function get_meta($key)
        {
            return null;
        }
    };
    expect(DMHub_Promotions::discount_items($items, $unrelated, null))->toBe($items);
    $coupon = new class
    {
        public function get_meta($key)
        {
            return $key === '_dmhub_grant' ? 'grant' : ['scope' => 'categories', 'product_ids' => [], 'excluded_product_ids' => [], 'category_ids' => ['5'], 'exclude_sale_items' => false];
        }
    };
    expect(DMHub_Promotions::discount_items($items, $coupon, null))->toBe([$items[0]]);
});
